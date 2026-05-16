"""phase 5: usage_records table for subscription enforcement

Revision ID: 006
Revises: 005
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usage_records",
        sa.Column("id", sa.CHAR(36), primary_key=True),
        sa.Column("user_id", sa.CHAR(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("feature", sa.String(50), nullable=False),
        sa.Column("year_month", sa.String(7), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "feature", "year_month", name="uq_user_feature_month"),
    )


def downgrade() -> None:
    op.drop_table("usage_records")
