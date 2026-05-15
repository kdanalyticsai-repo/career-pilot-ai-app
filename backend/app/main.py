from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    import sentry_sdk
    _has_sentry = True
except ImportError:
    _has_sentry = False

from app.config import settings
from app.database import async_engine, Base
from app.api.v1 import auth, users, resumes, jobs, applications, ai, analytics, notifications
import app.models.job  # noqa: F401
import app.models.ai_features  # noqa: F401
import app.models.notification  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create all tables on startup (works for SQLite dev + PostgreSQL)
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    if settings.SENTRY_DSN and _has_sentry:
        sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)
    yield


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


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV, "db": "sqlite" if settings.use_sqlite else "postgresql"}
