import uuid
from datetime import datetime
from pydantic import BaseModel


class ResumeUploadRequest(BaseModel):
    filename: str
    name: str


class ResumeUploadResponse(BaseModel):
    resume_id: uuid.UUID
    upload_url: str
    task_id: str
    expires_in: int = 300


class ResumeStatusResponse(BaseModel):
    resume_id: uuid.UUID
    status: str  # processing | ready | failed
    ats_score: int | None = None
    sections_found: list[str] = []
    error: str | None = None


class ResumeSectionContent(BaseModel):
    data: dict


class ResumeResponse(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    ats_score: int | None
    prev_ats_score: int | None = None
    completeness_score: int | None = None
    ats_details: dict | None = None
    is_primary: bool
    version: int
    structured_data: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeListResponse(BaseModel):
    resumes: list[ResumeResponse]
    total: int


class ResumeUpdate(BaseModel):
    name: str | None = None
    is_primary: bool | None = None


class ResumeSectionUpdate(BaseModel):
    content: dict
