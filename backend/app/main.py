from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
try:
    import sentry_sdk
    _has_sentry = True
except ImportError:
    _has_sentry = False

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.database import async_engine, Base
from app.api.v1 import auth, users, resumes, jobs, applications, ai, analytics, notifications, subscriptions, admin, provider
from app.jobs.renewal_reminder import send_pro_renewal_reminders
import app.models.job  # noqa: F401
import app.models.ai_features  # noqa: F401
import app.models.notification  # noqa: F401
import app.models.subscription  # noqa: F401


async def _run_migrations(conn):
    """Idempotent column additions for tables that existed before Phase 5."""
    if settings.use_sqlite:
        return
    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'job_seeker'",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES users(id) ON DELETE SET NULL",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS review_status VARCHAR(20)",
        "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS prev_ats_score INTEGER",
        "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS completeness_score INTEGER",
        "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS embedding_id VARCHAR(255)",
        "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ats_details JSONB",
        "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1",
        # Phase 5
        """
        CREATE TABLE IF NOT EXISTS usage_records (
            id CHAR(36) PRIMARY KEY,
            user_id CHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            feature VARCHAR(50) NOT NULL,
            year_month VARCHAR(7) NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT uq_user_feature_month UNIQUE (user_id, feature, year_month)
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_usage_records_user ON usage_records(user_id)",
    ]
    for stmt in migrations:
        await conn.execute(text(stmt))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create all tables on startup (works for SQLite dev + PostgreSQL)
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _run_migrations(conn)

    if settings.SENTRY_DSN and _has_sentry:
        sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

    # Daily renewal reminder — runs at 9:00 AM IST (03:30 UTC)
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        send_pro_renewal_reminders,
        CronTrigger(hour=3, minute=30),
        id="pro_renewal_reminders",
        replace_existing=True,
    )
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(resumes.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(provider.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV, "db": "sqlite" if settings.use_sqlite else "postgresql"}
