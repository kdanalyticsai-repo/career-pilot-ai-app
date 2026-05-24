"""The Muse API — curated global tech jobs, no API key required."""
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.job import Job

MUSE_URL = "https://www.themuse.com/api/public/jobs"

MUSE_CATEGORIES = [
    "Software Engineer",
    "Backend Engineer",
    "Frontend Engineer",
    "Mobile Engineer",
    "Data Science",
    "Data & Analytics",
    "DevOps / Sysadmin",
    "Product Management",
    "Design & UX",
    "QA & Testing",
    "Project Management",
    "Business & Strategy",
]

TECH_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node", "java", "go",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
    "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
    "kafka", "elasticsearch", "graphql", "rest", "microservices", "kotlin",
    "swift", "flutter", "android", "ios", "react native",
]


def _map_muse_to_job(item: dict) -> dict:
    title = item.get("name", "")
    company = item.get("company", {}).get("name", "Unknown Company")
    locations = item.get("locations", [])
    location = ", ".join(loc["name"] for loc in locations) if locations else "Remote"
    description = item.get("contents", "")
    levels = [lv["name"] for lv in item.get("levels", [])]
    refs = item.get("refs", {})
    external_url = refs.get("landing_page", "")

    level_str = " ".join(levels).lower()
    experience_level = "mid"
    if any(w in level_str for w in ["senior", "lead", "director", "vp", "head", "principal"]):
        experience_level = "senior"
    elif any(w in level_str for w in ["entry", "junior", "intern", "associate", "graduate"]):
        experience_level = "entry"

    location_lower = location.lower()
    remote_type = "onsite"
    if "remote" in location_lower or not location.strip():
        remote_type = "remote"
    elif "hybrid" in location_lower or "flexible" in location_lower:
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
        "currency": "USD",
        "job_type": "full_time",
        "experience_level": experience_level,
        "remote_type": remote_type,
        "source": "themuse",
        "external_url": external_url[:500] if external_url else None,
        "is_active": True,
    }


class TheMuseService:
    async def fetch_jobs(self, category: str, page: int = 0) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(MUSE_URL, params={
                    "category": category,
                    "page": page,
                    "descending": "true",
                })
                resp.raise_for_status()
                return resp.json().get("results", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession) -> int:
        count = 0
        seen: set[str] = set()

        for category in MUSE_CATEGORIES:
            # Fetch 2 pages per category (20 results/page = ~40 jobs per category)
            for page in range(2):
                results = await self.fetch_jobs(category, page)
                if not results:
                    break
                for item in results:
                    refs = item.get("refs", {})
                    url = refs.get("landing_page", "")
                    if not url or url in seen:
                        continue
                    seen.add(url)

                    existing = await db.execute(select(Job).where(Job.external_url == url))
                    if existing.scalar_one_or_none():
                        continue

                    db.add(Job(**_map_muse_to_job(item)))
                    count += 1

        if count > 0:
            await db.commit()
        return count
