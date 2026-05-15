import uuid
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.schemas.resume import (
    ResumeUploadRequest, ResumeUploadResponse,
    ResumeStatusResponse, ResumeResponse, ResumeListResponse, ResumeUpdate, ResumeSectionUpdate,
)
from app.services.resume_service import ResumeService
from fastapi import status as http_status

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/upload", response_model=ResumeUploadResponse, status_code=http_status.HTTP_201_CREATED)
async def upload_resume(
    request: Request,
    data: ResumeUploadRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResumeService(db)
    resume, upload_url, task_id = await service.create_upload_url(current_user.id, data, base_url=str(request.base_url))
    return ResumeUploadResponse(
        resume_id=resume.id,
        upload_url=upload_url,
        task_id=task_id,
    )


@router.get("/upload/status/{resume_id}", response_model=ResumeStatusResponse)
async def get_upload_status(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResumeService(db)
    status_data = await service.get_status(resume_id, current_user.id)
    return ResumeStatusResponse(**status_data)


@router.get("", response_model=ResumeListResponse)
async def list_resumes(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResumeService(db)
    resumes = await service.list_resumes(current_user.id)
    return ResumeListResponse(resumes=resumes, total=len(resumes))


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResumeService(db)
    return await service.get_resume(resume_id, current_user.id)


@router.patch("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: uuid.UUID,
    data: ResumeUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResumeService(db)
    return await service.update_resume(resume_id, current_user.id, data)


@router.delete("/{resume_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResumeService(db)
    await service.delete_resume(resume_id, current_user.id)


@router.put("/local-upload/{resume_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def local_upload(
    resume_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Local-disk upload endpoint used when AWS S3 is not configured."""
    file_bytes = await request.body()
    service = ResumeService(db)
    resume = await service.save_local_file(resume_id, current_user.id, file_bytes)
    # Trigger processing AFTER file is saved (not before)
    from app.workers.resume_tasks import process_resume_task
    process_resume_task.delay(str(resume_id), resume.s3_key)


@router.get("/{resume_id}/export-pdf")
async def export_resume_pdf(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import Response
    from app.services.pdf_service import generate_resume_pdf
    resume = await ResumeService(db).get_resume(resume_id, current_user.id)
    # get_resume returns ResumeResponse schema; we need the ORM object
    from sqlalchemy import select as sa_select
    from app.models.resume import Resume as ResumeModel
    result = await db.execute(sa_select(ResumeModel).where(ResumeModel.id == resume_id))
    resume_obj = result.scalar_one_or_none()
    if not resume_obj:
        raise HTTPException(status_code=404, detail="Resume not found")

    file_bytes, content_type = generate_resume_pdf(resume_obj)
    ext = "pdf" if "pdf" in content_type else "txt"
    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in resume_obj.name)
    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.{ext}"'},
    )


@router.patch("/{resume_id}/sections/{section_type}", response_model=ResumeResponse)
async def update_section(
    resume_id: uuid.UUID,
    section_type: str,
    data: ResumeSectionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResumeService(db)
    return await service.update_section(resume_id, current_user.id, section_type, data)


@router.post("/{resume_id}/primary", response_model=ResumeResponse)
async def set_primary(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    service = ResumeService(db)
    return await service.update_resume(resume_id, current_user.id, ResumeUpdate(is_primary=True))
