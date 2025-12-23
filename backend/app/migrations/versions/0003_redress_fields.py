"""expand redress fields"""
import sqlalchemy as sa
from alembic import op

revision = "0003_redress_fields"
down_revision = "0002_add_final_response_flag"
branch_labels = None
depends_on = None


def upgrade():
    redress_type = sa.Enum(
        "financial_loss",
        "interest_on_financial_loss",
        "distress_and_inconvenience",
        "consequential_loss",
        "premium_refund_adjustment",
        "goodwill",
        "third_party_payment",
        name="redresstype",
    )
    action_status = sa.Enum("not_started", "in_progress", "completed", name="actionstatus")
    redress_type.create(op.get_bind(), checkfirst=True)
    action_status.create(op.get_bind(), checkfirst=True)
    # map legacy strings to new enum labels
    op.execute(
        """
        UPDATE redresspayment SET payment_type = 'goodwill' WHERE payment_type ILIKE 'goodwill%';
        UPDATE redresspayment SET payment_type = 'financial_loss' WHERE payment_type ILIKE 'financial%loss';
        UPDATE redresspayment SET payment_type = 'interest_on_financial_loss' WHERE payment_type ILIKE 'interest%';
        UPDATE redresspayment SET payment_type = 'distress_and_inconvenience' WHERE payment_type ILIKE 'distress%';
        UPDATE redresspayment SET payment_type = 'consequential_loss' WHERE payment_type ILIKE 'consequential%';
        UPDATE redresspayment SET payment_type = 'premium_refund_adjustment' WHERE payment_type ILIKE 'premium%';
        UPDATE redresspayment SET payment_type = 'third_party_payment' WHERE payment_type ILIKE 'third%';
        """
    )
    op.execute("ALTER TABLE redresspayment ALTER COLUMN payment_type TYPE redresstype USING payment_type::text::redresstype")
    op.alter_column("redresspayment", "amount", existing_type=sa.Numeric(12, 2), nullable=True)
    op.add_column("redresspayment", sa.Column("rationale", sa.String(length=2000), nullable=True))
    op.add_column("redresspayment", sa.Column("action_description", sa.String(length=1000), nullable=True))
    op.add_column("redresspayment", sa.Column("action_status", action_status, nullable=False, server_default="not_started"))
    op.add_column("redresspayment", sa.Column("approved", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    op.drop_column("redresspayment", "approved")
    op.drop_column("redresspayment", "action_status")
    op.drop_column("redresspayment", "action_description")
    op.drop_column("redresspayment", "rationale")
    op.alter_column("redresspayment", "amount", existing_type=sa.Numeric(12, 2), nullable=False)
    op.alter_column("redresspayment", "payment_type", type_=sa.String(length=255))
    op.execute("DROP TYPE IF EXISTS redresstype")
    op.execute("DROP TYPE IF EXISTS actionstatus")

