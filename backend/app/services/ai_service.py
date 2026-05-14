import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.resume import Resume
from app.models.job import Job
from app.models.ai_features import TailoredResume, ChatSession, ChatMessage
from app.schemas.ai_features import (
    TailoredResumeResponse, InterviewPrepResponse, CoverLetterResponse,
    ChatResponse, ChatMessageOut,
)
from app.ai.resume_tailor import tailor_resume
from app.ai.interview_coach import generate_interview_prep
from app.ai.cover_letter import generate_cover_letter
from app.ai.career_coach import chat_with_coach


class AIService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_primary_resume(self, user_id: uuid.UUID, resume_id: uuid.UUID | None = None) -> Resume:
        if resume_id:
            result = await self.db.execute(
                select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
            )
        else:
            result = await self.db.execute(
                select(Resume).where(Resume.user_id == user_id, Resume.is_primary == True)
            )
            if not result.scalar_one_or_none():
                result = await self.db.execute(
                    select(Resume).where(Resume.user_id == user_id).order_by(Resume.created_at.desc())
                )
        resume = result.scalar_one_or_none()
        if not resume:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resume found for this user")
        if resume.status != "ready":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume is still processing")
        return resume

    async def _get_job(self, job_id: uuid.UUID) -> Job:
        result = await self.db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        return job

    async def tailor_resume(self, user_id: uuid.UUID, job_id: uuid.UUID, resume_id: uuid.UUID | None) -> TailoredResumeResponse:
        resume = await self._get_primary_resume(user_id, resume_id)
        job = await self._get_job(job_id)

        # Check if already tailored for this job+resume combo
        existing = await self.db.execute(
            select(TailoredResume).where(
                TailoredResume.user_id == user_id,
                TailoredResume.job_id == job_id,
                TailoredResume.base_resume_id == resume.id,
            )
        )
        tailored = existing.scalar_one_or_none()
        if tailored:
            return TailoredResumeResponse.model_validate(tailored)

        data = resume.structured_data or {}
        result = tailor_resume(
            resume_data=data,
            job_title=job.title,
            job_company=job.company,
            job_skills=job.skills_required or [],
            job_description=job.description or "",
        )

        tailored = TailoredResume(
            user_id=user_id,
            base_resume_id=resume.id,
            job_id=job_id,
            original_sections={
                "summary": data.get("summary"),
                "experience": data.get("experience"),
                "skills": data.get("skills"),
            },
            tailored_sections=result.get("tailored_sections"),
            changes=result.get("changes"),
            keywords_added=result.get("keywords_added", []),
            ats_score_before=resume.ats_score,
        )
        self.db.add(tailored)
        await self.db.commit()
        await self.db.refresh(tailored)
        return TailoredResumeResponse.model_validate(tailored)

    async def get_interview_prep(self, user_id: uuid.UUID, job_id: uuid.UUID) -> InterviewPrepResponse:
        resume = await self._get_primary_resume(user_id)
        job = await self._get_job(job_id)

        data = resume.structured_data or {}
        candidate_skills = []
        s = data.get("skills", {})
        if isinstance(s, dict):
            candidate_skills = (s.get("technical") or []) + (s.get("soft") or [])
        candidate_titles = [exp.get("title", "") for exp in (data.get("experience") or [])[:3]]

        result = generate_interview_prep(
            job_title=job.title,
            job_company=job.company,
            job_skills=job.skills_required or [],
            experience_level=job.experience_level,
            job_description=job.description or "",
            candidate_skills=candidate_skills,
            candidate_titles=candidate_titles,
        )

        return InterviewPrepResponse(
            job_id=job_id,
            behavioral_questions=result.get("behavioral_questions", []),
            technical_questions=result.get("technical_questions", []),
            questions_to_ask=result.get("questions_to_ask", []),
            prep_tips=result.get("prep_tips", []),
            role_research_points=result.get("role_research_points", []),
        )

    async def get_cover_letter(self, user_id: uuid.UUID, job_id: uuid.UUID) -> CoverLetterResponse:
        resume = await self._get_primary_resume(user_id)
        job = await self._get_job(job_id)

        data = resume.structured_data or {}
        contact = data.get("contact", {}) or {}
        candidate_name = contact.get("name") or "Candidate"
        candidate_skills = []
        s = data.get("skills", {})
        if isinstance(s, dict):
            candidate_skills = s.get("technical") or []
        experience = data.get("experience") or []
        summary = data.get("summary") or ""

        result = generate_cover_letter(
            job_title=job.title,
            job_company=job.company,
            job_description=job.description or "",
            job_skills=job.skills_required or [],
            candidate_name=candidate_name,
            candidate_skills=candidate_skills,
            recent_experience=experience[:2],
            candidate_summary=summary,
        )

        return CoverLetterResponse(
            job_id=job_id,
            subject_line=result.get("subject_line", f"Application for {job.title}"),
            cover_letter=result.get("cover_letter", ""),
            key_highlights=result.get("key_highlights", []),
        )

    async def chat(self, user_id: uuid.UUID, message: str, session_id: uuid.UUID | None) -> ChatResponse:
        # Get or create session
        session = None
        if session_id:
            result = await self.db.execute(
                select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
            )
            session = result.scalar_one_or_none()

        if not session:
            session = ChatSession(user_id=user_id, title=message[:50])
            self.db.add(session)
            await self.db.flush()

        # Load existing messages (last 20 for context)
        msgs_result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(20)
        )
        existing_msgs = list(reversed(msgs_result.scalars().all()))

        # Build context from user's primary resume
        user_context = None
        try:
            resume = await self._get_primary_resume(user_id)
            data = resume.structured_data or {}
            contact = data.get("contact", {}) or {}
            skills = data.get("skills", {}) or {}
            user_context = (
                f"User's name: {contact.get('name', 'Unknown')}\n"
                f"ATS Score: {resume.ats_score}/100\n"
                f"Technical Skills: {', '.join((skills.get('technical') or [])[:10])}\n"
                f"Recent title: {(data.get('experience') or [{}])[0].get('title', 'Unknown')}"
            )
        except Exception:
            pass

        # Call coach
        claude_messages = [{"role": m.role, "content": m.content} for m in existing_msgs]
        claude_messages.append({"role": "user", "content": message})

        reply = chat_with_coach(claude_messages, user_context)

        # Persist both messages
        user_msg = ChatMessage(session_id=session.id, role="user", content=message)
        assistant_msg = ChatMessage(session_id=session.id, role="assistant", content=reply)
        self.db.add(user_msg)
        self.db.add(assistant_msg)

        # Update session title from first user message
        if len(existing_msgs) == 0:
            session.title = message[:60]

        await self.db.commit()
        await self.db.refresh(session)

        # Return fresh message list
        all_msgs = existing_msgs + [user_msg, assistant_msg]
        return ChatResponse(
            session_id=session.id,
            session_title=session.title,
            reply=reply,
            messages=[ChatMessageOut.model_validate(m) for m in all_msgs],
        )

    async def list_sessions(self, user_id: uuid.UUID) -> list[ChatSession]:
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc())
        )
        return list(result.scalars().all())

    async def get_session(self, session_id: uuid.UUID, user_id: uuid.UUID) -> ChatSession:
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session

    async def delete_session(self, session_id: uuid.UUID, user_id: uuid.UUID) -> None:
        session = await self.get_session(session_id, user_id)
        await self.db.delete(session)
        await self.db.commit()
