# CareerPilot — AI Resume + Job Match Mobile App
## End-to-End Design & Implementation Document
**Target Platform:** Android (first), iOS (Phase 5)
**Last Updated:** 2026-05-13

---

## Table of Contents
1. [Product Vision](#1-product-vision)
2. [Tech Stack Decision](#2-tech-stack-decision)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Backend API Design](#5-backend-api-design)
6. [AI Module Design](#6-ai-module-design)
7. [Mobile App Design](#7-mobile-app-design)
8. [Security Design](#8-security-design)
9. [Deployment & Infrastructure](#9-deployment--infrastructure)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Monetization Model](#12-monetization-model)
13. [Phased Development Roadmap](#13-phased-development-roadmap)

---

## 1. Product Vision

### 1.1 Problem Statement
Job seekers struggle to tailor their resume for every job, don't know which jobs they're actually qualified for, and have no feedback loop on why they're being rejected. Recruiters get flooded with irrelevant applications.

### 1.2 Solution
CareerPilot is an AI-powered mobile app that:
- Parses and structurally understands the user's resume
- Matches jobs from multiple sources against the user's profile
- Rewrites resume sections to maximize ATS (Applicant Tracking System) match score
- Provides personalized coaching and improvement suggestions
- Tracks all applications with status and analytics

### 1.3 Target Users
| Segment | Description |
|---------|-------------|
| Fresh Graduates | First job seekers who need guidance on resume writing |
| Career Switchers | People moving across domains needing resume repositioning |
| Active Job Seekers | People actively applying who need volume + quality |
| Passive Seekers | Employed people open to better opportunities |

### 1.4 Core Value Props
- **Smart Match Score** — Know your fit % before applying
- **One-click Resume Tailoring** — AI rewrites your resume for each job
- **ATS Optimization** — Pass automated screening filters
- **Application Tracker** — Never lose track of where you applied
- **Interview Coach** — AI-generated prep questions based on the job

---

## 2. Tech Stack Decision

### 2.1 Mobile Framework
**Choice: React Native (with Expo)**

| Option | Pro | Con |
|--------|-----|-----|
| React Native + Expo | Fast dev, OTA updates, large ecosystem, JS/TS | Slightly heavier than Flutter |
| Flutter | Excellent Android perf, single codebase | Dart language, smaller ecosystem |
| Native Android (Kotlin) | Best perf | No iOS reuse |

**Decision Rationale:** React Native with Expo gives us OTA updates (critical for AI-driven apps that need rapid iteration), TypeScript consistency with the backend, and a mature ecosystem for PDF/file handling.

### 2.2 Full Stack
```
Mobile:        React Native + Expo (TypeScript)
Navigation:    Expo Router (file-based)
State:         Zustand + React Query (TanStack Query)
UI Library:    React Native Paper + custom components
Forms:         React Hook Form + Zod validation

Backend:       FastAPI (Python) — best for AI/ML integrations
Auth:          FastAPI + JWT + Google OAuth
Task Queue:    Celery + Redis
Cache:         Redis
Search:        Elasticsearch (job search)

Database:
  Primary:     PostgreSQL (user data, jobs, applications)
  Vector DB:   Pinecone (resume embeddings for semantic matching)
  Cache:       Redis

AI:
  LLM:         Claude (claude-sonnet-4-6) via Anthropic SDK
  Embeddings:  text-embedding-3-large (OpenAI) or Claude embeddings
  PDF Parse:   pdfminer.six + custom extractor

Storage:       AWS S3 (resume files, profile pictures)
CDN:           CloudFront

Deployment:
  Backend:     AWS ECS (Fargate) or Render.com (MVP phase)
  DB:          AWS RDS PostgreSQL
  Cache:       AWS ElastiCache (Redis)
  Mobile:      Google Play Store (Expo EAS Build)

Monitoring:    Sentry (errors) + Datadog (metrics) + LogRocket (mobile)
CI/CD:         GitHub Actions + Expo EAS
```

---

## 3. System Architecture

### 3.1 High-Level Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        MOBILE APP (RN + Expo)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Auth    │  │  Resume  │  │  Jobs    │  │  Applications│   │
│  │  Screen  │  │  Builder │  │  Feed    │  │  Tracker     │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
└───────┼─────────────┼─────────────┼────────────────┼───────────┘
        │             │             │                │
        └─────────────┴─────────────┴────────────────┘
                              │ HTTPS/REST + WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (FastAPI)                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│  │  Auth     │  │  Resume   │  │  Job      │  │  AI        │  │
│  │  Service  │  │  Service  │  │  Service  │  │  Service   │  │
│  └───────────┘  └───────────┘  └───────────┘  └────────────┘  │
│                        Celery Task Queue                         │
└──────────┬──────────────────────────┬───────────────────────────┘
           │                          │
  ┌────────┴────────┐        ┌────────┴────────┐
  │   PostgreSQL    │        │   Redis Cache   │
  │   (Primary DB)  │        │   + Task Queue  │
  └─────────────────┘        └─────────────────┘
           │                          
  ┌────────┴────────┐        ┌─────────────────┐
  │   Pinecone      │        │   AWS S3        │
  │   (Vector DB)   │        │   (File Store)  │
  └─────────────────┘        └─────────────────┘
           │
  ┌────────┴────────┐
  │  Claude API     │
  │  (Anthropic)    │
  └─────────────────┘
```

### 3.2 Data Flow — Resume Upload & AI Processing
```
User uploads PDF
      │
      ▼
S3 Upload (pre-signed URL)
      │
      ▼
Celery Task: parse_resume(s3_key)
      │
      ├─► pdfminer extracts raw text
      │
      ├─► Claude API: structured extraction
      │     → name, email, phone
      │     → work_experience[]
      │     → education[]
      │     → skills[]
      │     → projects[]
      │
      ├─► Generate embedding (resume text)
      │     → Store in Pinecone
      │
      └─► Store structured JSON in PostgreSQL
            → Notify mobile via WebSocket
```

### 3.3 Data Flow — Job Matching
```
Scheduled Celery Beat: scrape_jobs() [every 6 hours]
      │
      ▼
Job Scrapers (LinkedIn, Indeed, Naukri, RemoteOK)
      │
      ▼
Normalize job data → PostgreSQL jobs table
      │
      ▼
Generate job embedding → Pinecone

When user opens Jobs Feed:
      │
      ▼
API: GET /jobs/feed
      │
      ├─► Fetch user resume embedding from Pinecone
      ├─► Vector similarity search → top 100 candidate jobs
      ├─► Re-rank with Claude (skills gap, title match, location)
      └─► Return scored + ranked jobs with match %
```

---

## 4. Database Schema

### 4.1 PostgreSQL Tables

```sql
-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255),
    phone           VARCHAR(20),
    avatar_url      TEXT,
    google_id       VARCHAR(255) UNIQUE,
    subscription    VARCHAR(20) DEFAULT 'free', -- free | pro | enterprise
    onboarded       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Resumes
CREATE TABLE resumes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,  -- "My Main Resume", "Data Science Resume"
    s3_key          TEXT,                   -- original PDF
    raw_text        TEXT,                   -- extracted text
    structured_data JSONB,                  -- AI-parsed structured resume
    embedding_id    VARCHAR(255),           -- Pinecone vector ID
    ats_score       INTEGER,                -- 0-100
    is_primary      BOOLEAN DEFAULT false,
    version         INTEGER DEFAULT 1,
    status          VARCHAR(20) DEFAULT 'processing', -- processing | ready | failed
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Resume Sections (flattened for easy editing)
CREATE TABLE resume_sections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id       UUID REFERENCES resumes(id) ON DELETE CASCADE,
    section_type    VARCHAR(50), -- experience | education | skills | project | summary
    position        INTEGER,     -- ordering
    content         JSONB,       -- section-specific fields
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs
CREATE TABLE jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id     VARCHAR(255),           -- source job ID
    source          VARCHAR(50),            -- linkedin | indeed | naukri | remoteok
    title           VARCHAR(255) NOT NULL,
    company         VARCHAR(255) NOT NULL,
    location        VARCHAR(255),
    job_type        VARCHAR(50),            -- full-time | part-time | contract | remote
    salary_min      INTEGER,
    salary_max      INTEGER,
    salary_currency VARCHAR(10) DEFAULT 'INR',
    description     TEXT,
    requirements    TEXT,
    skills_required TEXT[],
    apply_url       TEXT,
    embedding_id    VARCHAR(255),           -- Pinecone vector ID
    posted_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Job Matches (pre-computed, refreshed daily)
CREATE TABLE job_matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id          UUID REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id       UUID REFERENCES resumes(id) ON DELETE SET NULL,
    match_score     NUMERIC(5,2),           -- 0.00 - 100.00
    skills_matched  TEXT[],
    skills_missing  TEXT[],
    match_reasons   JSONB,                  -- AI explanation
    computed_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, job_id, resume_id)
);

-- Applications
CREATE TABLE applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
    resume_id       UUID REFERENCES resumes(id) ON DELETE SET NULL,
    tailored_resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    status          VARCHAR(50) DEFAULT 'saved',
                    -- saved | applied | phone_screen | interview | offer | rejected | withdrawn
    applied_at      TIMESTAMPTZ,
    notes           TEXT,
    cover_letter    TEXT,
    next_action     VARCHAR(255),
    next_action_date DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Application Events (timeline)
CREATE TABLE application_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  UUID REFERENCES applications(id) ON DELETE CASCADE,
    event_type      VARCHAR(50),   -- status_change | note_added | interview_scheduled
    old_status      VARCHAR(50),
    new_status      VARCHAR(50),
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- AI Tailored Resumes
CREATE TABLE tailored_resumes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    base_resume_id  UUID REFERENCES resumes(id),
    job_id          UUID REFERENCES jobs(id),
    tailored_content JSONB,        -- modified sections
    ats_score_before INTEGER,
    ats_score_after  INTEGER,
    s3_key          TEXT,          -- generated PDF
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences
CREATE TABLE user_preferences (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    desired_roles   TEXT[],
    preferred_locations TEXT[],
    remote_preference VARCHAR(20), -- remote | hybrid | onsite | any
    min_salary      INTEGER,
    job_types       TEXT[],
    industries      TEXT[],
    experience_level VARCHAR(20),  -- entry | mid | senior | lead | executive
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50),   -- new_match | application_update | tip
    title           VARCHAR(255),
    body            TEXT,
    data            JSONB,
    is_read         BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_source ON jobs(source, external_id);
CREATE INDEX idx_jobs_active ON jobs(is_active, posted_at DESC);
CREATE INDEX idx_job_matches_user ON job_matches(user_id, match_score DESC);
CREATE INDEX idx_applications_user ON applications(user_id, status, created_at DESC);
CREATE INDEX idx_resumes_user ON resumes(user_id, is_primary);
```

---

## 5. Backend API Design

### 5.1 Project Structure (FastAPI)
```
backend/
├── app/
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings (pydantic-settings)
│   ├── database.py             # SQLAlchemy async engine
│   ├── dependencies.py         # Auth, DB session DI
│   │
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── resumes.py
│   │   │   ├── jobs.py
│   │   │   ├── applications.py
│   │   │   ├── ai.py
│   │   │   └── notifications.py
│   │
│   ├── models/                 # SQLAlchemy ORM models
│   ├── schemas/                # Pydantic schemas (request/response)
│   ├── services/               # Business logic
│   │   ├── auth_service.py
│   │   ├── resume_service.py
│   │   ├── job_service.py
│   │   ├── matching_service.py
│   │   └── ai_service.py
│   │
│   ├── ai/
│   │   ├── claude_client.py    # Anthropic SDK wrapper
│   │   ├── resume_parser.py    # PDF → structured data
│   │   ├── job_matcher.py      # Embedding + scoring
│   │   ├── resume_tailor.py    # AI rewrite engine
│   │   ├── ats_scorer.py       # ATS simulation
│   │   └── interview_coach.py  # Question generation
│   │
│   ├── workers/                # Celery tasks
│   │   ├── celery_app.py
│   │   ├── resume_tasks.py
│   │   ├── job_tasks.py
│   │   └── matching_tasks.py
│   │
│   └── scrapers/              # Job scrapers
│       ├── base.py
│       ├── linkedin.py
│       ├── indeed.py
│       └── naukri.py
│
├── alembic/                    # DB migrations
├── tests/
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

### 5.2 API Endpoints

#### Auth
```
POST   /api/v1/auth/register          # Email + password signup
POST   /api/v1/auth/login             # Email + password login
POST   /api/v1/auth/google            # Google OAuth login
POST   /api/v1/auth/refresh           # Refresh JWT token
POST   /api/v1/auth/logout            # Invalidate token
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

#### Users
```
GET    /api/v1/users/me               # Current user profile
PATCH  /api/v1/users/me              # Update profile
GET    /api/v1/users/me/preferences  # Job preferences
PUT    /api/v1/users/me/preferences  # Update preferences
DELETE /api/v1/users/me              # Delete account
```

#### Resumes
```
GET    /api/v1/resumes                # List user resumes
POST   /api/v1/resumes/upload        # Upload PDF → returns presigned S3 URL + task_id
GET    /api/v1/resumes/{id}          # Get resume details
PATCH  /api/v1/resumes/{id}         # Update resume name / sections
DELETE /api/v1/resumes/{id}         # Delete resume
POST   /api/v1/resumes/{id}/primary  # Set as primary resume
GET    /api/v1/resumes/{id}/score    # ATS score breakdown
GET    /api/v1/resumes/{id}/suggestions # AI improvement tips
POST   /api/v1/resumes/{id}/tailor  # Tailor resume for a job_id
GET    /api/v1/resumes/upload/status/{task_id} # Processing status
```

#### Jobs
```
GET    /api/v1/jobs                   # Job feed (paginated, filtered)
GET    /api/v1/jobs/{id}             # Job detail
GET    /api/v1/jobs/matches          # AI-matched jobs for current user
GET    /api/v1/jobs/saved            # User's saved jobs
POST   /api/v1/jobs/{id}/save        # Save/unsave job
GET    /api/v1/jobs/{id}/match       # Match score for specific job
GET    /api/v1/jobs/search?q=...     # Full-text search
```

#### Applications
```
GET    /api/v1/applications          # List applications (with filters)
POST   /api/v1/applications         # Create application (from saved job)
GET    /api/v1/applications/{id}    # Application detail + timeline
PATCH  /api/v1/applications/{id}   # Update status, notes
DELETE /api/v1/applications/{id}   # Delete application
GET    /api/v1/applications/stats   # Analytics (funnel, by status)
```

#### AI
```
POST   /api/v1/ai/resume/analyze    # Trigger full resume analysis
POST   /api/v1/ai/resume/improve    # AI suggestions for a section
POST   /api/v1/ai/interview/prep    # Generate interview Q&A for a job
POST   /api/v1/ai/cover-letter      # Generate cover letter
POST   /api/v1/ai/chat              # General career coaching chat (streaming)
```

#### Notifications
```
GET    /api/v1/notifications         # List notifications
PATCH  /api/v1/notifications/read   # Mark all read
PATCH  /api/v1/notifications/{id}/read
POST   /api/v1/notifications/device  # Register FCM device token
```

### 5.3 Request/Response Examples

**Upload Resume:**
```json
// POST /api/v1/resumes/upload
Request: { "filename": "my_resume.pdf", "name": "Software Engineer Resume" }
Response: {
  "upload_url": "https://s3.amazonaws.com/...presigned...",
  "resume_id": "uuid",
  "task_id": "celery-task-uuid",
  "expires_in": 300
}

// GET /api/v1/resumes/upload/status/{task_id}
Response: {
  "status": "ready",   // processing | ready | failed
  "resume_id": "uuid",
  "ats_score": 72,
  "sections_found": ["summary", "experience", "education", "skills"]
}
```

**Job Feed:**
```json
// GET /api/v1/jobs/matches?page=1&limit=20
Response: {
  "jobs": [{
    "id": "uuid",
    "title": "Senior Backend Engineer",
    "company": "Razorpay",
    "location": "Bangalore",
    "job_type": "full-time",
    "salary_min": 2500000,
    "salary_max": 4000000,
    "match_score": 87.4,
    "skills_matched": ["Python", "FastAPI", "PostgreSQL"],
    "skills_missing": ["Kubernetes"],
    "posted_at": "2026-05-10T00:00:00Z",
    "is_saved": false
  }],
  "total": 143,
  "page": 1
}
```

---

## 6. AI Module Design

### 6.1 Resume Parser (Claude)

**Input:** Raw PDF text (extracted by pdfminer)
**Output:** Structured JSON

```python
RESUME_PARSE_PROMPT = """
You are an expert resume parser. Extract the following structured data from this resume text.
Return ONLY valid JSON matching this exact schema:

{
  "contact": {
    "name": str,
    "email": str,
    "phone": str,
    "linkedin": str | null,
    "github": str | null,
    "location": str | null
  },
  "summary": str | null,
  "experience": [
    {
      "company": str,
      "title": str,
      "location": str | null,
      "start_date": "YYYY-MM" | null,
      "end_date": "YYYY-MM" | null,
      "is_current": bool,
      "bullets": [str],
      "technologies": [str]
    }
  ],
  "education": [
    {
      "institution": str,
      "degree": str,
      "field": str | null,
      "start_date": "YYYY-MM" | null,
      "end_date": "YYYY-MM" | null,
      "gpa": str | null
    }
  ],
  "skills": {
    "technical": [str],
    "soft": [str],
    "languages": [str],
    "certifications": [str]
  },
  "projects": [
    {
      "name": str,
      "description": str,
      "technologies": [str],
      "url": str | null
    }
  ]
}

Resume text:
{resume_text}
"""
```

**Implementation:**
```python
# ai/resume_parser.py
import anthropic

client = anthropic.Anthropic()

async def parse_resume(raw_text: str) -> dict:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system="You are an expert resume parser. Return only valid JSON.",
        messages=[{
            "role": "user",
            "content": RESUME_PARSE_PROMPT.format(resume_text=raw_text)
        }]
    )
    return json.loads(message.content[0].text)
```

### 6.2 ATS Scorer

ATS scoring simulates how Applicant Tracking Systems evaluate resumes against job descriptions.

**Scoring Dimensions (100 points total):**
| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Keyword Match | 35% | Job keywords present in resume |
| Skills Coverage | 25% | Required skills found |
| Format Quality | 15% | Clean structure, no tables/graphics |
| Experience Relevance | 15% | Title/role alignment |
| Education Match | 10% | Degree requirements met |

```python
async def compute_ats_score(resume: dict, job_description: str) -> dict:
    prompt = f"""
    Score this resume against the job description on a scale of 0-100.
    
    Return JSON:
    {{
      "total_score": int,
      "breakdown": {{
        "keyword_match": int,
        "skills_coverage": int,
        "format_quality": int,
        "experience_relevance": int,
        "education_match": int
      }},
      "keywords_found": [str],
      "keywords_missing": [str],
      "critical_issues": [str],
      "quick_wins": [str]
    }}
    
    Job Description: {job_description}
    Resume: {json.dumps(resume)}
    """
    # Call Claude with prompt caching for repeated job descriptions
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=[{
            "type": "text",
            "text": "You are an ATS expert. Return only valid JSON.",
            "cache_control": {"type": "ephemeral"}
        }],
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(message.content[0].text)
```

### 6.3 Resume Tailor Engine

Takes a base resume + job description and rewrites bullet points to maximize match score.

```python
async def tailor_resume(
    resume: dict,
    job: dict,
    missing_keywords: list[str]
) -> dict:
    prompt = f"""
    You are an expert resume writer. Rewrite the resume to better match this job.
    
    Rules:
    1. Do NOT fabricate experience or skills the candidate doesn't have
    2. Reorder and emphasize existing experience relevant to the job
    3. Naturally incorporate missing keywords where truthful
    4. Strengthen weak bullet points with stronger action verbs and metrics
    5. Rewrite the summary to align with the job title
    
    Job Title: {job['title']}
    Company: {job['company']}
    Key Requirements: {job['requirements']}
    Missing Keywords to incorporate: {missing_keywords}
    
    Original Resume: {json.dumps(resume)}
    
    Return the modified resume in the SAME JSON structure.
    For each changed section, also return a "changes" field explaining what was modified and why.
    """
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8096,
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(message.content[0].text)
```

### 6.4 Job Matching (Vector + Re-Rank)

Two-stage matching for accuracy + speed:

**Stage 1 — Fast Vector Search (Pinecone)**
```python
from pinecone import Pinecone

pc = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pc.Index("careerpilot-jobs")

async def find_candidate_jobs(resume_embedding: list[float], top_k: int = 100):
    results = index.query(
        vector=resume_embedding,
        top_k=top_k,
        include_metadata=True
    )
    return results.matches
```

**Stage 2 — Claude Re-Ranking**
```python
async def rerank_jobs(user_profile: dict, candidate_jobs: list[dict]) -> list[dict]:
    # Batch re-rank top 20 from vector results
    prompt = f"""
    Given this candidate profile and list of jobs, score each job 0-100 for fit.
    Consider: skills match, experience level, location preference, salary expectations.
    
    Candidate: {json.dumps(user_profile)}
    Jobs: {json.dumps(candidate_jobs[:20])}
    
    Return JSON array: [{{"job_id": str, "score": int, "reasons": [str], "missing": [str]}}]
    """
    # ... Claude call
```

### 6.5 Interview Coach

```python
async def generate_interview_prep(job: dict, resume: dict) -> dict:
    prompt = f"""
    Generate interview preparation for this candidate applying to this job.
    
    Return JSON:
    {{
      "behavioral_questions": [
        {{"question": str, "why_asked": str, "sample_answer_framework": str}}
      ],
      "technical_questions": [
        {{"question": str, "topic": str, "difficulty": "easy|medium|hard"}}
      ],
      "questions_to_ask_them": [str],
      "prep_tips": [str],
      "role_research_points": [str]
    }}
    
    Job: {json.dumps(job)}
    Candidate Resume: {json.dumps(resume)}
    """
```

### 6.6 Career Coaching Chat (Streaming)

```python
# Streaming endpoint for real-time chat
async def stream_coaching_response(user_message: str, context: dict):
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=CAREER_COACH_SYSTEM_PROMPT,
        messages=[
            *context["history"],
            {"role": "user", "content": user_message}
        ]
    ) as stream:
        for text in stream.text_stream:
            yield text
```

---

## 7. Mobile App Design

### 7.1 Project Structure (React Native + Expo)
```
mobile/
├── app/                         # Expo Router file-based routing
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── onboarding/
│   │       ├── step1-profile.tsx
│   │       ├── step2-preferences.tsx
│   │       └── step3-resume.tsx
│   │
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigator
│   │   ├── index.tsx            # Home / Dashboard
│   │   ├── jobs.tsx             # Job feed
│   │   ├── resume.tsx           # Resume management
│   │   ├── applications.tsx     # Application tracker
│   │   └── profile.tsx          # Profile & settings
│   │
│   ├── jobs/
│   │   ├── [id].tsx             # Job detail
│   │   └── search.tsx
│   │
│   ├── resume/
│   │   ├── [id].tsx             # Resume detail + edit
│   │   ├── [id]/tailor.tsx      # Tailor for a job
│   │   └── upload.tsx
│   │
│   └── applications/
│       └── [id].tsx             # Application detail
│
├── components/
│   ├── ui/                      # Base components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── ProgressBar.tsx
│   │   └── SkeletonLoader.tsx
│   │
│   ├── resume/
│   │   ├── ResumeCard.tsx
│   │   ├── ATSScoreRing.tsx
│   │   ├── SectionEditor.tsx
│   │   └── SkillsGrid.tsx
│   │
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   ├── MatchScoreBadge.tsx
│   │   ├── SkillsMatch.tsx
│   │   └── JobFilter.tsx
│   │
│   └── applications/
│       ├── ApplicationCard.tsx
│       ├── StatusTimeline.tsx
│       └── KanbanBoard.tsx
│
├── stores/                      # Zustand state
│   ├── authStore.ts
│   ├── resumeStore.ts
│   └── jobStore.ts
│
├── hooks/                       # React Query hooks
│   ├── useJobs.ts
│   ├── useResumes.ts
│   ├── useApplications.ts
│   └── useAI.ts
│
├── services/
│   ├── api.ts                   # Axios client
│   ├── auth.ts
│   └── storage.ts               # SecureStore wrapper
│
├── constants/
│   ├── theme.ts                 # Colors, typography, spacing
│   └── config.ts
│
└── utils/
    ├── formatters.ts
    └── validators.ts
```

### 7.2 Screen Designs & User Flows

#### Onboarding Flow
```
Splash → Login/Register → Onboarding Step 1 (Profile)
  → Step 2 (Job Preferences) → Step 3 (Upload Resume) → Home
```

#### Home Dashboard
```
┌─────────────────────────────────┐
│ Good morning, Sunil 👋           │
│                                  │
│ ┌────────────────────────────┐  │
│ │  📄 Your Resume Health     │  │
│ │  ATS Score: 74/100  ████░  │  │
│ │  3 improvements available  │  │
│ └────────────────────────────┘  │
│                                  │
│ ┌────────────────────────────┐  │
│ │  🎯 Top Matches Today      │  │
│ │  12 new jobs match 80%+    │  │
│ │  [View Matches]            │  │
│ └────────────────────────────┘  │
│                                  │
│ ┌────────────────────────────┐  │
│ │  📊 Application Funnel     │  │
│ │  Applied: 8  Interview: 2  │  │
│ │  Offer: 0   Rejected: 3    │  │
│ └────────────────────────────┘  │
│                                  │
│  Recent Activity                 │
│  ● Razorpay viewed your profile │
│  ● Interview with Zepto on Thu  │
└─────────────────────────────────┘
```

#### Job Feed
```
┌─────────────────────────────────┐
│  Jobs    [Filter] [Sort]         │
│  ─────────────────────────────  │
│  Showing 143 matches            │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Senior Backend Engineer  │   │
│  │ Razorpay • Bangalore     │   │
│  │ ₹25-40 LPA • Full-time  │   │
│  │                          │   │
│  │ Match: ██████████ 87%    │   │
│  │ ✓ Python  ✓ FastAPI      │   │
│  │ ✗ Kubernetes             │   │
│  │                          │   │
│  │ [Apply]     [Save] [Tailor]  │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Backend Engineer         │   │
│  │ CRED • Remote            │   │
│  │ ₹18-28 LPA • Full-time  │   │
│  │ Match: ████████░░ 76%    │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

#### Resume ATS Score Screen
```
┌─────────────────────────────────┐
│  ← My Resume                    │
│                                  │
│         74                       │
│      ●●●●●●●●░░                 │
│     ATS Score / 100              │
│                                  │
│  Breakdown                       │
│  Keyword Match    ████████░ 80%  │
│  Skills Coverage  ███████░░ 70%  │
│  Format Quality   █████████ 90%  │
│  Experience Rel.  ██████░░░ 60%  │
│  Education Match  █████████ 85%  │
│                                  │
│  ⚡ Quick Wins                   │
│  • Add "CI/CD" to skills        │
│  • Quantify 2 bullet points     │
│  • Add LinkedIn URL             │
│                                  │
│  [Improve with AI]               │
└─────────────────────────────────┘
```

### 7.3 Key State Management

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

// stores/resumeStore.ts
interface ResumeState {
  resumes: Resume[];
  activeResume: Resume | null;
  uploadProgress: number;
  setActiveResume: (id: string) => void;
  uploadResume: (file: DocumentResult) => Promise<void>;
}
```

### 7.4 API Integration Layer

```typescript
// services/api.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30000,
});

