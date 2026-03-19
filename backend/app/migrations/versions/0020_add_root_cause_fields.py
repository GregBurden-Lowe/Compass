"""Add root cause fields to complaint table

Revision ID: 0020_root_cause_fields
Revises: 0019_user_data_scope
Create Date: 2026-03-18

Adds four nullable VARCHAR columns to the complaint table for structured root
cause analysis:

  initial_root_cause              — handler's hypothesis at intake
  initial_root_cause_description  — required free text when initial cause is 'other'
  final_root_cause                — confirmed cause after investigation
  final_root_cause_description    — required free text when final cause is 'other'

Values are validated at the application schema layer (not via a DB enum) so the
taxonomy in enums.ROOT_CAUSE_CATEGORIES can evolve without further DDL changes.
All existing rows receive NULL for all four columns — no backfill required.

The reporting views (vw_complaints_reporting, vw_fca_complaints,
vw_non_admitted_complaints) are refreshed to expose the new columns.
"""

from alembic import op

revision = "0020_root_cause_fields"
down_revision = "0019_user_data_scope"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add the four nullable columns
    op.execute(
        "ALTER TABLE complaint "
        "ADD COLUMN IF NOT EXISTS initial_root_cause VARCHAR(100);"
    )
    op.execute(
        "ALTER TABLE complaint "
        "ADD COLUMN IF NOT EXISTS initial_root_cause_description VARCHAR(1000);"
    )
    op.execute(
        "ALTER TABLE complaint "
        "ADD COLUMN IF NOT EXISTS final_root_cause VARCHAR(100);"
    )
    op.execute(
        "ALTER TABLE complaint "
        "ADD COLUMN IF NOT EXISTS final_root_cause_description VARCHAR(1000);"
    )

    # 2. Refresh reporting views to expose the new columns
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


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS vw_fca_complaints;")
    op.execute("DROP VIEW IF EXISTS vw_non_admitted_complaints;")
    op.execute("DROP VIEW IF EXISTS vw_complaints_reporting;")

    # Restore the 0018/0019 version of the view (without root cause columns)
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

    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS final_root_cause_description;")
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS final_root_cause;")
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS initial_root_cause_description;")
    op.execute("ALTER TABLE complaint DROP COLUMN IF EXISTS initial_root_cause;")
