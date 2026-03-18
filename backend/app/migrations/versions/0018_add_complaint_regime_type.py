"""Add regime_type to complaint for UK Regulated / Non-Admitted classification split

Revision ID: 0018_regime_type
Revises: 0017_fca_disp
Create Date: 2026-03-18

Both regime types follow the same operational workflow (SLA, D1, status transitions).
regime_type is used solely for classification, FCA reporting filters, and UI labelling.

All existing complaints are backfilled to 'uk_regulated' (the wizard previously
hardcoded fca_complaint=True for every complaint created through the UI).

fca_complaint is deprecated as of this migration:
  - It is now derived from regime_type and kept in sync by the service layer.
  - A CHECK constraint enforces the invariant at the database level.
  - It is retained for BI backward compatibility and will be dropped in migration 0019
    once all reporting queries are confirmed to use regime_type directly.
"""

from alembic import op

revision = "0018_regime_type"
down_revision = "0017_fca_disp"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create the PostgreSQL enum type
    op.execute("CREATE TYPE complaint_regime AS ENUM ('uk_regulated', 'non_admitted');")

    # 2. Add the column with a safe NOT NULL default so the ALTER works on existing rows
    op.execute(
        "ALTER TABLE complaint "
        "ADD COLUMN IF NOT EXISTS regime_type complaint_regime "
        "NOT NULL DEFAULT 'uk_regulated';"
    )

    # 3. Backfill — all existing complaints become uk_regulated (explicit for audit clarity)
    op.execute("UPDATE complaint SET regime_type = 'uk_regulated';")

    # 4. Sync the deprecated fca_complaint boolean from regime_type
    op.execute("UPDATE complaint SET fca_complaint = TRUE  WHERE regime_type = 'uk_regulated';")
    op.execute("UPDATE complaint SET fca_complaint = FALSE WHERE regime_type = 'non_admitted';")

    # 5. Add DB-level safety constraint: fca_complaint must always match regime_type.
    #    This prevents data drift if any legacy code or direct SQL writes fca_complaint
    #    independently of regime_type.
    op.execute(
        "ALTER TABLE complaint ADD CONSTRAINT ck_fca_complaint_matches_regime CHECK ("
        "    (regime_type = 'uk_regulated' AND fca_complaint = TRUE)"
        "    OR"
        "    (regime_type = 'non_admitted' AND fca_complaint = FALSE)"
        ");"
    )

    # 6. Indexes
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_complaint_regime_type ON complaint (regime_type);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_complaint_regime_status ON complaint (regime_type, status);"
    )

    # 7. Replace the existing composite filter index to include regime_type
    op.execute("DROP INDEX IF EXISTS ix_complaint_filters;")
    op.execute(
        "CREATE INDEX ix_complaint_filters "
        "ON complaint (regime_type, status, assigned_handler_id, received_at);"
    )

    # 8. Refresh the main reporting view to expose regime_type
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
            -- Complainant details
            comp.full_name AS complainant_name,
            comp.email AS complainant_email,
            comp.phone AS complainant_phone,
            comp.address AS complainant_address,
            -- Outcome details
            o.outcome AS outcome_type,
            o.notes AS outcome_notes,
            o.recorded_at AS outcome_recorded_at,
            -- Redress summary
            COALESCE(SUM(r.amount) FILTER (WHERE r.amount IS NOT NULL), 0) AS total_redress_amount,
            COUNT(r.id) AS redress_payment_count,
            -- Communication counts
            COUNT(DISTINCT comm.id) AS communication_count,
            -- Event counts
            COUNT(DISTINCT e.id) AS event_count,
            -- Calculated fields
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
            c.description, c.category, c.reason, c.fca_complaint, c.fos_complaint,
            c.fos_reference, c.fos_referred_at, c.vulnerability_flag, c.vulnerability_notes,
            c.non_reportable, c.product, c.scheme, c.broker, c.insurer,
            c.policy_number, c.ack_due_at, c.final_due_at, c.acknowledged_at,
            c.final_response_at, c.closed_at, c.ack_breached, c.final_breached,
            c.is_escalated, c.assigned_handler_id, u.full_name, c.created_at,
            c.updated_at, comp.full_name, comp.email, comp.phone, comp.address,
            o.outcome, o.notes, o.recorded_at;
        """
    )

    # 9. FCA-only view for Power BI / GABRIEL regulatory reporting
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

    # 10. Non-Admitted internal tracking view
    op.execute(
        """
        CREATE OR REPLACE VIEW vw_non_admitted_complaints AS
        SELECT * FROM vw_complaints_reporting
        WHERE regime_type = 'non_admitted';
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS vw_non_admitted_complaints;")
    op.execute("DROP VIEW IF EXISTS vw_fca_complaints;")
    op.execute("DROP VIEW IF EXISTS vw_complaints_reporting;")

    # Restore the previous version of vw_complaints_reporting (without regime_type)
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
            c.id, c.reference, c.status, c.source, c.received_at, c.description,
            c.category, c.reason, c.fca_complaint, c.fos_complaint, c.fos_reference,
            c.fos_referred_at, c.vulnerability_flag, c.vulnerability_notes,
            c.non_reportable, c.product, c.scheme, c.broker, c.insurer,
            c.policy_number, c.ack_due_at, c.final_due_at, c.acknowledged_at,
            c.final_response_at, c.closed_at, c.ack_breached, c.final_breached,
            c.is_escalated, c.assigned_handler_id, u.full_name, c.created_at,
            c.updated_at, comp.full_name, comp.email, comp.phone, comp.address,
            o.outcome, o.notes, o.recorded_at;
        """
    )

    op.execute("DROP INDEX IF EXISTS ix_complaint_regime_status;")
    op.execute("DROP INDEX IF EXISTS ix_complaint_regime_type;")
    op.execute("DROP INDEX IF EXISTS ix_complaint_filters;")
    op.execute(
        "CREATE INDEX ix_complaint_filters "
        "ON complaint (status, assigned_handler_id, received_at);"
    )
    op.execute(
        "ALTER TABLE complaint DROP CONSTRAINT IF EXISTS ck_fca_complaint_matches_regime;"
    )
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS regime_type;")
    op.execute("DROP TYPE IF EXISTS complaint_regime;")
