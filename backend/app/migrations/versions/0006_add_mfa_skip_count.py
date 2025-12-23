"""add mfa skip count"""
from alembic import op
import sqlalchemy as sa


revision = "0006_add_mfa_skip_count"
down_revision = "0005_add_mfa_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user", sa.Column("mfa_skip_count", sa.Integer(), nullable=False, server_default="0"))
    op.alter_column("user", "mfa_skip_count", server_default=None)


def downgrade():
    op.drop_column("user", "mfa_skip_count")


