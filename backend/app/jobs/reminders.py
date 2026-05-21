"""Weekly push reminder for users with pending interview-stage applications."""
import logging
from sqlalchemy import select, distinct

from app.database import AsyncSessionLocal
from app.models.job import Application
from app.models.notification import PushToken, NotificationPreference
from app.services.notification_service import send_push_notifications

logger = logging.getLogger(__name__)


async def send_interview_reminders() -> None:
    """
    Weekly job (Monday 9 AM IST): push a prep reminder to every job seeker
    who has at least one application in 'interview' status and has push_reminders=True.
    """
    async with AsyncSessionLocal() as db:
        # Find distinct users who have an interview-stage application
        interview_users_result = await db.execute(
            select(distinct(Application.user_id)).where(Application.status == "interview")
        )
        user_ids = list(interview_users_result.scalars().all())
        if not user_ids:
            logger.info("Interview reminders: no users with interview-stage applications")
            return

        logger.info("Interview reminders: %d users eligible", len(user_ids))

        for user_id in user_ids:
            # Check preference
            pref_result = await db.execute(
                select(NotificationPreference).where(NotificationPreference.user_id == user_id)
            )
            pref = pref_result.scalar_one_or_none()
            if pref and not pref.push_reminders:
                continue

            # Get active push tokens
            tokens_result = await db.execute(
                select(PushToken.token).where(
                    PushToken.user_id == user_id,
                    PushToken.active == True,
                )
            )
            tokens = list(tokens_result.scalars().all())
            if not tokens:
                continue

            await send_push_notifications(
                tokens=tokens,
                title="Interview this week? ✦",
                body="Prepare your STAR answers, research the company, and review your resume.",
                data={"screen": "applications"},
            )

        logger.info("Interview reminders sent")
