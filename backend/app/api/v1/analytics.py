from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.job import Application, SavedJob, JobMatch
from app.models.resume import Resume

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user.id

    # Application counts by status
    result = await db.execute(
        select(Application.status, func.count(Application.id))
        .where(Application.user_id == user_id)
        .group_by(Application.status)
    )
    by_status: dict[str, int] = {row[0]: row[1] for row in result.all()}

    total_apps = sum(by_status.values())
    responded = sum(by_status.get(s, 0) for s in ["screening", "interview", "offer", "rejected"])
    response_rate = round(responded / total_apps * 100) if total_apps > 0 else 0

    # Resume stats
    resume_result = await db.execute(
        select(Resume).where(Resume.user_id == user_id, Resume.is_primary == True)
    )
    primary = resume_result.scalars().first()
    if not primary:
        resume_result2 = await db.execute(
            select(Resume).where(Resume.user_id == user_id).order_by(Resume.created_at.desc())
        )
        primary = resume_result2.scalars().first()

    ats_score = primary.ats_score if primary else None
    completeness = primary.completeness_score if primary else None

    # Job stats
    saved_result = await db.execute(
        select(func.count(SavedJob.id)).where(SavedJob.user_id == user_id)
    )
    saved_count = saved_result.scalar() or 0

    match_result = await db.execute(
        select(func.max(JobMatch.match_score)).where(JobMatch.user_id == user_id)
    )
    top_match = match_result.scalar() or 0

    match_count_result = await db.execute(
        select(func.count(JobMatch.id)).where(JobMatch.user_id == user_id)
    )
    match_count = match_count_result.scalar() or 0

    return {
        "applications": {
            "total": total_apps,
            "by_status": {
                "applied": by_status.get("applied", 0),
                "screening": by_status.get("screening", 0),
                "interview": by_status.get("interview", 0),
                "offer": by_status.get("offer", 0),
                "rejected": by_status.get("rejected", 0),
                "withdrawn": by_status.get("withdrawn", 0),
            },
            "response_rate": response_rate,
        },
        "resume": {
            "ats_score": ats_score,
            "completeness_score": completeness,
        },
        "jobs": {
            "saved_count": saved_count,
            "match_count": match_count,
            "top_match_score": top_match,
        },
    }
