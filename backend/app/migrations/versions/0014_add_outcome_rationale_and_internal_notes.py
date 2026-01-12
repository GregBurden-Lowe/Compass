"""add outcome rationale + internal communications flag

Revision ID: 0014_add_outcome_rationale_and_internal_notes
Revises: 0013_add_complainant_dob
Create Date: 2026-01-12
"""

from alembic import op
import sqlalchemy as sa

revision = "0014_add_outcome_rationale_and_internal_notes"
down_revision = "0013_add_complainant_dob"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("outcome", sa.Column("rationale", sa.String(length=2000), nullable=True))
    op.add_column(
        "communication",
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("communication", "is_internal", server_default=None)


def downgrade():
    op.drop_column("communication", "is_internal")
    op.drop_column("outcome", "rationale")


