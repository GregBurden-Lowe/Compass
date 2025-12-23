"""merge heads and add complaints_manager role

Revision ID: 0009_add_cm_role
Revises: 0002_non_reportable, 0008_add_apology_enum_alias
Create Date: 2025-12-23
"""

from alembic import op

revision = "0009_add_cm_role"
down_revision = ("0002_non_reportable", "0008_add_apology_enum_alias")
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'complaints_manager'")


def downgrade():
    # Enum removals are not straightforward; leaving as is.
    pass

