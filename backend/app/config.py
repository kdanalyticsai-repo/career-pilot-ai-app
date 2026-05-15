from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "CVPilot"
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars!!"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "sqlite+aiosqlite:///./cvpilot.db"
    DATABASE_SYNC_URL: str = ""

    REDIS_URL: str = "redis://localhost:6379/0"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str = "cvpilot-resumes"
    S3_PRESIGNED_URL_EXPIRY: int = 300
    LOCAL_STORAGE_PATH: str = "./uploads"

    ANTHROPIC_API_KEY: str = "sk-ant-placeholder"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "cvpilot-jobs"

    # Adzuna job data API (developer.adzuna.com - free tier)
    ADZUNA_APP_ID: str = ""
    ADZUNA_API_KEY: str = ""
    ADZUNA_COUNTRY: str = "in"  # "in" for India, "gb" for UK, "us" for US

    # SendGrid email service
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@cvpilot.app"
    SENDGRID_FROM_NAME: str = "CVPilot"

    # Expo push notifications
    EXPO_ACCESS_TOKEN: str = ""

    SENTRY_DSN: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:3000,exp://localhost:8081,http://10.0.2.2:8000"

    @property
    def async_db_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://"):]
        return url

    @property
    def sync_db_url(self) -> str:
        url = self.DATABASE_SYNC_URL or self.DATABASE_URL
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql+asyncpg://"):
            url = "postgresql://" + url[len("postgresql+asyncpg://"):]
        return url

    @property
    def use_local_storage(self) -> bool:
        return not (self.AWS_ACCESS_KEY_ID and self.AWS_SECRET_ACCESS_KEY)

    @property
    def has_anthropic_key(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY) and not self.ANTHROPIC_API_KEY.startswith("sk-ant-placeholder")

    @property
    def has_adzuna_key(self) -> bool:
        return bool(self.ADZUNA_APP_ID) and bool(self.ADZUNA_API_KEY)

    @property
    def has_sendgrid_key(self) -> bool:
        return bool(self.SENDGRID_API_KEY)

    @property
    def use_sqlite(self) -> bool:
        return "sqlite" in self.async_db_url

    @property
    def use_celery_eager(self) -> bool:
        # Run tasks synchronously whenever Redis is not a real external broker
        return "localhost" in self.REDIS_URL or "127.0.0.1" in self.REDIS_URL

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
