from datetime import datetime, timezone

from app.models.complaint import Complaint
from app.services.complaints import calculate_slas
from app.services import complaints as service


def test_calculate_slas_skips_weekends():
    monday = datetime(2024, 1, 1, tzinfo=timezone.utc)
    ack_due, final_due = calculate_slas(monday)
    assert ack_due.weekday() == 2  # Wednesday after 2 business days
    assert (final_due - monday).days == 56


def test_non_reportable_complaints_clear_sla_breach_flags():
    received = datetime(2024, 1, 1, tzinfo=timezone.utc)
    ack_due, final_due = calculate_slas(received)
    complaint = Complaint(
        reference="CMP-2024-000002",
        source="Email",
        received_at=received,
        description="Test",
        category="Test",
        ack_due_at=ack_due,
        final_due_at=final_due,
        non_reportable=True,
        ack_breached=True,
        final_breached=True,
        fca_complaint=True,
    )

    service.refresh_breach_flags(complaint)

    assert complaint.ack_breached is False
    assert complaint.final_breached is False
