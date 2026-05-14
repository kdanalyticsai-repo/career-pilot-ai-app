import uuid
from datetime import datetime
from pydantic import BaseModel


class TailorRequest(BaseModel):
    job_id: uuid.UUID
    resume_id: uuid.UUID | None = None  # defaults to primary resume


class TailoredResumeResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    base_resume_id: uuid.UUID
    tailored_sections: dict | None = None
    changes: dict | None = None
    keywords_added: list[str] = []
    ats_score_before: int | None = None
    ats_score_after: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InterviewPrepRequest(BaseModel):
    job_id: uuid.UUID


class InterviewPrepResponse(BaseModel):
    job_id: uuid.UUID
    behavioral_questions: list[dict] = []
    technical_questions: list[dict] = []
    questions_to_ask: list[str] = []
    prep_tips: list[str] = []
    role_research_points: list[str] = []


class CoverLetterRequest(BaseModel):
    job_id: uuid.UUID


class CoverLetterResponse(BaseModel):
    job_id: uuid.UUID
    subject_line: str
    cover_letter: str
    key_highlights: list[str] = []


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionOut(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[ChatMessageOut] = []

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    session_id: uuid.UUID | None = None  # None = create new session


class ChatResponse(BaseModel):
    session_id: uuid.UUID
    session_title: str
    reply: str
    messages: list[ChatMessageOut] = []