// Auto-attach JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().refreshToken();
      return api(error.config);
    }
    return Promise.reject(error);
  }
);

// hooks/useJobs.ts  
export function useJobMatches(page = 1) {
  return useQuery({
    queryKey: ['jobs', 'matches', page],
    queryFn: () => api.get(`/jobs/matches?page=${page}&limit=20`).then(r => r.data),
    staleTime: 5 * 60 * 1000,  // 5 min
  });
}
```

---

## 8. Security Design

### 8.1 Authentication & Authorization
- **JWT tokens:** Access token (15 min TTL) + Refresh token (7 days, stored in DB)
- **Google OAuth:** via `expo-auth-session` on mobile, Google token verified server-side
- **Password hashing:** bcrypt with cost factor 12
- **Row-level isolation:** Every DB query scoped to `user_id` from JWT

### 8.2 Data Security
- **Resume files:** Stored in private S3 bucket, accessed via pre-signed URLs (5 min TTL)
- **Sensitive data:** No PII logged in application logs
- **Database:** RDS with encryption at rest, private subnet (no public access)
- **API secrets:** AWS Secrets Manager (not env files in production)
- **TLS:** All traffic HTTPS only; HSTS enabled

### 8.3 Rate Limiting
```python
# Per user rate limits (Redis-backed)
RATE_LIMITS = {
    "ai_tailor":      "5/hour",   # Pro: 50/hour
    "ai_chat":        "20/hour",  # Pro: unlimited
    "job_search":     "100/hour",
    "resume_upload":  "10/day",
}
```

### 8.4 Input Validation
- All request bodies validated with Pydantic v2 schemas
- PDF files: size limit 10MB, MIME type check, virus scan (ClamAV)
- SQL injection: prevented by SQLAlchemy ORM (parameterized queries)
- CORS: whitelist only app bundle ID + web domain

---

## 9. Deployment & Infrastructure

### 9.1 Environment Strategy
| Environment | Purpose | Infra |
|------------|---------|-------|
| local | Development | Docker Compose |
| staging | QA & testing | Render.com (free tier) |
| production | Live users | AWS ECS Fargate |

### 9.2 Production Infrastructure (AWS)
```
VPC
├── Public Subnet
│   └── ALB (Application Load Balancer)
│
├── Private Subnet - App
│   ├── ECS Fargate: API containers (auto-scaled)
│   └── ECS Fargate: Celery workers (auto-scaled)
│
├── Private Subnet - Data
│   ├── RDS PostgreSQL (Multi-AZ)
│   └── ElastiCache Redis (cluster)
│
└── S3 + CloudFront (resume storage, CDN)
```

### 9.3 Docker Setup

**docker-compose.yml (local dev):**
```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/careerpilot
      REDIS_URL: redis://redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on: [db, redis]
    volumes: ["./backend:/app"]

  worker:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/careerpilot
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: careerpilot
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

