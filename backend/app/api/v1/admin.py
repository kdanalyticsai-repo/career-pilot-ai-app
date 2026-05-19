import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.job import Job, Application
from app.models.resume import Resume, ResumeSection
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

PLANS = {"free": {"price": 0}, "pro": {"price": 199}}


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    admin_emails = {e.strip() for e in (settings.ADMIN_EMAILS or "").split(",") if e.strip()}
    is_admin = current_user.role == "admin" or current_user.email in admin_emails
    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.get("/stats")
async def get_stats(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    # User counts
    user_result = await db.execute(select(func.count(User.id)))
    total_users = user_result.scalar() or 0

    sub_result = await db.execute(
        select(User.subscription, func.count(User.id)).group_by(User.subscription)
    )
    users_by_plan = {row[0]: row[1] for row in sub_result.all()}
    pro_users = users_by_plan.get("pro", 0)
    free_users = users_by_plan.get("free", 0)

    # Jobs
    job_result = await db.execute(select(func.count(Job.id)).where(Job.is_active == True))
    total_jobs = job_result.scalar() or 0

    source_result = await db.execute(
        select(Job.source, func.count(Job.id)).group_by(Job.source)
    )
    jobs_by_source = {row[0]: row[1] for row in source_result.all()}

    # Applications
    app_result = await db.execute(select(func.count(Application.id)))
    total_apps = app_result.scalar() or 0

    status_result = await db.execute(
        select(Application.status, func.count(Application.id)).group_by(Application.status)
    )
    apps_by_status = {row[0]: row[1] for row in status_result.all()}

    # Resumes
    resume_result = await db.execute(select(func.count(Resume.id)))
    total_resumes = resume_result.scalar() or 0

    # Revenue simulation
    monthly_revenue_inr = pro_users * 199

    # Recent signups (last 7 days)
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import cast, Date
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )
    signups_last_7d = recent_result.scalar() or 0

    # Pending provider jobs
    pending_result = await db.execute(
        select(func.count(Job.id)).where(Job.source == "provider", Job.review_status == "pending")
    )
    pending_provider_jobs = pending_result.scalar() or 0

    # Provider listed jobs — total + by status
    listed_result = await db.execute(
        select(Job.review_status, func.count(Job.id))
        .where(Job.source == "provider")
        .group_by(Job.review_status)
    )
    listed_by_status = {row[0]: row[1] for row in listed_result.all()}
    total_listed = sum(listed_by_status.values())

    # New listed jobs (last 7 days)
    new_listed_result = await db.execute(
        select(func.count(Job.id)).where(Job.source == "provider", Job.posted_at >= week_ago)
    )
    listed_last_7d = new_listed_result.scalar() or 0

    return {
        "users": {
            "total": total_users,
            "free": free_users,
            "pro": pro_users,
            "signups_last_7d": signups_last_7d,
        },
        "pending_provider_jobs": pending_provider_jobs,
        "listed_jobs": {
            "total": total_listed,
            "approved": listed_by_status.get("approved", 0),
            "pending": listed_by_status.get("pending", 0),
            "rejected": listed_by_status.get("rejected", 0),
            "last_7d": listed_last_7d,
        },
        "revenue": {
            "monthly_inr": monthly_revenue_inr,
            "monthly_usd": round(monthly_revenue_inr / 83, 2),
            "pro_subscribers": pro_users,
        },
        "jobs": {
            "total_active": total_jobs,
            "by_source": jobs_by_source,
        },
        "applications": {
            "total": total_apps,
            "by_status": apps_by_status,
        },
        "resumes": {
            "total": total_resumes,
        },
    }


@router.get("/pending-jobs")
async def list_pending_jobs(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Job, User)
        .join(User, Job.posted_by == User.id)
        .where(Job.source == "provider", Job.review_status == "pending")
        .order_by(Job.posted_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": str(job.id),
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description,
            "requirements": job.requirements,
            "skills_required": job.skills_required,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "job_type": job.job_type,
            "experience_level": job.experience_level,
            "remote_type": job.remote_type,
            "posted_at": job.posted_at.isoformat() if job.posted_at else None,
            "provider_name": user.name,
            "provider_email": user.email,
        }
        for job, user in rows
    ]


@router.get("/provider-jobs")
async def list_provider_jobs(
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Job, User)
        .join(User, Job.posted_by == User.id)
        .where(Job.source == "provider")
        .order_by(Job.posted_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": str(job.id),
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "review_status": job.review_status,
            "is_active": job.is_active,
            "job_type": job.job_type,
            "experience_level": job.experience_level,
            "remote_type": job.remote_type,
            "posted_at": job.posted_at.isoformat() if job.posted_at else None,
            "provider_name": user.name,
            "provider_email": user.email,
        }
        for job, user in rows
    ]


@router.delete("/jobs/{job_id}", status_code=200)
async def delete_job(
    job_id: uuid.UUID,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.execute(delete(Job).where(Job.id == job_id))
    await db.commit()
    return {"status": "deleted", "job_id": str(job_id)}


@router.post("/jobs/{job_id}/approve", status_code=200)
async def approve_job(
    job_id: uuid.UUID,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.is_active = True
    job.review_status = "approved"
    await db.commit()
    return {"status": "approved", "job_id": str(job_id)}


@router.post("/jobs/{job_id}/reject", status_code=200)
async def reject_job(
    job_id: uuid.UUID,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.review_status = "rejected"
    job.is_active = False
    await db.commit()
    return {"status": "rejected", "job_id": str(job_id)}


@router.delete("/users/{user_id}", status_code=200)
async def delete_user(
    user_id: uuid.UUID,
    current_admin: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single user and all their associated data."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete another admin account.")
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()
    return {"status": "deleted", "user_id": str(user_id)}


@router.delete("/purge-test-data", status_code=200)
async def purge_test_data(
    confirm: str = Query(default="", description="Must be 'yes' to proceed"),
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete all non-admin users and their associated data. Irreversible."""
    if confirm.lower() != "yes":
        raise HTTPException(
            status_code=400,
            detail="Pass ?confirm=yes to confirm. This action permanently deletes all non-admin users and their data.",
        )

    # Count before deletion for the response
    user_count_result = await db.execute(
        select(func.count(User.id)).where(User.role != "admin")
    )
    users_to_delete = user_count_result.scalar() or 0

    resume_count_result = await db.execute(
        select(func.count(Resume.id)).join(User, Resume.user_id == User.id).where(User.role != "admin")
    )
    resumes_to_delete = resume_count_result.scalar() or 0

    app_count_result = await db.execute(
        select(func.count(Application.id)).join(User, Application.user_id == User.id).where(User.role != "admin")
    )
    apps_to_delete = app_count_result.scalar() or 0

    # Delete — CASCADE handles resumes, resume_sections, job_matches, saved_jobs, applications
    await db.execute(delete(User).where(User.role != "admin"))
    await db.commit()

    return {
        "status": "purged",
        "deleted": {
            "users": users_to_delete,
            "resumes": resumes_to_delete,
            "applications": apps_to_delete,
        },
        "note": "Provider-posted jobs retained with posted_by set to NULL.",
    }


@router.get("/users")
async def list_users(
    limit: int = 50,
    offset: int = 0,
    _: User = Depends(_require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User.id, User.email, User.name, User.subscription, User.created_at)
        .order_by(User.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()
    return {
        "users": [
            {
                "id": str(r[0]),
                "email": r[1],
                "name": r[2],
                "subscription": r[3],
                "created_at": r[4].isoformat() if r[4] else None,
            }
            for r in rows
        ],
        "limit": limit,
        "offset": offset,
    }
