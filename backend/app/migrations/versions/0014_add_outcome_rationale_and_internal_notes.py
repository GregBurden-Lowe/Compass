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
    # Make idempotent: some environments may already have these columns.
    op.execute("ALTER TABLE outcome ADD COLUMN IF NOT EXISTS rationale VARCHAR(2000);")
    op.execute("ALTER TABLE communication ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;")
    # Remove default after backfill to keep model semantics consistent
    op.execute("ALTER TABLE communication ALTER COLUMN is_internal DROP DEFAULT;")


def downgrade():
    op.drop_column("communication", "is_internal")
    op.drop_column("outcome", "rationale")


