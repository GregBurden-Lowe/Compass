"""add is_final_response to communications"""
import sqlalchemy as sa
from alembic import op

revision = "0002_add_final_response_flag"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "communication",
        sa.Column("is_final_response", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column("communication", "is_final_response")

