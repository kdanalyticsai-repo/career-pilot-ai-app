from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.subscription import UsageRecord
from app.models.user import User

# ── Plan definitions ──────────────────────────────────────────────────────────

PLANS = {
    "free": {
        "name": "Free",
        "price_inr": 0,
        "price_display": "Free",
        "features": {
            "resume_uploads": 1,
            "job_matches_per_day": 20,
            "ai_chat_per_month": 5,
            "interview_prep_per_month": 1,
            "cover_letter_per_month": 1,
            "tailor_per_month": 1,
            "application_tracking": 10,
        },
        "highlights": [
            "1 resume upload",
            "Top 20 job matches / day",
            "5 AI Coach chats / month",
            "1 interview prep / month",
            "1 cover letter / month",
            "1 resume tailoring / month",
            "Track up to 10 applications",
        ],
    },
    "pro": {
        "name": "Pro",
        "price_inr": 199,
        "price_display": "₹199/month",
        "features": {
            "resume_uploads": 5,
            "job_matches_per_day": -1,   # -1 = unlimited
            "ai_chat": True,
            "interview_prep_per_month": -1,
            "cover_letter_per_month": -1,
            "tailor_per_month": 10,
            "application_tracking": -1,
        },
        "highlights": [
            "Up to 5 resumes",
            "Unlimited job matches",
            "Unlimited AI Coach chats",
            "Unlimited interview prep",
            "Unlimited cover letters",
            "10 resume tailorings / month",
            "Unlimited application tracking",
        ],
    },
}

# Monthly free-tier limits per feature (None = blocked entirely)
FREE_LIMITS: dict[str, int | None] = {
    "chat": 5,               # 5 messages/month on free plan
    "interview_prep": 1,
    "cover_letter": 1,
    "tailor": 1,
}


def _this_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


async def get_usage(db: AsyncSession, user_id, feature: str) -> int:
    result = await db.execute(
        select(UsageRecord.count).where(
            UsageRecord.user_id == user_id,
            UsageRecord.feature == feature,
            UsageRecord.year_month == _this_month(),
        )
    )
    return result.scalar() or 0


async def increment_usage(db: AsyncSession, user_id, feature: str) -> int:
    """Upsert usage counter and return new count."""
    month = _this_month()

    if db.bind and "postgresql" in str(db.bind.dialect.name if hasattr(db.bind, "dialect") else ""):
        stmt = (
            pg_insert(UsageRecord)
            .values(user_id=user_id, feature=feature, year_month=month, count=1)
            .on_conflict_do_update(
                constraint="uq_user_feature_month",
                set_={"count": UsageRecord.count + 1},
            )
            .returning(UsageRecord.count)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.scalar() or 1
    else:
        # SQLite fallback
        result = await db.execute(
            select(UsageRecord).where(
                UsageRecord.user_id == user_id,
                UsageRecord.feature == feature,
                UsageRecord.year_month == month,
            )
        )
        record = result.scalar_one_or_none()
        if record:
            record.count += 1
        else:
            record = UsageRecord(user_id=user_id, feature=feature, year_month=month, count=1)
            db.add(record)
        await db.commit()
        return record.count


async def get_all_usage(db: AsyncSession, user_id) -> dict[str, int]:
    month = _this_month()
    result = await db.execute(
        select(UsageRecord.feature, UsageRecord.count).where(
            UsageRecord.user_id == user_id,
            UsageRecord.year_month == month,
        )
    )
    return {row[0]: row[1] for row in result.all()}


def is_in_trial(user: User) -> bool:
    """True if user registered within the last 7 days."""
    if not user.created_at:
        return False
    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - created < timedelta(days=7)


def check_feature_access(user: User, feature: str) -> tuple[bool, str]:
    """Returns (allowed, reason). reason is empty when allowed."""
    if user.subscription == "pro":
        return True, ""
    # 7-day trial: unlimited access from registration date
    if is_in_trial(user):
        return True, ""

    limit = FREE_LIMITS.get(feature)
    if limit is None:
        return False, "upgrade_required"
    return True, ""


async def check_usage_limit(
    db: AsyncSession, user: User, feature: str
) -> tuple[bool, str]:
    """Returns (allowed, reason). Checks plan access then monthly limits."""
    allowed, reason = check_feature_access(user, feature)
    if not allowed:
        return False, reason

    if user.subscription == "pro":
        return True, ""

    limit = FREE_LIMITS.get(feature)
    if limit is not None:
        used = await get_usage(db, user.id, feature)
        if used >= limit:
            return False, "monthly_limit_reached"

    return True, ""
