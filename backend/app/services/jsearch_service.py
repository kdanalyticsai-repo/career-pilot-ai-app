"""jsearch via RapidAPI — searches Indeed, LinkedIn, Glassdoor, ZipRecruiter."""
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.job import Job

JSEARCH_URL = "https://jsearch.p.rapidapi.com/search-v2"

JSEARCH_QUERIES = [
    "software engineer India",
    "python developer India",
    "react developer India",
    "java developer India",
    "data scientist India",
    "full stack developer India",
    "devops engineer India",
    "android developer India",
    "ios developer India",
    "product manager India",
    "machine learning engineer India",
    "backend developer India",
    "frontend developer India",
    "cloud engineer India",
    "data engineer India",
]

TECH_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node", "java", "go",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
    "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
    "kafka", "elasticsearch", "graphql", "rest", "microservices", "kotlin",
    "swift", "flutter", "android", "ios", "react native", "angular", "vue",
]


def _map_jsearch_to_job(item: dict) -> dict:
    title = item.get("job_title", "")
    company = item.get("employer_name", "Unknown Company") or "Unknown Company"
    city = item.get("job_city", "")
    state = item.get("job_state", "")
    country = item.get("job_country", "")
    location = ", ".join(filter(None, [city, state, country])) or "India"
    description = item.get("job_description", "")
    apply_link = item.get("job_apply_link", "") or item.get("job_id", "")
    employment_type = (item.get("job_employment_type") or "").upper()
    is_remote = item.get("job_is_remote", False)

    job_type = "full_time"
    if "PART" in employment_type:
        job_type = "part_time"
    elif "CONTRACT" in employment_type or "CONTRACTOR" in employment_type:
        job_type = "contract"
    elif "INTERN" in employment_type:
        job_type = "internship"

    title_lower = title.lower()
    experience_level = "mid"
    if any(w in title_lower for w in ["senior", "lead", "principal", "staff", "head", "architect", "director", "vp"]):
        experience_level = "senior"
    elif any(w in title_lower for w in ["junior", "entry", "intern", "graduate", "fresher", "trainee", "associate"]):
        experience_level = "entry"

    # Also use required experience months if available
    exp_months = (item.get("job_required_experience") or {}).get("required_experience_in_months")
    if exp_months is not None:
        if exp_months >= 60:
            experience_level = "senior"
        elif exp_months <= 12:
            experience_level = "entry"

    remote_type = "remote" if is_remote else "onsite"

    # Skills from job_required_skills or parsed from description
    required_skills = [s.lower() for s in (item.get("job_required_skills") or [])]
    desc_lower = description.lower()
    skills = list({kw for kw in TECH_KEYWORDS if kw in desc_lower or kw in required_skills})[:20]

    salary_min = item.get("job_min_salary")
    salary_max = item.get("job_max_salary")
    currency = item.get("job_salary_currency") or "INR"
    period = (item.get("job_salary_period") or "").upper()
    # Convert monthly salary to annual
    if period == "MONTH":
        salary_min = int(salary_min * 12) if salary_min else None
        salary_max = int(salary_max * 12) if salary_max else None
    elif salary_min:
        salary_min = int(salary_min)
        salary_max = int(salary_max) if salary_max else None

    return {
        "title": title[:255],
        "company": company[:255],
        "location": location[:255],
        "description": description,
        "requirements": [],
        "skills_required": skills,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "currency": currency[:10],
        "job_type": job_type,
        "experience_level": experience_level,
        "remote_type": remote_type,
        "source": "jsearch",
        "external_url": apply_link[:500] if apply_link else None,
        "is_active": True,
    }


class JSearchService:
    def __init__(self):
        self.headers = {
            "X-RapidAPI-Key": settings.RAPIDAPI_KEY,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        }

    async def search_jobs(self, query: str, page: int = 1) -> list[dict]:
        if not settings.RAPIDAPI_KEY:
            return []
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(JSEARCH_URL, headers=self.headers, params={
                    "query": query,
                    "page": page,
                    "num_pages": 1,
                    "date_posted": "month",
                })
                resp.raise_for_status()
                return resp.json().get("data", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession) -> int:
        if not settings.RAPIDAPI_KEY:
            return 0

        count = 0
        seen: set[str] = set()

        for query in JSEARCH_QUERIES:
            # 2 pages per query = 20 results, uses 2 API calls
            for page in range(1, 3):
                results = await self.search_jobs(query, page)
                if not results:
                    break
                for item in results:
                    url = item.get("job_apply_link", "") or item.get("job_id", "")
                    if not url or url in seen:
                        continue
                    seen.add(url)

                    existing = await db.execute(select(Job).where(Job.external_url == url))
                    if existing.scalar_one_or_none():
                        continue

                    db.add(Job(**_map_jsearch_to_job(item)))
                    count += 1

        if count > 0:
            await db.commit()
        return count
