import uuid
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.job import Job


TECH_QUERIES = [
    "software engineer", "python developer", "react developer",
    "data engineer", "backend developer", "frontend developer",
    "full stack developer", "devops engineer", "machine learning engineer",
    "android developer", "ios developer", "mobile developer",
    "product manager", "project manager", "business analyst",
    "ui ux designer", "data scientist", "cloud engineer",
    "cybersecurity engineer", "qa engineer",
]


def _map_adzuna_to_job(item: dict) -> dict:
    category = item.get("category", {}).get("label", "")
    contract_type = item.get("contract_type", "")
    contract_time = item.get("contract_time", "full_time")

    job_type = "full_time"
    if contract_type == "part_time" or contract_time == "part_time":
        job_type = "part_time"
    elif contract_type == "contract":
        job_type = "contract"

    salary_min = item.get("salary_min")
    salary_max = item.get("salary_max")
    # Adzuna India returns annual salaries in INR
    if salary_min:
        salary_min = int(salary_min)
    if salary_max:
        salary_max = int(salary_max)

    location = item.get("location", {}).get("display_name", "")
    description = item.get("description", "")

    # Extract skills from description (simple heuristic)
    tech_keywords = [
        "python", "javascript", "typescript", "react", "node", "java", "go",
        "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
        "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
        "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
        "kafka", "elasticsearch", "graphql", "rest", "microservices",
    ]
    desc_lower = description.lower()
    skills = [kw for kw in tech_keywords if kw in desc_lower]

    title = item.get("title", "")
    company_name = item.get("company", {}).get("display_name", "Unknown Company")
    redirect_url = item.get("redirect_url", "")

    # Determine experience level from title
    title_lower = title.lower()
    experience_level = "mid"
    if any(w in title_lower for w in ["senior", "lead", "principal", "staff", "head", "architect"]):
        experience_level = "senior"
    elif any(w in title_lower for w in ["junior", "entry", "intern", "graduate", "fresher", "trainee"]):
        experience_level = "entry"

    return {
        "title": title[:255],
        "company": company_name[:255],
        "location": location[:255],
        "description": description,
        "requirements": [],
        "skills_required": skills[:20],
        "salary_min": salary_min,
        "salary_max": salary_max,
        "currency": "INR",
        "job_type": job_type,
        "experience_level": experience_level,
        "remote_type": "onsite",
        "source": "adzuna",
        "external_url": redirect_url[:500] if redirect_url else None,
        "is_active": True,
    }


class AdzunaService:
    BASE_URL = "https://api.adzuna.com/v1/api/jobs"

    def __init__(self):
        self.app_id = settings.ADZUNA_APP_ID
        self.api_key = settings.ADZUNA_API_KEY
        self.country = settings.ADZUNA_COUNTRY

    async def search_jobs(self, query: str, page: int = 1, results_per_page: int = 20) -> list[dict]:
        if not settings.has_adzuna_key:
            return []

        url = f"{self.BASE_URL}/{self.country}/search/{page}"
        params = {
            "app_id": self.app_id,
            "app_key": self.api_key,
            "what": query,
            "results_per_page": results_per_page,
            "content-type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                return data.get("results", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession, max_per_query: int = 50) -> int:
        if not settings.has_adzuna_key:
            return 0

        count = 0
        seen_urls: set[str] = set()

        for query in TECH_QUERIES:
            results = await self.search_jobs(query, results_per_page=max_per_query)

            for item in results:
                redirect_url = item.get("redirect_url", "")

                # Skip duplicates within this sync
                if redirect_url in seen_urls:
                    continue
                seen_urls.add(redirect_url)

                # Skip if already in DB by external_url
                if redirect_url:
                    existing = await db.execute(
                        select(Job).where(Job.external_url == redirect_url)
                    )
                    if existing.scalar_one_or_none():
                        continue

                job_data = _map_adzuna_to_job(item)
                db.add(Job(**job_data))
                count += 1

        if count > 0:
            await db.commit()

        return count
