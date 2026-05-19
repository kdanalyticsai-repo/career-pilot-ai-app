"""Add password reset OTP fields to users

Revision ID: 008
Revises: 007
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("reset_otp", sa.String(6), nullable=True))
    op.add_column("users", sa.Column("reset_otp_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "reset_otp_expires_at")
    op.drop_column("users", "reset_otp")
