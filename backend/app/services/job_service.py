import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from fastapi import HTTPException, status

from app.models.job import Job, JobMatch, SavedJob
from app.models.resume import Resume
from app.schemas.job import JobFilter, JobResponse


def compute_match_score(resume_structured_data: dict | None, job: Job) -> tuple[int, dict]:
    if not resume_structured_data:
        return 0, {}

    skills_data = resume_structured_data.get("skills", {})
    technical = [s.lower() for s in (skills_data.get("technical") or [])]
    soft = [s.lower() for s in (skills_data.get("soft") or [])]
    resume_skills = set(technical + soft)

    job_skills = {s.lower() for s in (job.skills_required or [])}
    if not job_skills:
        return 50, {"note": "no skills defined for job"}

    matched = resume_skills & job_skills
    missing = job_skills - resume_skills
    score = round(len(matched) / len(job_skills) * 100)

    # Boost for experience level if found in summary/experience
    exp_text = ""
    for exp in resume_structured_data.get("experience", []):
        exp_text += " " + str(exp.get("title", "")).lower()
    summary = str(resume_structured_data.get("summary", "")).lower()

    level_bonus = 0
    level = job.experience_level
    if level == "entry" and any(w in exp_text + summary for w in ["junior", "entry", "intern", "fresher", "graduate"]):
        level_bonus = 5
    elif level == "mid" and any(w in exp_text + summary for w in ["engineer", "developer", "analyst"]):
        level_bonus = 5
    elif level == "senior" and any(w in exp_text + summary for w in ["senior", "lead", "principal", "staff"]):
        level_bonus = 10

    score = min(100, score + level_bonus)

    return score, {
        "matched_skills": sorted(matched),
        "missing_skills": sorted(missing),
        "match_percent": score,
    }


class JobService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_primary_resume(self, user_id: uuid.UUID) -> Resume | None:
        result = await self.db.execute(
            select(Resume).where(Resume.user_id == user_id, Resume.is_primary == True)
        )
        resume = result.scalars().first()
        if not resume:
            result = await self.db.execute(
                select(Resume).where(Resume.user_id == user_id).order_by(Resume.created_at.desc())
            )
            resume = result.scalars().first()
        return resume

    async def _get_saved_job_ids(self, user_id: uuid.UUID) -> set[str]:
        result = await self.db.execute(
            select(SavedJob.job_id).where(SavedJob.user_id == user_id)
        )
        return {str(row) for row in result.scalars().all()}

    async def _get_match_map(self, user_id: uuid.UUID, resume_id: uuid.UUID) -> dict[str, tuple[int, dict]]:
        result = await self.db.execute(
            select(JobMatch).where(JobMatch.user_id == user_id, JobMatch.resume_id == resume_id)
        )
        matches = result.scalars().all()
        return {str(m.job_id): (m.match_score, m.match_details or {}) for m in matches}

    def _enrich(self, job: Job, match_score: int | None, match_details: dict | None, is_saved: bool) -> JobResponse:
        return JobResponse(
            id=job.id,
            title=job.title,
            company=job.company,
            location=job.location,
            description=job.description,
            requirements=job.requirements or [],
            skills_required=job.skills_required or [],
            salary_min=job.salary_min,
            salary_max=job.salary_max,
            currency=job.currency,
            job_type=job.job_type,
            experience_level=job.experience_level,
            remote_type=job.remote_type,
            external_url=job.external_url,
            posted_at=job.posted_at,
            match_score=match_score,
            match_details=match_details,
            is_saved=is_saved,
        )

    async def list_jobs(self, user_id: uuid.UUID, filters: JobFilter) -> list[JobResponse]:
        query = select(Job).where(Job.is_active == True)

        if filters.location:
            query = query.where(Job.location.ilike(f"%{filters.location}%"))
        if filters.job_type:
            query = query.where(Job.job_type == filters.job_type)
        if filters.experience_level:
            query = query.where(Job.experience_level == filters.experience_level)
        if filters.remote_type:
            query = query.where(Job.remote_type == filters.remote_type)

        query = query.order_by(Job.posted_at.desc())
        result = await self.db.execute(query)
        jobs = result.scalars().all()

        resume = await self._get_primary_resume(user_id)
        saved_ids = await self._get_saved_job_ids(user_id)
        match_map = {}
        if resume:
            match_map = await self._get_match_map(user_id, resume.id)

        enriched = []
        for job in jobs:
            job_id_str = str(job.id)
            if job_id_str in match_map:
                score, details = match_map[job_id_str]
            elif resume:
                score, details = compute_match_score(resume.structured_data, job)
            else:
                score, details = None, None

            if filters.min_match_score and (score is None or score < filters.min_match_score):
                continue
            if filters.saved_only and job_id_str not in saved_ids:
                continue
            if filters.q:
                q = filters.q.lower()
                if q not in job.title.lower() and q not in job.company.lower() and q not in job.description.lower():
                    continue

            enriched.append(self._enrich(job, score, details, job_id_str in saved_ids))

        enriched.sort(key=lambda j: (j.match_score or 0), reverse=True)
        return enriched

    async def get_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> JobResponse:
        result = await self.db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

        resume = await self._get_primary_resume(user_id)
        saved_ids = await self._get_saved_job_ids(user_id)

        score, details = None, None
        if resume:
            match_map = await self._get_match_map(user_id, resume.id)
            job_id_str = str(job.id)
            if job_id_str in match_map:
                score, details = match_map[job_id_str]
            else:
                score, details = compute_match_score(resume.structured_data, job)

        return self._enrich(job, score, details, str(job.id) in saved_ids)

    async def save_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> None:
        result = await self.db.execute(select(Job).where(Job.id == job_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

        existing = await self.db.execute(
            select(SavedJob).where(SavedJob.user_id == user_id, SavedJob.job_id == job_id)
        )
        if not existing.scalar_one_or_none():
            self.db.add(SavedJob(user_id=user_id, job_id=job_id))
            await self.db.commit()

    async def unsave_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await self.db.execute(
            delete(SavedJob).where(SavedJob.user_id == user_id, SavedJob.job_id == job_id)
        )
        await self.db.commit()

    async def compute_all_matches(self, user_id: uuid.UUID) -> int:
        resume = await self._get_primary_resume(user_id)
        if not resume:
            return 0

        result = await self.db.execute(select(Job).where(Job.is_active == True))
        jobs = result.scalars().all()

        count = 0
        for job in jobs:
            score, details = compute_match_score(resume.structured_data, job)

            existing = await self.db.execute(
                select(JobMatch).where(
                    JobMatch.user_id == user_id,
                    JobMatch.job_id == job.id,
                    JobMatch.resume_id == resume.id,
                )
            )
            match = existing.scalar_one_or_none()
            if match:
                match.match_score = score
                match.match_details = details
            else:
                self.db.add(JobMatch(
                    user_id=user_id,
                    job_id=job.id,
                    resume_id=resume.id,
                    match_score=score,
                    match_details=details,
                ))
            count += 1

        await self.db.commit()
        return count

    async def seed_jobs(self) -> int:
        result = await self.db.execute(select(Job).limit(1))
        if result.scalar_one_or_none():
            return 0

        from app.data.job_seed import SEED_JOBS
        for job_data in SEED_JOBS:
            self.db.add(Job(**job_data))

        await self.db.commit()
        return len(SEED_JOBS)
