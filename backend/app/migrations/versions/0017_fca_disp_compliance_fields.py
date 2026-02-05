"""FCA DISP compliance: Communication body/d1, Attachment integrity/soft delete, Complaint retention/support_needs, BrokerReferral

Revision ID: 0017_fca_disp
Revises: 0016_add_communication_kind
Create Date: 2026-02-05

All new columns nullable or with safe defaults; backward compatible.
"""

from alembic import op
import sqlalchemy as sa


revision = "0017_fca_disp"
down_revision = "0016_add_communication_kind"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Communication: full body + D1 checklist
    op.execute("ALTER TABLE communication ADD COLUMN IF NOT EXISTS body TEXT;")
    op.execute("ALTER TABLE communication ADD COLUMN IF NOT EXISTS d1_checklist_confirmed JSONB;")
    op.execute(
        "ALTER TABLE communication ADD COLUMN IF NOT EXISTS confirmed_in_attachment BOOLEAN NOT NULL DEFAULT false;"
    )

    # Attachment: integrity + soft delete
    op.execute("ALTER TABLE attachment ADD COLUMN IF NOT EXISTS sha256 VARCHAR(64);")
    op.execute("ALTER TABLE attachment ADD COLUMN IF NOT EXISTS size_bytes BIGINT;")
    op.execute("ALTER TABLE attachment ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;")
    op.execute("ALTER TABLE attachment ADD COLUMN IF NOT EXISTS deleted_by_id UUID REFERENCES \"user\"(id);")
    op.execute("ALTER TABLE attachment ADD COLUMN IF NOT EXISTS delete_reason VARCHAR(500);")

    # Complaint: retention + legal hold + support needs
    op.execute("ALTER TABLE complaint ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT false;")
    op.execute("ALTER TABLE complaint ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP WITH TIME ZONE;")
    op.execute("ALTER TABLE complaint ADD COLUMN IF NOT EXISTS support_needs JSONB;")

    # BrokerReferral table
    op.execute("""
        CREATE TABLE IF NOT EXISTS broker_referral (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            complaint_id UUID NOT NULL REFERENCES complaint(id) ON DELETE CASCADE,
            broker_identifier VARCHAR(255) NOT NULL,
            referred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            what_was_sent TEXT,
            notes TEXT,
            broker_ack_at TIMESTAMP WITH TIME ZONE,
            created_by_id UUID REFERENCES "user"(id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_broker_referral_complaint_id ON broker_referral(complaint_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS broker_referral;")
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS support_needs;")
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS retention_until;")
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS legal_hold;")
    op.execute("ALTER TABLE attachment DROP COLUMN IF EXISTS delete_reason;")
    op.execute("ALTER TABLE attachment DROP COLUMN IF EXISTS deleted_by_id;")
    op.execute("ALTER TABLE attachment DROP COLUMN IF EXISTS deleted_at;")
    op.execute("ALTER TABLE attachment DROP COLUMN IF EXISTS size_bytes;")
    op.execute("ALTER TABLE attachment DROP COLUMN IF EXISTS sha256;")
    op.execute("ALTER TABLE communication DROP COLUMN IF EXISTS confirmed_in_attachment;")
    op.execute("ALTER TABLE communication DROP COLUMN IF EXISTS d1_checklist_confirmed;")
    op.execute("ALTER TABLE communication DROP COLUMN IF EXISTS body;")
