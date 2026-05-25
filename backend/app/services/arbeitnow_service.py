"""Arbeitnow API — free, no key, remote/EU tech jobs."""
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.job import Job

ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api"

TECH_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node", "java", "go",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
    "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
    "kafka", "elasticsearch", "graphql", "rest", "microservices", "kotlin",
    "swift", "flutter", "android", "ios", "react native", "angular", "vue",
]


def _map_arbeitnow_to_job(item: dict) -> dict:
    title = item.get("title", "")
    company = item.get("company_name", "Unknown Company") or "Unknown Company"
    location = item.get("location", "Remote") or "Remote"
    description = item.get("description", "")
    url = item.get("url", "")
    tags = [t.lower() for t in (item.get("tags") or [])]
    job_types = [jt.lower() for jt in (item.get("job_types") or [])]
    remote = item.get("remote", False)

    job_type = "full_time"
    if any("part" in jt for jt in job_types):
        job_type = "part_time"
    elif any("contract" in jt for jt in job_types):
        job_type = "contract"
    elif any("intern" in jt for jt in job_types):
        job_type = "internship"

    title_lower = title.lower()
    experience_level = "mid"
    if any(w in title_lower for w in ["senior", "lead", "principal", "staff", "head", "architect", "director"]):
        experience_level = "senior"
    elif any(w in title_lower for w in ["junior", "entry", "intern", "graduate", "trainee"]):
        experience_level = "entry"

    remote_type = "remote" if remote else "onsite"
    if not remote and "hybrid" in location.lower():
        remote_type = "hybrid"

    desc_lower = description.lower()
    skills = list({kw for kw in TECH_KEYWORDS if kw in desc_lower or kw in tags})[:20]

    return {
        "title": title[:255],
        "company": company[:255],
        "location": location[:255],
        "description": description,
        "requirements": [],
        "skills_required": skills,
        "salary_min": None,
        "salary_max": None,
        "currency": "EUR",
        "job_type": job_type,
        "experience_level": experience_level,
        "remote_type": remote_type,
        "source": "arbeitnow",
        "external_url": url[:500] if url else None,
        "is_active": True,
    }


class ArbeitnowService:
    async def fetch_jobs(self, page: int = 1) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(ARBEITNOW_URL, params={"page": page})
                resp.raise_for_status()
                return resp.json().get("data", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession) -> int:
        count = 0
        seen: set[str] = set()

        # Fetch 5 pages (up to ~500 jobs)
        for page in range(1, 6):
            results = await self.fetch_jobs(page)
            if not results:
                break
            for item in results:
                url = item.get("url", "")
                if not url or url in seen:
                    continue
                seen.add(url)

                existing = await db.execute(select(Job).where(Job.external_url == url))
                if existing.scalar_one_or_none():
                    continue

                db.add(Job(**_map_arbeitnow_to_job(item)))
                count += 1

        if count > 0:
            await db.commit()
        return count
