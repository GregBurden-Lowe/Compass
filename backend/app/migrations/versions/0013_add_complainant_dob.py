"""add complainant date of birth

Revision ID: 0013_add_complainant_dob
Revises: 0012_add_comprehensive_reporting_view
Create Date: 2026-01-11
"""

from alembic import op
import sqlalchemy as sa

revision = "0013_add_complainant_dob"
down_revision = "0012_add_comprehensive_reporting_view"
branch_labels = None
depends_on = None


def upgrade():
    # Make idempotent: some environments may already have this column.
    op.execute("ALTER TABLE complainant ADD COLUMN IF NOT EXISTS date_of_birth DATE;")


def downgrade():
    op.drop_column("complainant", "date_of_birth")

