"""Add phone verification and provider company fields to users

Revision ID: 009
Revises: 008
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Phone verification fields
    op.add_column("users", sa.Column("phone_otp", sa.String(6), nullable=True))
    op.add_column("users", sa.Column("phone_otp_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default="false"))
    # Provider company verification fields
    op.add_column("users", sa.Column("company_pan", sa.String(10), nullable=True))
    op.add_column("users", sa.Column("company_reg_no", sa.String(30), nullable=True))
    op.add_column("users", sa.Column("gstin", sa.String(15), nullable=True))
    op.add_column("users", sa.Column("total_vacancies", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("pan_verified", sa.Boolean(), nullable=False, server_default="false"))
    # Industry for job seeker profile
    op.add_column("job_seeker_profiles", sa.Column("industry", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("job_seeker_profiles", "industry")
    op.drop_column("users", "pan_verified")
    op.drop_column("users", "total_vacancies")
    op.drop_column("users", "gstin")
    op.drop_column("users", "company_reg_no")
    op.drop_column("users", "company_pan")
    op.drop_column("users", "phone_verified")
    op.drop_column("users", "phone_otp_expires_at")
    op.drop_column("users", "phone_otp")
