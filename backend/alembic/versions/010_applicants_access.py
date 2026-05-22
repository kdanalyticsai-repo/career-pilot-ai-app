"""Add applicants_access field to jobs table

Revision ID: 010
Revises: 009
Create Date: 2026-05-22
"""
from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "jobs",
        sa.Column("applicants_access", sa.String(20), nullable=True),
    )


def downgrade():
    op.drop_column("jobs", "applicants_access")
