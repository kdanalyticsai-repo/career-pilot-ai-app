"""add prev_ats_score to resumes

Revision ID: 003
Revises: 002
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("resumes", sa.Column("prev_ats_score", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("resumes", "prev_ats_score")
