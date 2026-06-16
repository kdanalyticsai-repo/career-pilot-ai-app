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
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applicants_access VARCHAR(20)")
    else:
        op.add_column(
            "jobs",
            sa.Column("applicants_access", sa.String(20), nullable=True),
        )


def downgrade():
    op.drop_column("jobs", "applicants_access")