### 9.4 Android App Deployment (Expo EAS)
```bash
# Build for Google Play
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android

# OTA Update (no Play Store review needed for JS changes)
eas update --branch production --message "Fix job feed performance"
```

**EAS Build Profiles (eas.json):**
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

## 10. CI/CD Pipeline

### 10.1 GitHub Actions Workflows

**Backend CI (`.github/workflows/backend-ci.yml`):**
```yaml
name: Backend CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: test }
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements.txt
      - run: pytest tests/ --cov=app --cov-report=xml
      - run: ruff check app/
      - run: mypy app/

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Render
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
```

**Mobile CI (`.github/workflows/mobile-ci.yml`):**
```yaml
name: Mobile CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm test

  build-android:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }
      - run: eas build --platform android --non-interactive
```

---

## 11. Monitoring & Observability

### 11.1 Error Tracking
- **Sentry:** Backend (Python SDK) + Mobile (Expo/React Native SDK)
- Alert channels: Slack `#alerts` for P1 errors
- Performance: Track API p50/p95/p99 latency per endpoint

### 11.2 Key Metrics (Datadog)
```
Business Metrics:
  - Daily Active Users (DAU)
  - Resumes uploaded / day
  - AI tailoring requests / day
  - Job applications created / day
  - Match score distribution

Technical Metrics:
  - API latency (target: p95 < 500ms)
  - Claude API latency + cost / request
  - Celery task queue depth
  - DB connection pool utilization
  - Cache hit rate (target: > 80%)
```

