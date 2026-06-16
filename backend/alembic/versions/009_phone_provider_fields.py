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
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_otp VARCHAR(6)")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMP WITH TIME ZONE")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_pan VARCHAR(10)")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_reg_no VARCHAR(30)")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS gstin VARCHAR(15)")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS total_vacancies INTEGER")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS pan_verified BOOLEAN NOT NULL DEFAULT false")
        op.execute("ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS industry VARCHAR(100)")
    else:
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
