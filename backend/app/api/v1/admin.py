from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.job import Job, Application
from app.models.resume import Resume
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

PLANS = {"free": {"price": 0}, "pro": {"price": 199}}


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    admin_emails = {e.strip() for e in (settings.ADMIN_EMAILS or "").split(",") if e.strip()}
    if current_user.email not in admin_emails:
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

    return {
        "users": {
            "total": total_users,
            "free": free_users,
            "pro": pro_users,
            "signups_last_7d": signups_last_7d,
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
