"""Add pro_plan_type column to users table

Revision ID: 011
Revises: 010
Create Date: 2026-05-24
"""
from alembic import op
import sqlalchemy as sa

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("pro_plan_type", sa.String(20), nullable=True),
    )


def downgrade():
    op.drop_column("users", "pro_plan_type")
