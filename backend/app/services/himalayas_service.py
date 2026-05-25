"""Himalayas.app API — free, no key, remote-first tech jobs."""
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.job import Job

HIMALAYAS_URL = "https://himalayas.app/jobs/api"

TECH_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node", "java", "go",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
    "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
    "kafka", "elasticsearch", "graphql", "rest", "microservices", "kotlin",
    "swift", "flutter", "android", "ios", "react native", "angular", "vue",
]


def _map_himalayas_to_job(item: dict) -> dict:
    title = item.get("title", "")
    company = (item.get("company") or {}).get("name", "Unknown Company") or "Unknown Company"
    location = item.get("location", "Remote") or "Remote"
    description = item.get("description", "") or ""
    url = item.get("applicationLink", "") or item.get("url", "")
    salary_min = item.get("salaryMin")
    salary_max = item.get("salaryMax")
    currency = item.get("salaryCurrency", "USD") or "USD"
    job_type_raw = (item.get("jobType") or "").lower()

    job_type = "full_time"
    if "part" in job_type_raw:
        job_type = "part_time"
    elif "contract" in job_type_raw:
        job_type = "contract"
    elif "intern" in job_type_raw:
        job_type = "internship"

    title_lower = title.lower()
    experience_level = "mid"
    if any(w in title_lower for w in ["senior", "lead", "principal", "staff", "head", "architect", "director"]):
        experience_level = "senior"
    elif any(w in title_lower for w in ["junior", "entry", "intern", "graduate", "trainee"]):
        experience_level = "entry"

    desc_lower = description.lower()
    skills_raw = [s.lower() for s in (item.get("skills") or [])]
    skills = list({kw for kw in TECH_KEYWORDS if kw in desc_lower or kw in skills_raw})[:20]

    return {
        "title": title[:255],
        "company": company[:255],
        "location": location[:255],
        "description": description,
        "requirements": [],
        "skills_required": skills,
        "salary_min": int(salary_min) if salary_min else None,
        "salary_max": int(salary_max) if salary_max else None,
        "currency": currency[:10],
        "job_type": job_type,
        "experience_level": experience_level,
        "remote_type": "remote",
        "source": "himalayas",
        "external_url": url[:500] if url else None,
        "is_active": True,
    }


class HimalayasService:
    async def fetch_jobs(self, limit: int = 100, offset: int = 0) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(HIMALAYAS_URL, params={"limit": limit, "offset": offset})
                resp.raise_for_status()
                data = resp.json()
                return data.get("jobs", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession) -> int:
        count = 0
        seen: set[str] = set()

        # Fetch up to 500 jobs in batches of 100
        for offset in range(0, 500, 100):
            results = await self.fetch_jobs(limit=100, offset=offset)
            if not results:
                break
            for item in results:
                url = item.get("applicationLink", "") or item.get("url", "")
                if not url or url in seen:
                    continue
                seen.add(url)

                existing = await db.execute(select(Job).where(Job.external_url == url))
                if existing.scalar_one_or_none():
                    continue

                db.add(Job(**_map_himalayas_to_job(item)))
                count += 1

        if count > 0:
            await db.commit()
        return count