### 11.3 Alerts
| Alert | Threshold | Action |
|-------|-----------|--------|
| API error rate | > 1% for 5 min | Page on-call |
| API p95 latency | > 2s for 5 min | Page on-call |
| Celery queue depth | > 500 tasks | Auto-scale workers |
| DB CPU | > 80% for 10 min | Investigate + scale |
| Claude API errors | > 5% | Fallback or notify |

---

## 12. Monetization Model

### 12.1 Pricing Tiers
| Feature | Free | Pro (₹499/mo) | Enterprise |
|---------|------|---------------|------------|
| Resume uploads | 1 | 5 | Unlimited |
| AI Tailoring | 3/month | Unlimited | Unlimited |
| Job matches | 20/day | Unlimited | Unlimited |
| Interview prep | 2/month | Unlimited | Unlimited |
| ATS analysis | Basic | Full breakdown | Full |
| AI Chat | 10 msg/day | Unlimited | Unlimited |
| Application tracking | 10 | Unlimited | Unlimited |
| Export PDF | No | Yes | Yes |

### 12.2 Revenue Streams
1. **Subscription (Primary):** Pro tier via Google Play In-App Purchase
2. **Credits System:** Buy AI tailoring credits à la carte
3. **B2B/Campus:** Bulk licenses for colleges and placement cells
4. **Recruiter Access (Phase 5):** Companies pay to search candidate pool

