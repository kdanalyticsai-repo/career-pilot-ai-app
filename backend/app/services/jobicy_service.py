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

JOBICY_TAGS = [
    "python", "javascript", "react", "node", "java",
    "devops", "data-science", "machine-learning", "backend", "frontend",
]


def _map_jobicy_to_job(item: dict) -> dict:
    title = item.get("jobTitle", "")
    company = item.get("companyName", "Unknown")
    url = item.get("url", "")
    description = item.get("jobDescription", item.get("jobExcerpt", ""))
    geo = item.get("jobGeo") or "Remote"
    job_type_raw = (item.get("jobType") or ["full_time"])[0] if item.get("jobType") else "full_time"
    seniority = (item.get("seniority") or "").lower()

    job_type = "full_time"
    if "part" in job_type_raw:
        job_type = "part_time"
    elif "contract" in job_type_raw:
        job_type = "contract"
    elif "intern" in job_type_raw:
        job_type = "internship"

    desc_lower = description.lower()
    skills = [kw for kw in TECH_KEYWORDS if kw in desc_lower][:20]

    experience_level = "mid"
    title_lower = title.lower()
    if seniority in ("senior", "lead") or any(w in title_lower for w in ["senior", "lead", "principal", "staff", "head"]):
        experience_level = "senior"
    elif seniority in ("entry", "junior") or any(w in title_lower for w in ["junior", "entry", "intern", "graduate"]):
        experience_level = "entry"

    return {
        "title": title[:255],
        "company": company[:255],
        "location": geo[:255],
        "description": description,
        "requirements": [],
        "skills_required": skills,
        "salary_min": None,
        "salary_max": None,
        "currency": "USD",
        "job_type": job_type,
        "experience_level": experience_level,
        "remote_type": "remote",
        "source": "jobicy",
        "external_url": url[:500] if url else None,
        "is_active": True,
    }


class JobicyService:
    BASE_URL = "https://jobicy.com/api/v2/remote-jobs"

    async def fetch_jobs(self, tag: str = "", count: int = 50) -> list[dict]:
        params: dict = {"count": count}
        if tag:
            params["tag"] = tag
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(self.BASE_URL, params=params)
                resp.raise_for_status()
                return resp.json().get("jobs", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession, count_per_tag: int = 50) -> int:
        count = 0
        seen_urls: set[str] = set()

        for tag in JOBICY_TAGS:
            jobs = await self.fetch_jobs(tag=tag, count=count_per_tag)
            for item in jobs:
                url = item.get("url", "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)

                existing = await db.execute(select(Job).where(Job.external_url == url))
                if existing.scalars().first():
                    continue

                db.add(Job(**_map_jobicy_to_job(item)))
                count += 1

        if count > 0:
            await db.commit()

        return count
