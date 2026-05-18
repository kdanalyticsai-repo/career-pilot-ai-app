import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.dependencies import get_db, require_role
from app.models.user import User
from app.models.job import Job, Application

router = APIRouter(prefix="/provider", tags=["provider"])


class JobCreateRequest(BaseModel):
    title: str
    company: str
    location: str
    description: str
    requirements: list[str] = []
    skills_required: list[str] = []
    salary_min: int | None = None
    salary_max: int | None = None
    job_type: str = "full_time"
    experience_level: str = "mid"
    remote_type: str = "onsite"


class JobUpdateRequest(BaseModel):
    title: str | None = None
    company: str | None = None
    location: str | None = None
    description: str | None = None
    requirements: list[str] | None = None
    skills_required: list[str] | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    job_type: str | None = None
    experience_level: str | None = None
    remote_type: str | None = None


def _job_to_dict(job: Job, applicant_count: int = 0) -> dict:
    return {
        "id": str(job.id),
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description,
        "requirements": job.requirements,
        "skills_required": job.skills_required,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "currency": job.currency,
        "job_type": job.job_type,
        "experience_level": job.experience_level,
        "remote_type": job.remote_type,
        "review_status": job.review_status,
        "is_active": job.is_active,
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "applicant_count": applicant_count,
    }


@router.post("/jobs", status_code=status.HTTP_201_CREATED)
async def create_job(
    data: JobCreateRequest,
    current_user: User = Depends(require_role("job_provider")),
    db: AsyncSession = Depends(get_db),
):
    job = Job(
        title=data.title,
        company=data.company,
        location=data.location,
        description=data.description,
        requirements=data.requirements,
        skills_required=data.skills_required,
        salary_min=data.salary_min,
        salary_max=data.salary_max,
        job_type=data.job_type,
        experience_level=data.experience_level,
        remote_type=data.remote_type,
        source="provider",
        is_active=False,
        review_status="pending",
        posted_by=current_user.id,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return _job_to_dict(job)


@router.get("/jobs")
async def list_my_jobs(
    current_user: User = Depends(require_role("job_provider")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Job).where(Job.posted_by == current_user.id).order_by(Job.posted_at.desc())
    )
    jobs = result.scalars().all()

    counts_result = await db.execute(
        select(Application.job_id, func.count(Application.id))
        .where(Application.job_id.in_([j.id for j in jobs]))
        .group_by(Application.job_id)
    )
    counts = {str(row[0]): row[1] for row in counts_result.all()}

    return [_job_to_dict(j, counts.get(str(j.id), 0)) for j in jobs]


@router.put("/jobs/{job_id}")
async def update_job(
    job_id: uuid.UUID,
    data: JobUpdateRequest,
    current_user: User = Depends(require_role("job_provider")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job or job.posted_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.review_status == "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approved listings cannot be edited. Contact support.",
        )

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(job, field, value)
    # Reset to pending review after edit
    job.review_status = "pending"
    job.is_active = False
    await db.commit()
    await db.refresh(job)
    return _job_to_dict(job)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: uuid.UUID,
    current_user: User = Depends(require_role("job_provider")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job or job.posted_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    await db.delete(job)
    await db.commit()


@router.get("/jobs/{job_id}/applicants")
async def get_applicants(
    job_id: uuid.UUID,
    current_user: User = Depends(require_role("job_provider")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job or job.posted_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    apps_result = await db.execute(
        select(Application, User)
        .join(User, Application.user_id == User.id)
        .where(Application.job_id == job_id)
        .order_by(Application.applied_at.desc())
    )
    rows = apps_result.all()
    return [
        {
            "application_id": str(app.id),
            "applicant_name": user.name,
            "applicant_email": user.email,
            "applied_at": app.applied_at.isoformat(),
            "status": app.status,
        }
        for app, user in rows
    ]