### 12.3 Google Play Integration
```typescript
// Using expo-iap for in-app purchases
import { initConnection, getSubscriptions, requestSubscription } from 'expo-iap';

const PRODUCT_IDS = {
  pro_monthly: 'careerpilot_pro_monthly',
  pro_yearly: 'careerpilot_pro_yearly',
};
```

---

## 13. Phased Development Roadmap

---

### PHASE 1 — Foundation (Weeks 1–4)
**Goal:** Working backend + Auth + Resume upload + basic parsing

#### Backend Tasks
- [ ] Initialize FastAPI project with folder structure
- [ ] Set up PostgreSQL with SQLAlchemy async ORM
- [ ] Run Alembic migrations for core tables (users, resumes)
- [ ] Implement JWT auth: register, login, refresh, logout
- [ ] Implement Google OAuth endpoint
- [ ] S3 integration: pre-signed upload URLs
- [ ] pdfminer PDF text extraction
- [ ] Claude API resume parser (structured JSON extraction)
- [ ] Celery + Redis task queue for async parsing
- [ ] Resume upload status polling endpoint
- [ ] Docker Compose for local dev
- [ ] Basic unit tests for auth + resume parsing

#### Mobile Tasks
- [ ] Initialize Expo project with TypeScript
- [ ] Install & configure: Expo Router, React Query, Zustand, Axios
- [ ] Set up theme (colors, typography, spacing constants)
- [ ] Auth screens: Login, Register (email + Google)
- [ ] Secure token storage (expo-secure-store)
- [ ] Onboarding flow: Profile → Preferences → Resume upload
- [ ] Document picker for PDF upload (expo-document-picker)
- [ ] Upload progress indicator + polling for parse completion
- [ ] Resume list screen with basic card UI

