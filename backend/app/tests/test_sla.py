from datetime import datetime, timezone

from app.services.complaints import calculate_slas


def test_calculate_slas_skips_weekends():
    monday = datetime(2024, 1, 1, tzinfo=timezone.utc)
    ack_due, final_due = calculate_slas(monday)
    assert ack_due.weekday() == 2  # Wednesday after 2 business days
    assert (final_due - monday).days == 56

