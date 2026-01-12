"""add complaint reference counter table for concurrency-safe references

Revision ID: 0015_add_reference_counter_table
Revises: 0014_add_outcome_rationale_and_internal_notes
Create Date: 2026-01-12
"""

from alembic import op
import sqlalchemy as sa

revision = "0015_add_reference_counter_table"
down_revision = "0014_add_outcome_rationale_and_internal_notes"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "complaint_reference_counter",
        sa.Column("year", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("last_used", sa.Integer(), nullable=False),
    )

    # Seed counters from existing data (if any) so next reference continues sequence.
    # Reference format is CMP-YYYY-NNNNNN. We take max(NNNNNN) per year.
    op.execute(
        """
        INSERT INTO complaint_reference_counter (year, last_used)
        SELECT
            CAST(split_part(reference, '-', 2) AS INTEGER) AS year,
            MAX(CAST(split_part(reference, '-', 3) AS INTEGER)) AS last_used
        FROM complaint
        WHERE reference LIKE 'CMP-%-%'
          AND split_part(reference, '-', 2) ~ '^[0-9]{4}$'
          AND split_part(reference, '-', 3) ~ '^[0-9]+$'
        GROUP BY CAST(split_part(reference, '-', 2) AS INTEGER)
        ON CONFLICT (year) DO NOTHING;
        """
    )


def downgrade():
    op.drop_table("complaint_reference_counter")


