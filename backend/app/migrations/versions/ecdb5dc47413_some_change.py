"""some change

Revision ID: ecdb5dc47413
Revises: 0009_add_cm_role
Create Date: 2025-12-30 10:56:49.394880
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "ecdb5dc47413"
down_revision: Union[str, None] = "0009_add_cm_role"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Attachment
    op.drop_index("ix_attachment_comm", table_name="attachment")
    op.create_index(op.f("ix_attachment_communication_id"), "attachment", ["communication_id"], unique=False)

    # Auditlog
    op.drop_index("ix_audit_complaint", table_name="auditlog")
    op.create_index(op.f("ix_auditlog_complaint_id"), "auditlog", ["complaint_id"], unique=False)

    # Broker
    op.drop_constraint("broker_name_key", "broker", type_="unique")
    op.create_index(op.f("ix_broker_name"), "broker", ["name"], unique=True)

    # Communication
    op.drop_index("ix_communication_complaint", table_name="communication")
    op.create_index(op.f("ix_communication_complaint_id"), "communication", ["complaint_id"], unique=False)

    # Complaint
    op.drop_constraint("complaint_reference_key", "complaint", type_="unique")
    op.drop_index("ix_complaint_policy", table_name="complaint")
    op.create_index(op.f("ix_complaint_policy_number"), "complaint", ["policy_number"], unique=False)
    op.create_foreign_key(None, "complaint", "complaint", ["reopened_from_id"], ["id"])

    # Complaint event
    op.drop_index("ix_event_complaint", table_name="complaint_event")
    op.create_index(op.f("ix_complaint_event_complaint_id"), "complaint_event", ["complaint_id"], unique=False)

    # Insurer
    op.drop_constraint("insurer_name_key", "insurer", type_="unique")
    op.create_index(op.f("ix_insurer_name"), "insurer", ["name"], unique=True)

    # Policy
    op.drop_index("ix_policy_number", table_name="policy")
    op.create_index(op.f("ix_policy_policy_number"), "policy", ["policy_number"], unique=False)

    # Product
    op.drop_constraint("product_name_key", "product", type_="unique")
    op.create_index(op.f("ix_product_name"), "product", ["name"], unique=True)

    # Redress payment
    op.drop_index("ix_redress_complaint", table_name="redresspayment")
    op.create_index(op.f("ix_redresspayment_complaint_id"), "redresspayment", ["complaint_id"], unique=False)
    op.create_index(op.f("ix_redresspayment_outcome_id"), "redresspayment", ["outcome_id"], unique=False)

    # Task
    op.drop_index("ix_task_complaint", table_name="task")
    op.create_index(op.f("ix_task_complaint_id"), "task", ["complaint_id"], unique=False)

    # User (THIS IS THE IMPORTANT BIT)
    # Make this migration safe even if the constraint/index already exist.
    op.execute('ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_email_key;')
    op.execute("DROP INDEX IF EXISTS ix_user_email;")
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)


def downgrade() -> None:
    # User
    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.create_unique_constraint("user_email_key", "user", ["email"])

    # Task
    op.drop_index(op.f("ix_task_complaint_id"), table_name="task")
    op.create_index("ix_task_complaint", "task", ["complaint_id"], unique=False)

    # Redress payment
    op.drop_index(op.f("ix_redresspayment_outcome_id"), table_name="redresspayment")
    op.drop_index(op.f("ix_redresspayment_complaint_id"), table_name="redresspayment")
    op.create_index("ix_redress_complaint", "redresspayment", ["complaint_id"], unique=False)

    # Product
    op.drop_index(op.f("ix_product_name"), table_name="product")
    op.create_unique_constraint("product_name_key", "product", ["name"])

    # Policy
    op.drop_index(op.f("ix_policy_policy_number"), table_name="policy")
    op.create_index("ix_policy_number", "policy", ["policy_number"], unique=False)

    # Insurer
    op.drop_index(op.f("ix_insurer_name"), table_name="insurer")
    op.create_unique_constraint("insurer_name_key", "insurer", ["name"])

    # Complaint event
    op.drop_index(op.f("ix_complaint_event_complaint_id"), table_name="complaint_event")
    op.create_index("ix_event_complaint", "complaint_event", ["complaint_id"], unique=False)

    # Complaint
    op.drop_constraint(None, "complaint", type_="foreignkey")
    op.drop_index(op.f("ix_complaint_policy_number"), table_name="complaint")
    op.create_index("ix_complaint_policy", "complaint", ["policy_number"], unique=False)
    op.create_unique_constraint("complaint_reference_key", "complaint", ["reference"])

    # Communication
    op.drop_index(op.f("ix_communication_complaint_id"), table_name="communication")
    op.create_index("ix_communication_complaint", "communication", ["complaint_id"], unique=False)

    # Broker
    op.drop_index(op.f("ix_broker_name"), table_name="broker")
    op.create_unique_constraint("broker_name_key", "broker", ["name"])

    # Auditlog
    op.drop_index(op.f("ix_auditlog_complaint_id"), table_name="auditlog")
    op.create_index("ix_audit_complaint", "auditlog", ["complaint_id"], unique=False)

    # Attachment
    op.drop_index(op.f("ix_attachment_communication_id"), table_name="attachment")
    op.create_index("ix_attachment_comm", "attachment", ["communication_id"], unique=False)
