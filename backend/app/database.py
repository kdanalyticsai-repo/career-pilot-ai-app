from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


def _make_async_engine():
    kwargs = {}
    if settings.use_sqlite:
        # SQLite needs check_same_thread=False for async use
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_size"] = 10
        kwargs["max_overflow"] = 20
    return create_async_engine(
        settings.async_db_url,
        echo=settings.APP_ENV == "development",
        **kwargs,
    )


def _make_sync_engine():
    kwargs = {}
    if settings.use_sqlite:
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10
    return create_engine(settings.sync_db_url, **kwargs)


async_engine = _make_async_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

sync_engine = _make_sync_engine()
SyncSessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)
