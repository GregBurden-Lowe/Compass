"""add comprehensive reporting view for Power BI

Revision ID: 0012_add_comprehensive_reporting_view
Revises: 0011_add_fos_fields
Create Date: 2026-01-07
"""

from alembic import op

revision = "0012_add_comprehensive_reporting_view"
down_revision = "0011_add_fos_fields"
branch_labels = None
depends_on = None


def upgrade():
    # Comprehensive reporting view combining all complaint data
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


def downgrade():
    op.execute("DROP VIEW IF EXISTS vw_complaints_reporting")

