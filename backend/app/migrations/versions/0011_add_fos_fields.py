"""add FOS (Financial Ombudsman Service) fields to complaint

Revision ID: 0011_add_fos_fields
Revises: 0010_add_must_change_password
Create Date: 2026-01-07
"""

from alembic import op
import sqlalchemy as sa

revision = "0011_add_fos_fields"
down_revision = "0010_add_must_change_password"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "complaint",
        sa.Column(
            "fos_complaint",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "complaint",
        sa.Column(
            "fos_reference",
            sa.String(length=128),
            nullable=True,
        ),
    )
    op.add_column(
        "complaint",
        sa.Column(
            "fos_referred_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    # Remove server default so future inserts rely on ORM/defaults.
    op.alter_column("complaint", "fos_complaint", server_default=None)


def downgrade():
    op.drop_column("complaint", "fos_referred_at")
    op.drop_column("complaint", "fos_reference")
    op.drop_column("complaint", "fos_complaint")

