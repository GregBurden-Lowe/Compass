"""add reference tables for product/broker/insurer"""
from alembic import op
import sqlalchemy as sa
import uuid


revision = "0007_add_reference_tables"
down_revision = "0006_add_mfa_skip_count"
branch_labels = None
depends_on = None


def _create_table(table_name: str):
    op.create_table(
        table_name,
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def upgrade():
    _create_table("product")
    _create_table("broker")
    _create_table("insurer")


def downgrade():
    op.drop_table("insurer")
    op.drop_table("broker")
    op.drop_table("product")


