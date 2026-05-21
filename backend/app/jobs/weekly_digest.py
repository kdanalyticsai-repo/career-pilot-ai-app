"""Weekly digest email + bi-weekly career tips email."""
import logging
from datetime import datetime, timezone
from sqlalchemy import select, func

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.job import Job, Application
from app.models.notification import NotificationPreference
from app.services.email_service import send_weekly_digest_email, send_career_tip_email

logger = logging.getLogger(__name__)

CAREER_TIPS = [
    (
        "Tailor your resume for every job",
        "<p>Generic resumes get 3× fewer callbacks. Before applying, scan the job description for keywords and mirror them in your resume — especially in your summary and skills sections. CVProAI's Tailor feature does this automatically.</p>",
    ),
    (
        "Quantify every achievement you can",
        "<p><em>\"Increased sales by 27%\"</em> beats <em>\"Improved sales\"</em> every time. Go through each bullet point and ask: can I add a number here? Even rough estimates (\"~50 customers\", \"team of 6\") make your experience more credible and memorable.</p>",
    ),
    (
        "Prepare 3 STAR stories before every interview",
        "<p>Behavioural questions like <em>\"Tell me about a challenge you overcame\"</em> are universal. Prepare three versatile stories using the <strong>STAR</strong> framework — Situation, Task, Action, Result — that you can adapt to almost any question.</p>",
    ),
    (
        "Follow up one week after applying",
        "<p>A short, polite follow-up email to the recruiter one week after submitting shows initiative and keeps you top-of-mind. Keep it under 3 sentences: who you are, the role you applied for, and that you're happy to provide more information.</p>",
    ),
    (
        "Research the company before every interview",
        "<p>Know their recent news, mission, and what makes them different from competitors. Interviewers consistently rate candidates higher when they demonstrate genuine curiosity about the company. Spend 20 minutes on their website, LinkedIn, and Google News.</p>",
    ),
    (
        "Negotiate your salary — 70% of employers expect it",
        "<p>Most candidates accept the first offer. Don't. Research market rates (use Glassdoor, LinkedIn Salary, or AmbitionBox for India), then counter with a specific number backed by your experience. The worst they can say is no.</p>",
    ),
    (
        "Your LinkedIn headline is your most-read line",
        "<p>Most recruiters only read the headline before deciding to click your profile. Don't just put your job title — include your value: <em>\"Frontend Engineer | React & TypeScript | Fintech\"</em>. Keep it under 120 characters and keyword-rich.</p>",
    ),
    (
        "80% of jobs are filled through referrals",
        "<p>The hidden job market is real. Reach out to former colleagues, classmates, and contacts at companies you admire. A short message asking for a 15-minute chat — not a favour — is almost always well-received. Your next job may come from a conversation, not an application.</p>",
    ),
]


async def send_weekly_digests() -> None:
    """
    Weekly job (Monday 4:00 UTC = 9:30 IST):
    - Send weekly digest to all job seekers with email_weekly_digest=True.
    - Every alternate week, also send a career tip to users with email_tips=True.
    """
    now = datetime.now(timezone.utc)
    iso_week = now.isocalendar()[1]
    send_tips_this_week = (iso_week % 2 == 0)

    logger.info("Weekly digest job starting (week %d, tips=%s)", iso_week, send_tips_this_week)

    async with AsyncSessionLocal() as db:
        # Total active jobs count (for the digest)
        jobs_count_result = await db.execute(
            select(func.count(Job.id)).where(Job.is_active == True)
        )
        total_jobs: int = jobs_count_result.scalar_one() or 0

        # All onboarded job seekers
        seekers_result = await db.execute(
            select(User).where(User.role == "job_seeker", User.onboarded == True)
        )
        seekers = seekers_result.scalars().all()
        logger.info("Weekly digest: %d seekers eligible", len(seekers))

        tip = CAREER_TIPS[iso_week % len(CAREER_TIPS)]

        for user in seekers:
            pref_result = await db.execute(
                select(NotificationPreference).where(NotificationPreference.user_id == user.id)
            )
            pref = pref_result.scalar_one_or_none()

            # Weekly digest
            digest_enabled = pref.email_weekly_digest if pref else True
            if digest_enabled:
                # Application counts by status
                counts_result = await db.execute(
                    select(Application.status, func.count(Application.id))
                    .where(Application.user_id == user.id)
                    .group_by(Application.status)
                )
                counts: dict[str, int] = {row[0]: row[1] for row in counts_result.all()}
                try:
                    await send_weekly_digest_email(
                        to_email=user.email,
                        name=user.name or "",
                        applied=counts.get("applied", 0),
                        interview=counts.get("interview", 0),
                        offer=counts.get("offer", 0),
                        rejected=counts.get("rejected", 0),
                        total_jobs=total_jobs,
                    )
                except Exception as exc:
                    logger.error("Digest failed for %s: %s", user.email, exc)

            # Bi-weekly career tips
            tips_enabled = pref.email_tips if pref else True
            if send_tips_this_week and tips_enabled:
                try:
                    await send_career_tip_email(
                        to_email=user.email,
                        name=user.name or "",
                        tip_subject=tip[0],
                        tip_body=tip[1],
                    )
                except Exception as exc:
                    logger.error("Tips failed for %s: %s", user.email, exc)

    logger.info("Weekly digest job complete")
