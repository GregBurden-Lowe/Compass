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
    op.add_column("complainant", sa.Column("date_of_birth", sa.Date(), nullable=True))


def downgrade():
    op.drop_column("complainant", "date_of_birth")

