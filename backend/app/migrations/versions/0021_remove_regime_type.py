"""Remove regime_type, fca_complaint, fca_rationale columns and data_scope

Revision ID: 0021_remove_regime_type
Revises: 0020_root_cause_fields
Create Date: 2026-03-19

Management has directed that UK FCA-regulated complaints will move to a
completely separate solution. This migration removes all regime-split
infrastructure:

  complaint.regime_type    — 'uk_regulated' / 'non_admitted' enum column
  complaint.fca_complaint  — boolean derived from regime_type
  complaint.fca_rationale  — optional free-text rationale (VARCHAR)
  user.data_scope          — per-user filter scope enum column

The two regime-filtered views (vw_fca_complaints, vw_non_admitted_complaints)
are dropped entirely. The reporting view (vw_complaints_reporting) is
recreated without the removed columns.

The ix_complaint_filters index is recreated without regime_type.
The ix_complaint_regime_status and ix_complaint_regime_type indexes are
dropped without replacement.

The complaint_regime and data_scope Postgres enum types are dropped.

NOTE — DigitalOcean managed PostgreSQL DDL issue
-------------------------------------------------
Alembic's default transaction wrapping causes DDL to silently fail on
DigitalOcean managed Postgres. Apply this migration manually after
deployment:

    docker compose exec backend python -c "
    from app.db.session import engine
    from sqlalchemy import text

    stmts = [
        'DROP VIEW IF EXISTS vw_fca_complaints',
        'DROP VIEW IF EXISTS vw_non_admitted_complaints',
        'DROP VIEW IF EXISTS vw_complaints_reporting',
        '''CREATE OR REPLACE VIEW vw_complaints_reporting AS
        SELECT
            c.id, c.reference, c.status, c.source, c.received_at,
            c.description, c.category, c.reason,
            c.initial_root_cause, c.initial_root_cause_description,
            c.final_root_cause, c.final_root_cause_description,
            c.fos_complaint, c.fos_reference, c.fos_referred_at,
            c.vulnerability_flag, c.vulnerability_notes, c.non_reportable,
            c.product, c.scheme, c.broker, c.insurer, c.policy_number,
            c.ack_due_at, c.final_due_at, c.acknowledged_at,
            c.final_response_at, c.closed_at,
            c.ack_breached, c.final_breached, c.is_escalated,
            c.assigned_handler_id,
            u.full_name AS assigned_handler_name,
            c.created_at, c.updated_at,
            comp.full_name AS complainant_name,
            comp.email AS complainant_email,
            comp.phone AS complainant_phone,
            comp.address AS complainant_address,
            o.outcome AS outcome_type,
            o.notes AS outcome_notes,
            o.recorded_at AS outcome_recorded_at,
            COALESCE(SUM(r.amount) FILTER (WHERE r.amount IS NOT NULL), 0)
                AS total_redress_amount,
            COUNT(r.id) AS redress_payment_count,
            COUNT(DISTINCT comm.id) AS communication_count,
            COUNT(DISTINCT e.id) AS event_count,
            EXTRACT(DAY FROM (COALESCE(c.acknowledged_at, NOW()) - c.received_at))
                AS days_to_acknowledge,
            EXTRACT(DAY FROM (COALESCE(c.closed_at, NOW()) - c.received_at))
                AS days_open,
            EXTRACT(DAY FROM (COALESCE(c.final_response_at, NOW()) - c.received_at))
                AS days_to_final_response
        FROM complaint c
        LEFT JOIN \\"user\\" u ON c.assigned_handler_id = u.id
        LEFT JOIN complainant comp ON comp.complaint_id = c.id
        LEFT JOIN outcome o ON o.complaint_id = c.id
        LEFT JOIN redresspayment r ON r.complaint_id = c.id
        LEFT JOIN communication comm ON comm.complaint_id = c.id
        LEFT JOIN complaint_event e ON e.complaint_id = c.id
        GROUP BY
            c.id, c.reference, c.status, c.source, c.received_at,
            c.description, c.category, c.reason,
            c.initial_root_cause, c.initial_root_cause_description,
            c.final_root_cause, c.final_root_cause_description,
            c.fos_complaint, c.fos_reference, c.fos_referred_at,
            c.vulnerability_flag, c.vulnerability_notes, c.non_reportable,
            c.product, c.scheme, c.broker, c.insurer, c.policy_number,
            c.ack_due_at, c.final_due_at, c.acknowledged_at,
            c.final_response_at, c.closed_at,
            c.ack_breached, c.final_breached, c.is_escalated,
            c.assigned_handler_id, u.full_name, c.created_at, c.updated_at,
            comp.full_name, comp.email, comp.phone, comp.address,
            o.outcome, o.notes, o.recorded_at''',
        'ALTER TABLE complaint DROP CONSTRAINT IF EXISTS ck_fca_complaint_matches_regime',
        'DROP INDEX IF EXISTS ix_complaint_filters',
        'DROP INDEX IF EXISTS ix_complaint_regime_status',
        'DROP INDEX IF EXISTS ix_complaint_regime_type',
        'ALTER TABLE complaint DROP COLUMN IF EXISTS regime_type',
        'ALTER TABLE complaint DROP COLUMN IF EXISTS fca_complaint',
        'ALTER TABLE complaint DROP COLUMN IF EXISTS fca_rationale',
        'ALTER TABLE \\"user\\" DROP COLUMN IF EXISTS data_scope',
        'DROP TYPE IF EXISTS complaint_regime',
        'DROP TYPE IF EXISTS data_scope',
        'CREATE INDEX IF NOT EXISTS ix_complaint_filters ON complaint (status, assigned_handler_id, received_at)',
    ]
    with engine.connect() as conn:
        for s in stmts:
            conn.execute(text(s))
        conn.commit()
        conn.execute(text(\\"UPDATE alembic_version SET version_num = '0021_remove_regime_type'\\"))
        conn.commit()
    print('Migration 0021 applied successfully')
    "
"""

