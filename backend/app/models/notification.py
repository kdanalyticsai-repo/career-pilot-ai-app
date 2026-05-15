import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.database import Base


class GUID(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=False))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(str(value))


class PushToken(Base):
    __tablename__ = "push_tokens"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(500), nullable=False)
    platform: Mapped[str] = mapped_column(String(10), nullable=False)  # ios | android
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("user_id", "token", name="uq_user_push_token"),)


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    push_job_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    push_reminders: Mapped[bool] = mapped_column(Boolean, default=True)
    email_weekly_digest: Mapped[bool] = mapped_column(Boolean, default=True)
    email_status_changes: Mapped[bool] = mapped_column(Boolean, default=False)
    email_tips: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
