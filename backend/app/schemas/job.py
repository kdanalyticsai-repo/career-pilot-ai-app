import uuid
from datetime import datetime
from pydantic import BaseModel


class JobResponse(BaseModel):
    id: uuid.UUID
    title: str
    company: str
    location: str
    description: str
    requirements: list[str] = []
    skills_required: list[str] = []
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str = "INR"
    job_type: str
    experience_level: str
    remote_type: str
    external_url: str | None = None
    posted_at: datetime
    # Enriched at query time
    match_score: int | None = None
    match_details: dict | None = None
    is_saved: bool = False
    is_applied: bool = False

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    jobs: list[JobResponse]
    total: int


class JobFilter(BaseModel):
    q: str | None = None
    location: str | None = None
    skills: str | None = None
    job_type: str | None = None
    experience_level: str | None = None
    remote_type: str | None = None
    min_match_score: int | None = None
    saved_only: bool = False


class ApplicationCreate(BaseModel):
    job_id: uuid.UUID
    resume_id: uuid.UUID | None = None
    notes: str | None = None
    next_action: str | None = None
    next_action_date: datetime | None = None


class ApplicationUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None
    next_action: str | None = None
    next_action_date: datetime | None = None


class ApplicationJobInfo(BaseModel):
    id: uuid.UUID
    title: str
    company: str
    location: str
    job_type: str

    model_config = {"from_attributes": True}


class ApplicationResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    resume_id: uuid.UUID | None = None
    status: str
    notes: str | None = None
    timeline: list[dict] = []
    next_action: str | None = None
    next_action_date: datetime | None = None
    applied_at: datetime
    updated_at: datetime
    job: ApplicationJobInfo | None = None

    model_config = {"from_attributes": True}


class ApplicationListResponse(BaseModel):
    applications: list[ApplicationResponse]
    total: int