from alembic import op

revision = "0021_remove_regime_type"
down_revision = "0020_root_cause_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop regime-filtered views that depend on the columns being removed
    op.execute("DROP VIEW IF EXISTS vw_fca_complaints;")
    op.execute("DROP VIEW IF EXISTS vw_non_admitted_complaints;")
    op.execute("DROP VIEW IF EXISTS vw_complaints_reporting;")

    # 2. Recreate reporting view without regime_type / fca_complaint / fca_rationale
    op.execute(
        """
        CREATE OR REPLACE VIEW vw_complaints_reporting AS
        SELECT
            c.id,
            c.reference,
            c.status,
            c.source,
            c.received_at,
            c.description,
            c.category,
            c.reason,
            c.initial_root_cause,
            c.initial_root_cause_description,
            c.final_root_cause,
            c.final_root_cause_description,
            c.fos_complaint,
            c.fos_reference,
            c.fos_referred_at,
            c.vulnerability_flag,
            c.vulnerability_notes,
            c.non_reportable,
            c.product,
            c.scheme,
            c.broker,
            c.insurer,
            c.policy_number,
            c.ack_due_at,
            c.final_due_at,
            c.acknowledged_at,
            c.final_response_at,
            c.closed_at,
            c.ack_breached,
            c.final_breached,
            c.is_escalated,
            c.assigned_handler_id,
            u.full_name AS assigned_handler_name,
            c.created_at,
            c.updated_at,
            comp.full_name AS complainant_name,
            comp.email AS complainant_email,
            comp.phone AS complainant_phone,
            comp.address AS complainant_address,
            o.outcome AS outcome_type,
            o.notes AS outcome_notes,
            o.recorded_at AS outcome_recorded_at,
            COALESCE(SUM(r.amount) FILTER (WHERE r.amount IS NOT NULL), 0) AS total_redress_amount,
            COUNT(r.id) AS redress_payment_count,
            COUNT(DISTINCT comm.id) AS communication_count,
            COUNT(DISTINCT e.id) AS event_count,
            EXTRACT(DAY FROM (COALESCE(c.acknowledged_at, NOW()) - c.received_at)) AS days_to_acknowledge,
            EXTRACT(DAY FROM (COALESCE(c.closed_at, NOW()) - c.received_at)) AS days_open,
            EXTRACT(DAY FROM (COALESCE(c.final_response_at, NOW()) - c.received_at)) AS days_to_final_response
        FROM complaint c
        LEFT JOIN "user" u ON c.assigned_handler_id = u.id
        LEFT JOIN complainant comp ON comp.complaint_id = c.id
        LEFT JOIN outcome o ON o.complaint_id = c.id
        LEFT JOIN redresspayment r ON r.complaint_id = c.id
        LEFT JOIN communication comm ON comm.complaint_id = c.id
        LEFT JOIN complaint_event e ON e.complaint_id = c.id
        GROUP BY
            c.id, c.reference, c.status, c.source, c.received_at,
            c.description, c.category, c.reason,
            c.initial_root_cause, c.initial_root_cause_description,
            c.final_root_cause, c.final_root_cause_description,
            c.fos_complaint, c.fos_reference, c.fos_referred_at,
            c.vulnerability_flag, c.vulnerability_notes, c.non_reportable,
            c.product, c.scheme, c.broker, c.insurer, c.policy_number,
            c.ack_due_at, c.final_due_at, c.acknowledged_at, c.final_response_at,
            c.closed_at, c.ack_breached, c.final_breached, c.is_escalated,
            c.assigned_handler_id, u.full_name, c.created_at, c.updated_at,
            comp.full_name, comp.email, comp.phone, comp.address,
            o.outcome, o.notes, o.recorded_at;
        """
    )

    # 3. Drop CHECK constraint that enforced fca_complaint ↔ regime_type consistency
    op.execute(
        "ALTER TABLE complaint DROP CONSTRAINT IF EXISTS ck_fca_complaint_matches_regime;"
    )

    # 4. Drop old indexes (will be recreated / replaced below)
    op.execute("DROP INDEX IF EXISTS ix_complaint_filters;")
    op.execute("DROP INDEX IF EXISTS ix_complaint_regime_status;")
    op.execute("DROP INDEX IF EXISTS ix_complaint_regime_type;")

    # 5. Drop regime / fca columns from complaint
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS regime_type;")
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS fca_complaint;")
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS fca_rationale;")

    # 6. Drop data_scope from user
    op.execute('ALTER TABLE "user" DROP COLUMN IF EXISTS data_scope;')

    # 7. Drop Postgres enum types (must happen after columns are dropped)
    op.execute("DROP TYPE IF EXISTS complaint_regime;")
    op.execute("DROP TYPE IF EXISTS data_scope;")

    # 8. Recreate ix_complaint_filters without regime_type
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_complaint_filters "
        "ON complaint (status, assigned_handler_id, received_at);"
    )


