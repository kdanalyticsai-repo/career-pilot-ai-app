import uuid
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_features import ChatMessage

from app.dependencies import get_db, get_current_user, require_feature
from app.models.user import User
from app.schemas.ai_features import (
    TailorRequest, TailoredResumeResponse,
    InterviewPrepRequest, InterviewPrepResponse,
    CoverLetterRequest, CoverLetterResponse,
    ChatRequest, ChatResponse, ChatSessionOut, ChatMessageOut,
)
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/tailor", response_model=TailoredResumeResponse)
async def tailor_resume(
    data: TailorRequest,
    current_user: User = Depends(require_feature("tailor")),
    db: AsyncSession = Depends(get_db),
):
    return await AIService(db).tailor_resume(current_user.id, data.job_id, data.resume_id)


@router.post("/interview-prep", response_model=InterviewPrepResponse)
async def interview_prep(
    data: InterviewPrepRequest,
    current_user: User = Depends(require_feature("interview_prep")),
    db: AsyncSession = Depends(get_db),
):
    return await AIService(db).get_interview_prep(current_user.id, data.job_id)


@router.post("/cover-letter", response_model=CoverLetterResponse)
async def cover_letter(
    data: CoverLetterRequest,
    current_user: User = Depends(require_feature("cover_letter")),
    db: AsyncSession = Depends(get_db),
):
    return await AIService(db).get_cover_letter(current_user.id, data.job_id)


# Chat is Pro-only — no monthly limit, blocked entirely on free
@router.post("/chat", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    current_user: User = Depends(require_feature("chat")),
    db: AsyncSession = Depends(get_db),
):
    return await AIService(db).chat(current_user.id, data.message, data.session_id)


@router.get("/chat/sessions", response_model=list[ChatSessionOut])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sessions = await AIService(db).list_sessions(current_user.id)
    return [ChatSessionOut(
        id=s.id, title=s.title, created_at=s.created_at, updated_at=s.updated_at
    ) for s in sessions]


@router.get("/chat/sessions/{session_id}", response_model=ChatSessionOut)
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AIService(db)
    session = await svc.get_session(session_id, current_user.id)
    msgs_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = [ChatMessageOut.model_validate(m) for m in msgs_result.scalars().all()]
    return ChatSessionOut(
        id=session.id, title=session.title,
        created_at=session.created_at, updated_at=session.updated_at,
        messages=messages,
    )


@router.delete("/chat/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await AIService(db).delete_session(session_id, current_user.id)
