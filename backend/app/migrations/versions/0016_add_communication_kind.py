"""add communication kind field

Revision ID: 0016_add_communication_kind
Revises: 0015_add_reference_counter_table
Create Date: 2026-01-13
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "0016_add_communication_kind"
down_revision = "0015_add_reference_counter_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent for environments that may have partially-applied schema changes.
    op.execute("ALTER TABLE communication ADD COLUMN IF NOT EXISTS kind VARCHAR(32);")


def downgrade() -> None:
    # Best-effort (IF EXISTS keeps it safe if already removed)
    op.execute("ALTER TABLE communication DROP COLUMN IF EXISTS kind;")