#### Deliverable
> User can register, upload a PDF resume, and see it parsed into structured sections.

---

### PHASE 2 — Resume Intelligence (Weeks 5–7)
**Goal:** ATS scoring, AI improvement suggestions, resume editing

#### Backend Tasks
- [ ] ATS scorer: keyword extraction + scoring against job keywords
- [ ] Claude integration: resume improvement suggestions per section
- [ ] Resume sections CRUD API (edit individual sections)
- [ ] Resume versioning (save edits as new version)
- [ ] Multiple resume support (up to 5 for Pro)
- [ ] Resume completeness score

#### Mobile Tasks
- [ ] Resume detail screen with section breakdown
- [ ] ATS Score ring visualization with animated progress
- [ ] Score breakdown by dimension
- [ ] "Quick Wins" improvement list with one-tap AI improvement
- [ ] Section editor: edit work experience bullets, skills, summary
- [ ] Resume switcher (set primary resume)
- [ ] Before/after ATS score comparison

#### Deliverable
> User can see their ATS score, understand gaps, and use AI to improve individual sections.

---

### PHASE 3 — Job Feed & Matching (Weeks 8–12)
**Goal:** Scraped jobs + AI matching + saved jobs + application tracking

#### Backend Tasks
- [ ] Job data model + migrations
- [ ] Job scrapers: LinkedIn Jobs API / Scraper, Indeed, Naukri (start with 1-2)
- [ ] Celery Beat: scheduled job refresh every 6 hours
- [ ] Pinecone setup: resume + job embeddings pipeline
- [ ] Vector similarity search for candidate jobs
- [ ] Claude re-ranking for top matches
- [ ] Match score storage (job_matches table)
- [ ] Job search with Elasticsearch (or PostgreSQL full-text search to start)
- [ ] Save/unsave job endpoint
- [ ] Job filtering: location, salary, type, date

