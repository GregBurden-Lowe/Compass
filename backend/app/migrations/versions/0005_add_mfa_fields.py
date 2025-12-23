"""add mfa fields to users"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0005_add_mfa_fields"
down_revision = "0004_add_non_monetary_redress"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user", sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("user", sa.Column("totp_secret", sa.String(length=64), nullable=True))
    op.add_column("user", sa.Column("recovery_codes", postgresql.ARRAY(sa.String()), nullable=True))
    # drop server_default after setting existing rows to false
    op.alter_column("user", "mfa_enabled", server_default=None)


def downgrade():
    op.drop_column("user", "recovery_codes")
    op.drop_column("user", "totp_secret")
    op.drop_column("user", "mfa_enabled")


