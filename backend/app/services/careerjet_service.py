"""Careerjet public API — free, no key, strong India coverage."""
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.job import Job

CAREERJET_URL = "http://public.api.careerjet.net/search"

CAREERJET_QUERIES = [
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
    ("cloud engineer", "India"),
    ("data engineer", "India"),
    ("ui ux designer", "India"),
    ("qa engineer", "India"),
    ("project manager", "India"),
    ("cybersecurity engineer", "India"),
]

TECH_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node", "java", "go",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
    "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
    "kafka", "elasticsearch", "graphql", "rest", "microservices", "kotlin",
    "swift", "flutter", "android", "ios", "react native", "angular", "vue",
]


def _map_careerjet_to_job(item: dict) -> dict:
    title = item.get("title", "")
    company = item.get("company", "Unknown Company") or "Unknown Company"
    location = item.get("locations", "") or "India"
    description = item.get("description", "")
    url = item.get("url", "")
    date = item.get("date", "")

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
        "company": company[:255],
        "location": location[:255],
        "description": description,
        "requirements": [],
        "skills_required": skills,
        "salary_min": None,
        "salary_max": None,
        "currency": "INR",
        "job_type": "full_time",
        "experience_level": experience_level,
        "remote_type": remote_type,
        "source": "careerjet",
        "external_url": url[:500] if url else None,
        "is_active": True,
    }


class CareerjetService:
    async def search_jobs(self, keywords: str, location: str) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(CAREERJET_URL, params={
                    "locale_code": "en_IN",
                    "keywords": keywords,
                    "location": location,
                    "pagesize": 99,
                    "page": 1,
                    "affid": "proaicv",
                })
                resp.raise_for_status()
                data = resp.json()
                return data.get("jobs", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession) -> int:
        count = 0
        seen: set[str] = set()

        for keywords, location in CAREERJET_QUERIES:
            results = await self.search_jobs(keywords, location)
            for item in results:
                url = item.get("url", "")
                if not url or url in seen:
                    continue
                seen.add(url)

                existing = await db.execute(select(Job).where(Job.external_url == url))
                if existing.scalar_one_or_none():
                    continue

                db.add(Job(**_map_careerjet_to_job(item)))
                count += 1

        if count > 0:
            await db.commit()
        return count