#### Mobile Tasks
- [ ] Jobs tab: matched jobs feed with match score badges
- [ ] Job detail screen: full description + skills match breakdown
- [ ] Save job button with optimistic UI
- [ ] Filter/sort bottom sheet
- [ ] Job search screen
- [ ] Applications tab: list of tracked applications
- [ ] Create application from job detail
- [ ] Application status update (Kanban-style drag or dropdown)
- [ ] Application detail: timeline, notes, next action reminder

#### Deliverable
> User sees personalized job matches with % scores, can save and track applications.

---

### PHASE 4 — AI Power Features (Weeks 13–16)
**Goal:** Resume tailoring, interview prep, AI chat coach, cover letters

#### Backend Tasks
- [ ] Resume tailor endpoint: base resume + job → tailored resume
- [ ] Tailored resume PDF generation (WeasyPrint or ReportLab)
- [ ] Tailored resume ATS score before/after
- [ ] Interview prep endpoint: Claude generates Q&A per job
- [ ] Cover letter generation endpoint
- [ ] AI career coaching chat: streaming SSE endpoint
- [ ] Chat history storage + context management
- [ ] Rate limiting per user tier (free vs pro)

#### Mobile Tasks
- [ ] "Tailor for This Job" flow in job detail
- [ ] Side-by-side diff view: original vs tailored bullets
- [ ] Accept/reject individual AI suggestions
- [ ] Generate + download tailored PDF
- [ ] Interview prep screen: Q&A cards, flip-to-reveal answers
- [ ] Cover letter screen: generate + edit + copy
- [ ] AI Coach chat screen with streaming responses
- [ ] Chat history with context
- [ ] Usage counter for free tier limits