def downgrade() -> None:
    # Re-add enum types
    op.execute(
        "CREATE TYPE IF NOT EXISTS complaint_regime AS ENUM ('uk_regulated', 'non_admitted');"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS data_scope AS ENUM ('uk_regulated', 'non_admitted', 'all');"
    )

    # Re-add columns
    op.execute(
        "ALTER TABLE complaint ADD COLUMN IF NOT EXISTS regime_type complaint_regime NOT NULL DEFAULT 'non_admitted';"
    )
    op.execute(
        "ALTER TABLE complaint ADD COLUMN IF NOT EXISTS fca_complaint BOOLEAN NOT NULL DEFAULT FALSE;"
    )
    op.execute(
        "ALTER TABLE complaint ADD COLUMN IF NOT EXISTS fca_rationale VARCHAR(500);"
    )
    op.execute(
        'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS data_scope data_scope NOT NULL DEFAULT \'all\';'
    )

    # Re-add indexes
    op.execute("DROP INDEX IF EXISTS ix_complaint_filters;")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_complaint_filters "
        "ON complaint (regime_type, status, assigned_handler_id, received_at);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_complaint_regime_status "
        "ON complaint (regime_type, status);"
    )

    # Restore views
    op.execute("DROP VIEW IF EXISTS vw_fca_complaints;")
    op.execute("DROP VIEW IF EXISTS vw_non_admitted_complaints;")
    op.execute("DROP VIEW IF EXISTS vw_complaints_reporting;")

    op.execute(
        """
        CREATE OR REPLACE VIEW vw_complaints_reporting AS
        SELECT
            c.id,
            c.reference,
            c.regime_type,
            c.status,
            c.source,
            c.received_at,
            c.description,
            c.category,
            c.reason,
            c.initial_root_cause,
            c.initial_root_cause_description,
            c.final_root_cause,
            c.final_root_cause_description,
            c.fca_complaint,
            c.fos_complaint,
            c.fos_reference,
            c.fos_referred_at,
            c.vulnerability_flag,
            c.vulnerability_notes,
            c.non_reportable,
            c.product,
            c.scheme,
            c.broker,
            c.insurer,
            c.policy_number,
            c.ack_due_at,
            c.final_due_at,
            c.acknowledged_at,
            c.final_response_at,
            c.closed_at,
            c.ack_breached,
            c.final_breached,
            c.is_escalated,
            c.assigned_handler_id,
            u.full_name AS assigned_handler_name,
            c.created_at,
            c.updated_at,
            comp.full_name AS complainant_name,
            comp.email AS complainant_email,
            comp.phone AS complainant_phone,
            comp.address AS complainant_address,
            o.outcome AS outcome_type,
            o.notes AS outcome_notes,
            o.recorded_at AS outcome_recorded_at,
            COALESCE(SUM(r.amount) FILTER (WHERE r.amount IS NOT NULL), 0) AS total_redress_amount,
            COUNT(r.id) AS redress_payment_count,
            COUNT(DISTINCT comm.id) AS communication_count,
            COUNT(DISTINCT e.id) AS event_count,
            EXTRACT(DAY FROM (COALESCE(c.acknowledged_at, NOW()) - c.received_at)) AS days_to_acknowledge,
            EXTRACT(DAY FROM (COALESCE(c.closed_at, NOW()) - c.received_at)) AS days_open,
            EXTRACT(DAY FROM (COALESCE(c.final_response_at, NOW()) - c.received_at)) AS days_to_final_response
        FROM complaint c
        LEFT JOIN "user" u ON c.assigned_handler_id = u.id
        LEFT JOIN complainant comp ON comp.complaint_id = c.id
        LEFT JOIN outcome o ON o.complaint_id = c.id
        LEFT JOIN redresspayment r ON r.complaint_id = c.id
        LEFT JOIN communication comm ON comm.complaint_id = c.id
        LEFT JOIN complaint_event e ON e.complaint_id = c.id
        GROUP BY
            c.id, c.reference, c.regime_type, c.status, c.source, c.received_at,
            c.description, c.category, c.reason,
            c.initial_root_cause, c.initial_root_cause_description,
            c.final_root_cause, c.final_root_cause_description,
            c.fca_complaint, c.fos_complaint, c.fos_reference, c.fos_referred_at,
            c.vulnerability_flag, c.vulnerability_notes, c.non_reportable,
            c.product, c.scheme, c.broker, c.insurer, c.policy_number,
            c.ack_due_at, c.final_due_at, c.acknowledged_at, c.final_response_at,
            c.closed_at, c.ack_breached, c.final_breached, c.is_escalated,
            c.assigned_handler_id, u.full_name, c.created_at, c.updated_at,
            comp.full_name, comp.email, comp.phone, comp.address,
            o.outcome, o.notes, o.recorded_at;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW vw_fca_complaints AS
        SELECT * FROM vw_complaints_reporting
        WHERE regime_type = 'uk_regulated';
        """
    )
    op.execute(
        "COMMENT ON VIEW vw_fca_complaints IS "
        "'FCA DISP regulatory reporting. Contains ONLY uk_regulated complaints. "
        "Do not modify the regime_type filter without compliance sign-off.';"
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW vw_non_admitted_complaints AS
        SELECT * FROM vw_complaints_reporting
        WHERE regime_type = 'non_admitted';
        """
    )
