"""Findwork.dev API — free global tech job board, no API key required."""
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.job import Job

FINDWORK_URL = "https://findwork.dev/api/jobs/"

FINDWORK_KEYWORDS = [
    "python",
    "react",
    "javascript",
    "java",
    "devops",
    "data science",
    "machine learning",
    "android",
    "ios",
    "golang",
    "typescript",
    "kubernetes",
    "full stack",
    "backend",
    "frontend",
]

TECH_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node", "java", "go",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
    "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
    "kafka", "elasticsearch", "graphql", "rest", "microservices", "kotlin",
    "swift", "flutter", "android", "ios", "react native",
]


def _map_findwork_to_job(item: dict) -> dict:
    title = item.get("role", "")
    company = item.get("company_name", "Unknown Company")
    location = item.get("location", "") or "Remote"
    description = item.get("text", "")
    external_url = item.get("url", "")
    keywords = [kw.lower() for kw in (item.get("keywords") or [])]
    employment_type = (item.get("employment_type") or "").lower()

    job_type = "full_time"
    if "part" in employment_type:
        job_type = "part_time"
    elif "contract" in employment_type:
        job_type = "contract"
    elif "intern" in employment_type:
        job_type = "internship"

    title_lower = title.lower()
    experience_level = "mid"
    if any(w in title_lower for w in ["senior", "lead", "principal", "staff", "head", "architect", "director"]):
        experience_level = "senior"
    elif any(w in title_lower for w in ["junior", "entry", "intern", "graduate", "fresher", "trainee"]):
        experience_level = "entry"

    location_lower = location.lower()
    remote_type = "remote" if item.get("remote") else "onsite"
    if remote_type == "onsite" and "hybrid" in location_lower:
        remote_type = "hybrid"

    desc_lower = description.lower()
    skills = list({kw for kw in TECH_KEYWORDS if kw in desc_lower or kw in keywords})[:20]

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
        "remote_type": remote_type,
        "source": "findwork",
        "external_url": external_url[:500] if external_url else None,
        "is_active": True,
    }


class FindworkService:
    async def fetch_jobs(self, keyword: str) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(FINDWORK_URL, params={"search": keyword})
                resp.raise_for_status()
                return resp.json().get("results", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession) -> int:
        count = 0
        seen: set[str] = set()

        for keyword in FINDWORK_KEYWORDS:
            results = await self.fetch_jobs(keyword)
            for item in results:
                url = item.get("url", "")
                if not url or url in seen:
                    continue
                seen.add(url)

                existing = await db.execute(select(Job).where(Job.external_url == url))
                if existing.scalar_one_or_none():
                    continue

                db.add(Job(**_map_findwork_to_job(item)))
                count += 1

        if count > 0:
            await db.commit()
        return count
