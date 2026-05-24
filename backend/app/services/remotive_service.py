import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.job import Job

TECH_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node", "java", "go",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
    "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
    "kafka", "elasticsearch", "graphql", "rest", "microservices",
]

REMOTIVE_CATEGORIES = [
    "software-dev",
    "data",
    "devops-sysadmin",
    "product",
    "design",
    "qa",
    "marketing",
    "finance-legal",
    "customer-support",
    "hr",
    "writing",
    "business-mgmt",
]


def _map_remotive_to_job(item: dict) -> dict:
    title = item.get("title", "")
    company = item.get("company_name", "Unknown")
    url = item.get("url", "")
    description = item.get("description", "")
    tags = [t.lower() for t in (item.get("tags") or [])]
    job_type_raw = item.get("job_type", "full_time")
    location = item.get("candidate_required_location") or "Remote"
    salary = item.get("salary") or ""

    job_type = "full_time"
    if "part" in job_type_raw:
        job_type = "part_time"
    elif "contract" in job_type_raw:
        job_type = "contract"
    elif "intern" in job_type_raw:
        job_type = "internship"

    desc_lower = description.lower()
    skills = list({kw for kw in TECH_KEYWORDS if kw in desc_lower or kw in tags})[:20]

    title_lower = title.lower()
    experience_level = "mid"
    if any(w in title_lower for w in ["senior", "lead", "principal", "staff", "head", "architect"]):
        experience_level = "senior"
    elif any(w in title_lower for w in ["junior", "entry", "intern", "graduate", "fresher", "trainee"]):
        experience_level = "entry"

    return {
        "title": title[:255],
        "company": company[:255],
        "location": location[:255],
        "description": description,
        "requirements": [],
        "skills_required": skills,
        "salary_min": None,
        "salary_max": None,
        "currency": "USD",
        "job_type": job_type,
        "experience_level": experience_level,
        "remote_type": "remote",
        "source": "remotive",
        "external_url": url[:500] if url else None,
        "is_active": True,
    }


class RemotiveService:
    BASE_URL = "https://remotive.com/api/remote-jobs"

    async def fetch_jobs(self, category: str, limit: int = 50) -> list[dict]:
        params = {"category": category, "limit": limit}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(self.BASE_URL, params=params)
                resp.raise_for_status()
                return resp.json().get("jobs", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession, limit_per_category: int = 100) -> int:
        count = 0
        seen_urls: set[str] = set()

        for category in REMOTIVE_CATEGORIES:
            jobs = await self.fetch_jobs(category, limit_per_category)
            for item in jobs:
                url = item.get("url", "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)

                existing = await db.execute(select(Job).where(Job.external_url == url))
                if existing.scalars().first():
                    continue

                db.add(Job(**_map_remotive_to_job(item)))
                count += 1

        if count > 0:
            await db.commit()

        return count
