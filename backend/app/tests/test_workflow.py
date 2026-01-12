from datetime import datetime, timezone

import pytest
from sqlalchemy.orm import Session

from app.models.complaint import Complaint
from app.models.enums import ComplaintStatus, OutcomeType
from app.services import complaints as service


def build_complaint():
    received = datetime(2024, 1, 1, tzinfo=timezone.utc)
    ack_due, final_due = service.calculate_slas(received)
    return Complaint(
        reference="CMP-2024-000001",
        source="Email",
        received_at=received,
        description="Test",
        category="Test",
        ack_due_at=ack_due,
        final_due_at=final_due,
        fca_complaint=True,
    )


def test_final_response_requires_outcome(db_session: Session):
    complaint = build_complaint()
    db_session.add(complaint)
    db_session.flush()
    with pytest.raises(ValueError):
        service.issue_final_response(db_session, complaint, None)


def test_acknowledge_and_close_flow(db_session: Session):
    complaint = build_complaint()
    db_session.add(complaint)
    db_session.flush()

    service.acknowledge(db_session, complaint, None)
    assert complaint.status == ComplaintStatus.acknowledged
    service.start_investigation(db_session, complaint, None)
    assert complaint.status == ComplaintStatus.in_investigation
    service.record_outcome(db_session, complaint, OutcomeType.upheld, "ok", None, None)
    service.issue_final_response(db_session, complaint, None)
    service.close_complaint(db_session, complaint, None)
    assert complaint.status == ComplaintStatus.closed

