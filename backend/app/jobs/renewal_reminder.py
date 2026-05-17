import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.notification import PushToken, NotificationPreference
from app.services.notification_service import send_push_notifications

logger = logging.getLogger(__name__)


async def send_pro_renewal_reminders() -> None:
    """
    Daily job: send push notification to Pro users whose plan expires in 1–3 days.
    Respects the user's push_reminders preference.
    """
    now = datetime.now(timezone.utc)
    window_start = now + timedelta(days=1)
    window_end = now + timedelta(days=3)

    logger.info(f"Running renewal reminders for expiry between {window_start.date()} and {window_end.date()}")

    async with AsyncSessionLocal() as db:
        # Find Pro users expiring in the next 1–3 days
        result = await db.execute(
            select(User).where(
                User.subscription == "pro",
                User.pro_expires_at >= window_start,
                User.pro_expires_at <= window_end,
            )
        )
        users = result.scalars().all()
        logger.info(f"Found {len(users)} users expiring soon")

        for user in users:
            await _notify_user(db, user)


async def _notify_user(db: AsyncSession, user: User) -> None:
    # Check if user has push_reminders enabled
    pref_result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == user.id)
    )
    pref = pref_result.scalar_one_or_none()
    if pref and not pref.push_reminders:
        return

    # Get active push tokens
    tokens_result = await db.execute(
        select(PushToken.token).where(
            PushToken.user_id == user.id,
            PushToken.active == True,
        )
    )
    tokens = list(tokens_result.scalars().all())
    if not tokens:
        return

    days_left = (user.pro_expires_at - datetime.now(timezone.utc)).days + 1
    expiry_str = user.pro_expires_at.strftime("%-d %b")

    await send_push_notifications(
        tokens=tokens,
        title="Your CVPilot Pro is expiring soon ✦",
        body=f"Your Pro plan expires in {days_left} day{'s' if days_left != 1 else ''} ({expiry_str}). Renew to keep unlimited access.",
        data={"screen": "paywall"},
    )
    logger.info(f"Sent renewal reminder to user {user.id} (expires {expiry_str})")
