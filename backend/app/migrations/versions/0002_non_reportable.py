"""add non_reportable flag

Revision ID: 0002_non_reportable
Revises: 0001_initial
Create Date: 2025-12-23
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002_non_reportable"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("complaint", sa.Column("non_reportable", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("complaint", "non_reportable", server_default=None)


def downgrade():
    op.drop_column("complaint", "non_reportable")

