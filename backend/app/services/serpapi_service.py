"""SerpApi — Google Jobs search results."""
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.job import Job

SERPAPI_URL = "https://serpapi.com/search"

SERPAPI_QUERIES = [
    "software engineer",
    "data scientist",
    "full stack developer",
    "android developer",
    "product manager",
]

TECH_KEYWORDS = [
    "python", "javascript", "typescript", "react", "node", "java", "go",
    "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "fastapi", "django", "flask", "spring",
    "machine learning", "deep learning", "tensorflow", "pytorch", "spark",
    "kafka", "elasticsearch", "graphql", "rest", "microservices", "kotlin",
    "swift", "flutter", "android", "ios", "react native",
]


def _map_serpapi_to_job(item: dict) -> dict:
    title = item.get("title", "")
    company = item.get("company_name", "Unknown Company")
    location = item.get("location", "India")
    description = item.get("description", "")
    extensions = item.get("detected_extensions", {})
    schedule_type = extensions.get("schedule_type", "Full-time").lower()

    job_type = "full_time"
    if "part" in schedule_type:
        job_type = "part_time"
    elif "contract" in schedule_type:
        job_type = "contract"
    elif "intern" in schedule_type:
        job_type = "internship"

    title_lower = title.lower()
    experience_level = "mid"
    if any(w in title_lower for w in ["senior", "lead", "principal", "staff", "head", "architect", "director"]):
        experience_level = "senior"
    elif any(w in title_lower for w in ["junior", "entry", "intern", "graduate", "fresher", "trainee", "associate"]):
        experience_level = "entry"

    location_lower = location.lower()
    remote_type = "onsite"
    if "remote" in location_lower:
        remote_type = "remote"
    elif "hybrid" in location_lower:
        remote_type = "hybrid"

    desc_lower = description.lower()
    # Also check job highlights for skills
    highlights = item.get("job_highlights", [])
    highlights_text = " ".join(
        h_item for h in highlights for h_item in h.get("items", [])
    ).lower()
    combined = desc_lower + " " + highlights_text
    skills = list({kw for kw in TECH_KEYWORDS if kw in combined})[:20]

    # Try to get an apply link
    related = item.get("related_links", [])
    external_url = related[0].get("link", "") if related else item.get("job_id", "")

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
        "job_type": job_type,
        "experience_level": experience_level,
        "remote_type": remote_type,
        "source": "serpapi",
        "external_url": external_url[:500] if external_url else None,
        "is_active": True,
    }


class SerpApiService:
    async def search_jobs(self, query: str) -> list[dict]:
        if not settings.SERPAPI_API_KEY:
            return []
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(SERPAPI_URL, params={
                    "engine": "google_jobs",
                    "q": f"{query} India",
                    "gl": "in",
                    "hl": "en",
                    "api_key": settings.SERPAPI_API_KEY,
                })
                resp.raise_for_status()
                return resp.json().get("jobs_results", [])
        except Exception:
            return []

    async def sync_jobs_to_db(self, db: AsyncSession) -> int:
        if not settings.SERPAPI_API_KEY:
            return 0

        count = 0
        seen: set[str] = set()

        for query in SERPAPI_QUERIES:
            results = await self.search_jobs(query)
            for item in results:
                # Use job_id as dedup key (Google's internal ID)
                job_id = item.get("job_id", "")
                url = (item.get("related_links") or [{}])[0].get("link", "")
                dedup_key = url or job_id
                if not dedup_key or dedup_key in seen:
                    continue
                seen.add(dedup_key)

                if dedup_key:
                    existing = await db.execute(
                        select(Job).where(Job.external_url == dedup_key)
                    )
                    if existing.scalar_one_or_none():
                        continue

                db.add(Job(**_map_serpapi_to_job(item)))
                count += 1

        if count > 0:
            await db.commit()
        return count
