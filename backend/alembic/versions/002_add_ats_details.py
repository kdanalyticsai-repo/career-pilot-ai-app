"""add ats_details and completeness_score to resumes

Revision ID: 002
Revises: 001
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("resumes", sa.Column("completeness_score", sa.Integer(), nullable=True))
    op.add_column("resumes", sa.Column("ats_details", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("resumes", "ats_details")
    op.drop_column("resumes", "completeness_score")
