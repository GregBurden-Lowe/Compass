"""initial schema"""
import sqlalchemy as sa
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("admin", "complaints_handler", "reviewer", "read_only", name="userrole"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_user_email", "user", ["email"], unique=True)

    op.create_table(
        "complaint",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reference", sa.String(length=32), nullable=False, unique=True),
        sa.Column(
            "status",
            sa.Enum(
                "new",
                "acknowledged",
                "in_investigation",
                "response_drafted",
                "final_response_issued",
                "closed",
                "reopened",
                name="complaintstatus",
            ),
            nullable=False,
            server_default="new",
        ),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("category", sa.String(length=255), nullable=False),
        sa.Column("reason", sa.String(length=255)),
        sa.Column("fca_complaint", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("fca_rationale", sa.String(length=1000)),
        sa.Column("vulnerability_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("vulnerability_notes", sa.String(length=1000)),
        sa.Column("policy_number", sa.String(length=128)),
        sa.Column("insurer", sa.String(length=255)),
        sa.Column("broker", sa.String(length=255)),
        sa.Column("product", sa.String(length=255)),
        sa.Column("scheme", sa.String(length=255)),
        sa.Column("ack_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("final_due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True)),
        sa.Column("final_response_at", sa.DateTime(timezone=True)),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.Column("ack_breached", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("final_breached", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("assigned_handler_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id")),
        sa.Column("reopened_from_id", sa.dialects.postgresql.UUID(as_uuid=True)),
        sa.Column("is_escalated", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_complaint_filters", "complaint", ["status", "assigned_handler_id", "received_at"])
    op.create_index("ix_complaint_policy", "complaint", ["policy_number"])
    op.create_index("ix_complaint_reference", "complaint", ["reference"], unique=True)

    op.create_table(
        "complainant",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255)),
        sa.Column("phone", sa.String(length=64)),
        sa.Column("address", sa.String(length=500)),
        sa.Column("preferred_contact_method", sa.String(length=64)),
    )

    op.create_table(
        "policy",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("policy_number", sa.String(length=128)),
        sa.Column("insurer", sa.String(length=255)),
        sa.Column("broker", sa.String(length=255)),
        sa.Column("product", sa.String(length=255)),
        sa.Column("scheme", sa.String(length=255)),
    )
    op.create_index("ix_policy_number", "policy", ["policy_number"])

    op.create_table(
        "communication",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id")),
        sa.Column(
            "channel",
            sa.Enum("phone", "email", "letter", "web", "third_party", "other", name="communicationchannel"),
            nullable=False,
        ),
        sa.Column("direction", sa.Enum("inbound", "outbound", name="communicationdirection"), nullable=False),
        sa.Column("summary", sa.String(length=1000), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_communication_complaint", "communication", ["complaint_id"])

    op.create_table(
        "attachment",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("communication_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("communication.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("storage_path", sa.String(length=500), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_attachment_comm", "attachment", ["communication_id"])

    op.create_table(
        "task",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000)),
        sa.Column("status", sa.Enum("open", "in_progress", "completed", name="taskstatus"), nullable=False, server_default="open"),
        sa.Column("due_date", sa.DateTime(timezone=True)),
        sa.Column("assigned_to_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id")),
        sa.Column("is_checklist", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_task_complaint", "task", ["complaint_id"])

    op.create_table(
        "outcome",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False),
        sa.Column("outcome", sa.Enum("upheld", "partially_upheld", "not_upheld", "withdrawn", "out_of_scope", name="outcometype"), nullable=False),
        sa.Column("notes", sa.String(length=2000)),
        sa.Column("recorded_by_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id")),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("complaint_id", name="uq_outcome_complaint"),
    )

    op.create_table(
        "redresspayment",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False),
        sa.Column("outcome_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("outcome.id", ondelete="CASCADE")),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_type", sa.String(length=255), nullable=False),
        sa.Column("status", sa.Enum("pending", "authorised", "paid", name="redresspaymentstatus"), nullable=False, server_default="pending"),
        sa.Column("notes", sa.String(length=1000)),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_redress_complaint", "redresspayment", ["complaint_id"])

    op.create_table(
        "auditlog",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("complaint.id", ondelete="SET NULL")),
        sa.Column("entity", sa.String(length=255), nullable=False),
        sa.Column("field", sa.String(length=255), nullable=False),
        sa.Column("old_value", sa.String(length=2000)),
        sa.Column("new_value", sa.String(length=2000)),
        sa.Column("changed_by_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_complaint", "auditlog", ["complaint_id"])

    op.create_table(
        "complaint_event",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("complaint_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column("description", sa.String(length=1000)),
        sa.Column("created_by_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("user.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_event_complaint", "complaint_event", ["complaint_id"])

    # Reporting views for Power BI consumption
    op.execute(
        """
        CREATE OR REPLACE VIEW vw_complaints_by_month AS
        SELECT date_trunc('month', received_at) AS month,
               product,
               scheme,
               assigned_handler_id,
               count(*) AS count
        FROM complaint
        GROUP BY 1,2,3,4;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW vw_timeliness AS
        SELECT c.id,
               c.reference,
               c.received_at,
               c.acknowledged_at,
               c.closed_at,
               c.ack_breached,
               c.final_breached,
               extract(day from (c.acknowledged_at - c.received_at)) AS days_to_ack,
               extract(day from (coalesce(c.closed_at, now()) - c.received_at)) AS days_open
        FROM complaint c;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW vw_outcomes_redress AS
        SELECT c.reference,
               o.outcome,
               sum(r.amount) AS total_redress
        FROM complaint c
        LEFT JOIN outcome o ON o.complaint_id = c.id
        LEFT JOIN redresspayment r ON r.complaint_id = c.id
        GROUP BY c.reference, o.outcome;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE VIEW vw_vulnerable_counts AS
        SELECT product,
               scheme,
               count(*) FILTER (WHERE vulnerability_flag) AS vulnerable_count,
               count(*) AS total_count
        FROM complaint
        GROUP BY product, scheme;
        """
    )


def downgrade():
    op.execute("DROP VIEW IF EXISTS vw_vulnerable_counts")
    op.execute("DROP VIEW IF EXISTS vw_outcomes_redress")
    op.execute("DROP VIEW IF EXISTS vw_timeliness")
    op.execute("DROP VIEW IF EXISTS vw_complaints_by_month")
    op.drop_table("complaint_event")
    op.drop_table("auditlog")
    op.drop_table("redresspayment")
    op.drop_table("outcome")
    op.drop_table("task")
    op.drop_table("attachment")
    op.drop_table("communication")
    op.drop_table("policy")
    op.drop_table("complainant")
    op.drop_table("complaint")
    op.drop_index("ix_user_email", table_name="user")
    op.drop_table("user")

