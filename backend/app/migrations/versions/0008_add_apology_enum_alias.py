"""add apology alias to redresstype"""
from alembic import op


revision = "0008_add_apology_enum_alias"
down_revision = "0007_add_reference_tables"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE redresstype ADD VALUE IF NOT EXISTS 'apology'")


def downgrade():
    # Cannot easily remove enum values in Postgres
    pass


