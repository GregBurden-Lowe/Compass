"""add must_change_password flag to user

Revision ID: 0010_add_must_change_password
Revises: ecdb5dc47413
Create Date: 2025-12-31
"""

from alembic import op
import sqlalchemy as sa

revision = "0010_add_must_change_password"
down_revision = "ecdb5dc47413"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    # Remove server default so future inserts rely on ORM/defaults.
    op.alter_column("user", "must_change_password", server_default=None)


def downgrade():
    op.drop_column("user", "must_change_password")


