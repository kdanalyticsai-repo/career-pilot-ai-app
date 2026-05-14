import uuid
import os
import shutil
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse

from app.models.resume import Resume
from app.schemas.resume import ResumeUploadRequest, ResumeUpdate, ResumeSectionUpdate
from app.config import settings

EDITABLE_SECTIONS = {"contact", "summary", "experience", "skills", "education", "projects"}


def _s3_client():
    import boto3
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def _ensure_local_dir(path: str) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


class ResumeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_upload_url(self, user_id: uuid.UUID, data: ResumeUploadRequest) -> tuple[Resume, str, str]:
        file_key = f"resumes/{user_id}/{uuid.uuid4()}/{data.filename}"

        resume = Resume(user_id=user_id, name=data.name, s3_key=file_key, status="processing")
        self.db.add(resume)
        await self.db.commit()
        await self.db.refresh(resume)

        if settings.use_local_storage:
            # Return a local upload endpoint URL instead of a pre-signed S3 URL
            upload_url = f"http://localhost:8000/api/v1/resumes/local-upload/{resume.id}"
        else:
            upload_url = _s3_client().generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": settings.S3_BUCKET_NAME,
                    "Key": file_key,
                    "ContentType": "application/pdf",
                },
                ExpiresIn=settings.S3_PRESIGNED_URL_EXPIRY,
            )

        from app.workers.resume_tasks import process_resume_task
        task = process_resume_task.delay(str(resume.id), file_key)

        return resume, upload_url, task.id

    async def save_local_file(self, resume_id: uuid.UUID, user_id: uuid.UUID, file_bytes: bytes) -> None:
        resume = await self.get_resume(resume_id, user_id)
        local_path = os.path.join(settings.LOCAL_STORAGE_PATH, resume.s3_key)
        _ensure_local_dir(os.path.dirname(local_path))
        with open(local_path, "wb") as f:
            f.write(file_bytes)

    async def get_resume(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Resume:
        result = await self.db.execute(
            select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
        )
        resume = result.scalar_one_or_none()
        if not resume:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        return resume

    async def list_resumes(self, user_id: uuid.UUID) -> list[Resume]:
        result = await self.db.execute(
            select(Resume).where(Resume.user_id == user_id).order_by(Resume.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_resume(self, resume_id: uuid.UUID, user_id: uuid.UUID, data: ResumeUpdate) -> Resume:
        resume = await self.get_resume(resume_id, user_id)
        if data.name is not None:
            resume.name = data.name
        if data.is_primary is True:
            await self.db.execute(
                update(Resume)
                .where(Resume.user_id == user_id, Resume.id != resume_id)
                .values(is_primary=False)
            )
            resume.is_primary = True
        await self.db.commit()
        await self.db.refresh(resume)
        return resume

    async def delete_resume(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> None:
        resume = await self.get_resume(resume_id, user_id)
        if resume.s3_key:
            if settings.use_local_storage:
                local_path = os.path.join(settings.LOCAL_STORAGE_PATH, resume.s3_key)
                if os.path.exists(local_path):
                    shutil.rmtree(os.path.dirname(local_path), ignore_errors=True)
            else:
                try:
                    _s3_client().delete_object(Bucket=settings.S3_BUCKET_NAME, Key=resume.s3_key)
                except Exception:
                    pass
        await self.db.delete(resume)
        await self.db.commit()

    async def update_section(
        self, resume_id: uuid.UUID, user_id: uuid.UUID, section_type: str, data: ResumeSectionUpdate
    ) -> Resume:
        if section_type not in EDITABLE_SECTIONS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Section '{section_type}' is not editable")
        resume = await self.get_resume(resume_id, user_id)
        if not resume.structured_data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume has no structured data yet")

        # Store previous score for before/after comparison
        if resume.ats_score is not None:
            resume.prev_ats_score = resume.ats_score

        updated_data = dict(resume.structured_data)
        updated_data[section_type] = data.content
        resume.structured_data = updated_data
        resume.version = (resume.version or 1) + 1
        resume.status = "processing"

        await self.db.commit()
        await self.db.refresh(resume)

        # Re-trigger ATS scoring with updated data
        from app.workers.resume_tasks import rescore_resume_task
        rescore_resume_task.delay(str(resume.id))

        return resume

    async def get_status(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> dict:
        resume = await self.get_resume(resume_id, user_id)
        sections_found = []
        if resume.structured_data:
            data = resume.structured_data
            if data.get("experience"):
                sections_found.append("experience")
            if data.get("education"):
                sections_found.append("education")
            if data.get("skills"):
                sections_found.append("skills")
            if data.get("projects"):
                sections_found.append("projects")
            if data.get("summary"):
                sections_found.append("summary")

        return {
            "resume_id": resume.id,
            "status": resume.status,
            "ats_score": resume.ats_score,
            "sections_found": sections_found,
        }
