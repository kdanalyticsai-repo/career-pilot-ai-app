"""Add pro_expires_at and razorpay_subscription_id to users

Revision ID: 007
Revises: 006
Create Date: 2026-05-17
"""
from alembic import op
import sqlalchemy as sa

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("pro_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("razorpay_subscription_id", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "razorpay_subscription_id")
    op.drop_column("users", "pro_expires_at")
