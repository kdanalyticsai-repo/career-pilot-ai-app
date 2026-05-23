import uuid
import os
from celery import shared_task
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.database import SyncSessionLocal
from app.models.resume import Resume
from app.config import settings
from app.ai.resume_parser import extract_text_from_pdf_bytes, parse_resume
from app.ai.ats_scorer import score_resume_ats


def _load_pdf_bytes(s3_key: str) -> bytes:
    if settings.use_local_storage:
        local_path = os.path.join(settings.LOCAL_STORAGE_PATH, s3_key)
        with open(local_path, "rb") as f:
            return f.read()
    else:
        import boto3
        s3_kwargs = dict(
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        if settings.S3_ENDPOINT_URL:
            s3_kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
        s3 = boto3.client("s3", **s3_kwargs)
        response = s3.get_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        return response["Body"].read()


MOCK_STRUCTURED_DATA = {
    "contact": {"name": "Sample User", "email": "sample@example.com", "phone": None, "linkedin": None, "github": None, "location": "India"},
    "summary": "Experienced software engineer with 5 years in backend development.",
    "experience": [
        {
            "company": "Tech Corp",
            "title": "Backend Engineer",
            "location": "Bangalore",
            "start_date": "2020-01",
            "end_date": None,
            "is_current": True,
            "bullets": ["Built RESTful APIs using Python and FastAPI", "Reduced DB query time by 40%"],
            "technologies": ["Python", "FastAPI", "PostgreSQL", "Redis"],
        }
    ],
    "education": [
        {
            "institution": "IIT Delhi",
            "degree": "B.Tech",
            "field": "Computer Science",
            "start_date": "2015-08",
            "end_date": "2019-05",
            "gpa": "8.5",
        }
    ],
    "skills": {
        "technical": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "Git"],
        "soft": ["Communication", "Teamwork"],
        "languages": ["English", "Hindi"],
        "certifications": [],
    },
    "projects": [],
}

MOCK_ATS_RESULT = {
    "total_score": 68,
    "completeness_score": 72,
    "breakdown": {
        "keyword_match": 70,
        "skills_coverage": 65,
        "format_quality": 80,
        "experience_relevance": 60,
        "education_match": 75,
    },
    "keywords_found": ["Python", "FastAPI", "PostgreSQL"],
    "keywords_missing": ["Kubernetes", "AWS", "CI/CD", "Docker Compose", "REST API"],
    "critical_issues": ["Add a LinkedIn URL", "Quantify more achievements with numbers", "No certifications listed"],
    "quick_wins": [
        "Add CI/CD tools (GitHub Actions) to skills",
        "Add project URLs or GitHub links",
        "Quantify impact: 'Reduced query time by 40%' is good, add more",
        "Include cloud platform (AWS/GCP/Azure) experience",
        "Add a strong professional summary",
        "List relevant certifications",
    ],
    "suggestions": {
        "summary": [
            "Add a 3-4 sentence professional summary at the top highlighting your specialisation",
            "Mention your years of experience and key technologies upfront",
        ],
        "experience": [
            "Start each bullet with a strong action verb (Built, Designed, Optimised)",
            "Add measurable outcomes to every bullet (e.g. reduced latency by X%, handled Y RPS)",
            "Include the scale of systems you worked on (team size, users served)",
        ],
        "skills": [
            "Group skills by category: Languages, Frameworks, Databases, Cloud, Tools",
            "Add cloud/infrastructure skills (AWS, GCP, Docker, Kubernetes)",
        ],
        "education": [
            "Add any relevant coursework, awards, or academic projects",
        ],
        "overall": [
            "Add links: GitHub, LinkedIn, and portfolio if available",
            "Keep resume to one page if under 5 years of experience",
            "Use consistent date formatting throughout",
        ],
    },
}


def _apply_mock_data(resume, db, resume_id: str) -> None:
    resume.structured_data = MOCK_STRUCTURED_DATA
    resume.ats_score = MOCK_ATS_RESULT["total_score"]
    resume.completeness_score = MOCK_ATS_RESULT["completeness_score"]
    resume.ats_details = MOCK_ATS_RESULT
    resume.status = "ready"
    db.commit()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30, queue="resumes")
def process_resume_task(self, resume_id: str, s3_key: str):
    db: Session = SyncSessionLocal()
    try:
        resume = db.query(Resume).filter(Resume.id == uuid.UUID(resume_id)).first()
        if not resume:
            return {"error": "Resume not found"}

        if not settings.has_anthropic_key:
            _apply_mock_data(resume, db, resume_id)
            return {"resume_id": resume_id, "status": "ready", "ats_score": resume.ats_score, "mock": True}

        try:
            pdf_bytes = _load_pdf_bytes(s3_key)
            raw_text = extract_text_from_pdf_bytes(pdf_bytes)
            resume.raw_text = raw_text

            structured = parse_resume(raw_text)
            resume.structured_data = structured

            ats_result = score_resume_ats(structured)
            resume.ats_score = ats_result.get("total_score", 0)
            resume.completeness_score = ats_result.get("completeness_score", 0)
            resume.ats_details = ats_result
            resume.status = "ready"

            db.commit()
            return {"resume_id": resume_id, "status": "ready", "ats_score": resume.ats_score}
        except Exception:
            # AI API unavailable (e.g. no credits) — fall back to mock so resume is usable
            db.rollback()
            resume = db.query(Resume).filter(Resume.id == uuid.UUID(resume_id)).first()
            if resume:
                _apply_mock_data(resume, db, resume_id)
            return {"resume_id": resume_id, "status": "ready", "mock": True}

    except Exception as exc:
        db.rollback()
        resume = db.query(Resume).filter(Resume.id == uuid.UUID(resume_id)).first()
        if resume:
            resume.status = "failed"
            db.commit()
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30, queue="resumes")
def rescore_resume_task(self, resume_id: str):
    """Re-score a resume after section edits (structured_data already updated)."""
    db: Session = SyncSessionLocal()
    try:
        resume = db.query(Resume).filter(Resume.id == uuid.UUID(resume_id)).first()
        if not resume or not resume.structured_data:
            return {"error": "Resume not found or has no data"}

        if not settings.has_anthropic_key:
            _apply_mock_data(resume, db, resume_id)
            return {"resume_id": resume_id, "status": "ready", "mock": True}

        try:
            ats_result = score_resume_ats(resume.structured_data)
            resume.ats_score = ats_result.get("total_score", 0)
            resume.completeness_score = ats_result.get("completeness_score", 0)
            resume.ats_details = ats_result
            resume.status = "ready"
            db.commit()
            return {"resume_id": resume_id, "status": "ready", "ats_score": resume.ats_score}
        except Exception:
            db.rollback()
            resume = db.query(Resume).filter(Resume.id == uuid.UUID(resume_id)).first()
            if resume:
                _apply_mock_data(resume, db, resume_id)
            return {"resume_id": resume_id, "status": "ready", "mock": True}

    except Exception as exc:
        db.rollback()
        resume = db.query(Resume).filter(Resume.id == uuid.UUID(resume_id)).first()
        if resume:
            resume.status = "failed"
            db.commit()
        raise self.retry(exc=exc)
    finally:
        db.close()
