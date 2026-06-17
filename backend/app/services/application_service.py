import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.job import Application, Job
from app.models.user import User
from app.schemas.job import ApplicationCreate, ApplicationUpdate, ApplicationResponse, ApplicationJobInfo
from app.services.notification_service import get_user_push_tokens, send_push_notifications, get_or_create_preferences
from app.services.email_service import send_application_submitted_email, send_application_status_email

STATUS_LABELS = {
    "applied": "Application submitted",
    "screening": "You're in screening",
    "interview": "Interview scheduled",
    "offer": "Offer received!",
    "rejected": "Application not selected",
    "withdrawn": "Application withdrawn",
}


class ApplicationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: uuid.UUID, data: ApplicationCreate) -> ApplicationResponse:
        if data.job_id:
            result = await self.db.execute(select(Job).where(Job.id == data.job_id))
            job = result.scalar_one_or_none()
            if not job:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        else:
            if not data.job_title or not data.company:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="job_title and company are required when job_id is not provided",
                )
            job = Job(
                title=data.job_title,
                company=data.company,
                location=data.location or "Not specified",
                description="",
                source=data.source or "manual",
                external_url=data.external_url,
                posted_by=user_id,
                is_active=False,
            )
            self.db.add(job)
            await self.db.flush()

        existing = await self.db.execute(
            select(Application).where(
                Application.user_id == user_id,
                Application.job_id == job.id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already applied to this job")

        now = datetime.now(timezone.utc)
        timeline_entry = {"status": "applied", "timestamp": now.isoformat(), "note": "Application created"}

        app = Application(
            user_id=user_id,
            job_id=job.id,
            resume_id=data.resume_id,
            status="applied",
            notes=data.notes,
            timeline=[timeline_entry],
            next_action=data.next_action,
            next_action_date=data.next_action_date,
        )
        self.db.add(app)
        await self.db.commit()
        await self.db.refresh(app)

        # Email: notify job seeker of submission
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            await send_application_submitted_email(
                user.email, user.name or "", job.title, job.company or ""
            )

        return self._to_response(app, job)

    async def list(self, user_id: uuid.UUID) -> list[ApplicationResponse]:
        result = await self.db.execute(
            select(Application).where(Application.user_id == user_id).order_by(Application.applied_at.desc())
        )
        apps = result.scalars().all()

        responses = []
        for app in apps:
            job_result = await self.db.execute(select(Job).where(Job.id == app.job_id))
            job = job_result.scalar_one_or_none()
            responses.append(self._to_response(app, job))
        return responses

    async def get(self, application_id: uuid.UUID, user_id: uuid.UUID) -> ApplicationResponse:
        app = await self._get_owned(application_id, user_id)
        job_result = await self.db.execute(select(Job).where(Job.id == app.job_id))
        job = job_result.scalar_one_or_none()
        return self._to_response(app, job)

    async def update(self, application_id: uuid.UUID, user_id: uuid.UUID, data: ApplicationUpdate) -> ApplicationResponse:
        app = await self._get_owned(application_id, user_id)

        now = datetime.now(timezone.utc)
        timeline = list(app.timeline or [])

        status_changed = bool(data.status and data.status != app.status)

        if status_changed:
            timeline.append({"status": data.status, "timestamp": now.isoformat(), "note": f"Status changed to {data.status}"})
            app.status = data.status

        if data.notes is not None:
            app.notes = data.notes
        if data.next_action is not None:
            app.next_action = data.next_action
        if data.next_action_date is not None:
            app.next_action_date = data.next_action_date

        app.timeline = timeline
        app.updated_at = now

        await self.db.commit()
        await self.db.refresh(app)

        job_result = await self.db.execute(select(Job).where(Job.id == app.job_id))
        job = job_result.scalar_one_or_none()

        if status_changed:
            job_title = job.title if job else "your application"
            job_company = job.company if job else ""
            label = STATUS_LABELS.get(data.status, data.status.replace("_", " ").title())
            tokens = await get_user_push_tokens(self.db, app.user_id)
            if tokens:
                await send_push_notifications(
                    tokens,
                    title=f"Application Update — {job_title}",
                    body=label,
                    data={"type": "application_status", "application_id": str(app.id), "status": data.status},
                )
            # Email: only if user has enabled status change emails
            user_result = await self.db.execute(select(User).where(User.id == app.user_id))
            seeker = user_result.scalar_one_or_none()
            if seeker:
                pref = await get_or_create_preferences(self.db, app.user_id)
                if pref.email_status_changes:
                    await send_application_status_email(
                        seeker.email, seeker.name or "", job_title, job_company, data.status
                    )

        return self._to_response(app, job)

    async def delete(self, application_id: uuid.UUID, user_id: uuid.UUID) -> None:
        app = await self._get_owned(application_id, user_id)
        await self.db.delete(app)
        await self.db.commit()

    async def _get_owned(self, application_id: uuid.UUID, user_id: uuid.UUID) -> Application:
        result = await self.db.execute(
            select(Application).where(Application.id == application_id, Application.user_id == user_id)
        )
        app = result.scalar_one_or_none()
        if not app:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
        return app

    def _to_response(self, app: Application, job: Job | None) -> ApplicationResponse:
        job_info = None
        if job:
            job_info = ApplicationJobInfo(
                id=job.id,
                title=job.title,
                company=job.company,
                location=job.location,
                job_type=job.job_type,
                external_url=job.external_url,
                source=job.source,
            )
        return ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            resume_id=app.resume_id,
            status=app.status,
            notes=app.notes,
            timeline=app.timeline or [],
            next_action=app.next_action,
            next_action_date=app.next_action_date,
            applied_at=app.applied_at,
            updated_at=app.updated_at,
            job=job_info,
        )
