"""add non monetary redress options"""
from alembic import op

revision = "0004_add_non_monetary_redress"
down_revision = "0003_redress_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE redresstype ADD VALUE IF NOT EXISTS 'apology_or_explanation'")
    op.execute("ALTER TYPE redresstype ADD VALUE IF NOT EXISTS 'remedial_action'")


def downgrade():
    # PostgreSQL cannot drop enum values easily; no-op downgrade.
    pass