#### Deliverable
> Full AI-powered job application workflow: match → tailor → prep → apply.

---

### PHASE 5 — Monetization & Polish (Weeks 17–20)
**Goal:** Payments, notifications, analytics, production deployment

#### Backend Tasks
- [ ] Subscription tier enforcement (middleware checks)
- [ ] Google Play purchase verification endpoint
- [ ] FCM push notification service
- [ ] Notification triggers: new matches, app status updates
- [ ] User analytics: application funnel, match trends
- [ ] Admin dashboard API (basic)
- [ ] Production infrastructure setup (AWS ECS + RDS)
- [ ] Monitoring: Sentry, Datadog, CloudWatch alarms
- [ ] Load testing (k6)
- [ ] Security audit: OWASP checklist

#### Mobile Tasks
- [ ] In-app purchase: Pro subscription flow (expo-iap)
- [ ] Paywall screens with feature comparison
- [ ] Push notification permission + display
- [ ] Home dashboard: analytics widgets (funnel, weekly activity)
- [ ] Profile screen: subscription status, usage stats
- [ ] Settings: notifications, privacy, data export
- [ ] App icon, splash screen, onboarding illustrations
- [ ] Performance optimization: FlatList virtualization, image caching
- [ ] EAS Build setup for Google Play
- [ ] Play Store listing: screenshots, description, privacy policy

#### Deliverable
> Production-ready Android app live on Google Play with monetization.

---

### PHASE 6 — Growth & Scale (Post-launch)
- iOS App Store release
- LinkedIn OAuth deep integration
- Job alerts via email + push
- Referral program
- B2B campus placement product
- Recruiter-side job posting portal
- Resume templates with PDF designer
- Salary insights & negotiation coach

---

## Summary: Phase Checklist

| Phase | Duration | Key Output |
|-------|----------|------------|
| 1: Foundation | 4 weeks | Auth + Resume upload + AI parsing |
| 2: Resume Intelligence | 3 weeks | ATS score + AI improvement suggestions |
| 3: Job Feed & Matching | 5 weeks | Job matches + Application tracker |
| 4: AI Power Features | 4 weeks | Tailoring + Interview prep + AI Chat |
| 5: Monetization & Launch | 4 weeks | Payments + Play Store release |
| 6: Growth | Ongoing | iOS + B2B + Scale |

**Total to MVP (Phase 1-5): ~20 weeks (~5 months) for a solo developer**
**With a team of 2-3: ~10-12 weeks**

---

## Getting Started: Phase 1 Setup Commands

```bash
# Project structure
mkdir careerpilot && cd careerpilot
mkdir backend mobile

# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy alembic asyncpg \
    anthropic celery redis pdfminer.six boto3 \
    python-jose[cryptography] passlib[bcrypt] \
    pydantic-settings google-auth httpx

# Mobile
cd ../mobile
npx create-expo-app . --template blank-typescript
npx expo install expo-router expo-secure-store expo-document-picker \
    @tanstack/react-query zustand axios react-native-paper \
    expo-auth-session expo-web-browser
```
