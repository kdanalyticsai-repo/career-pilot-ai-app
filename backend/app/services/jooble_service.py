"""Jooble API — aggregates 140K+ job boards including Indian sources."""
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.job import Job

JOOBLE_URL = "https://jooble.org/api/{key}"

JOOBLE_QUERIES = [
    ("software engineer", "India"),
    ("python developer", "India"),
    ("react developer", "India"),
    ("java developer", "India"),
    ("data scientist", "India"),
    ("full stack developer", "India"),
    ("devops engineer", "India"),
    ("android developer", "India"),
    ("ios developer", "India"),
    ("product manager", "India"),
    ("machine learning engineer", "India"),
    ("backend developer", "India"),
    ("frontend developer", "India"),
    ("business analyst", "India"),
    ("cybersecurity engineer", "India"),
    ("electrical engineer", "India"),
    ("production engineer", "India"),
    ("quality engineer", "India"),
    ("graduate engineer trainee", "India"),
    ("power plant engineer", "India"),
    ("cable engineer", "India"),
    ("Havells", "India"),
    ("Tata Power", "India"),
    ("KEC International", "India"),
]

TECH_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node", "java", "go",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
    "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
    "kafka", "elasticsearch", "graphql", "rest", "microservices", "kotlin",
    "swift", "flutter", "android", "ios", "react native",
]


def _map_jooble_to_job(item: dict) -> dict:
    title = item.get("title", "")
    location = item.get("location", "India")
    description = item.get("snippet", "")
    job_type_raw = (item.get("type") or "").lower()
    external_url = item.get("link", "")

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
    elif any(w in title_lower for w in ["junior", "entry", "intern", "graduate", "fresher", "trainee"]):
        experience_level = "entry"

    location_lower = location.lower()
    remote_type = "onsite"
    if "remote" in location_lower:
        remote_type = "remote"
    elif "hybrid" in location_lower:
        remote_type = "hybrid"

    desc_lower = description.lower()
    skills = list({kw for kw in TECH_KEYWORDS if kw in desc_lower})[:20]

    return {
        "title": title[:255],
        "company": (item.get("company") or "Unknown Company")[:255],
        "location": location[:255],
        "description": description,
        "requirements": [],
        "skills_required": skills,
        "salary_min": None,
        "salary_max": None,
        "currency": "INR",
        "job_type": job_type,
        "experience_level": experience_level,
        "remote_type": remote_type,
        "source": "jooble",
        "external_url": external_url[:500] if external_url else None,
        "is_active": True,
    }


class JoobleService:
    async def search_jobs(self, keywords: str, location: str) -> list[dict]:
        if not settings.JOOBLE_API_KEY:
            return []
        url = JOOBLE_URL.format(key=settings.JOOBLE_API_KEY)
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(url, json={"keywords": keywords, "location": location})
                resp.raise_for_status()
                return resp.json().get("jobs", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession) -> int:
        if not settings.JOOBLE_API_KEY:
            return 0

        count = 0
        seen: set[str] = set()

        for keywords, location in JOOBLE_QUERIES:
            results = await self.search_jobs(keywords, location)
            for item in results:
                url = item.get("link", "")
                if not url or url in seen:
                    continue
                seen.add(url)

                existing = await db.execute(select(Job).where(Job.external_url == url))
                if existing.scalar_one_or_none():
                    continue

                db.add(Job(**_map_jooble_to_job(item)))
                count += 1

        if count > 0:
            await db.commit()
        return count
