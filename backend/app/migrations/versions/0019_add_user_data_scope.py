"""Add data_scope to user for regime visibility restriction

Revision ID: 0019_user_data_scope
Revises: 0018_regime_type
Create Date: 2026-03-18

Adds a data_scope column to the user table. This controls which regime's
complaints a user can see — independent of their role (which governs actions).

Values:
  all           — sees both uk_regulated and non_admitted (default, all existing users)
  uk_regulated  — sees only FCA DISP complaints and their stats
  non_admitted  — sees only Non-Admitted complaints and their stats

Admins can be scoped like any other user. No role-based bypass is applied.
Scope enforcement happens at the API query layer, not the DB layer.
"""

from alembic import op

revision = "0019_user_data_scope"
down_revision = "0018_regime_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create the PostgreSQL enum type
    op.execute("CREATE TYPE data_scope AS ENUM ('uk_regulated', 'non_admitted', 'all');")

    # 2. Add column with safe NOT NULL default
    op.execute(
        'ALTER TABLE "user" '
        "ADD COLUMN IF NOT EXISTS data_scope data_scope NOT NULL DEFAULT 'all';"
    )

    # 3. Backfill — all existing users get unrestricted access by default
    op.execute('UPDATE "user" SET data_scope = \'all\';')


def downgrade() -> None:
    op.execute('ALTER TABLE "user" DROP COLUMN IF EXISTS data_scope;')
    op.execute("DROP TYPE IF EXISTS data_scope;")
