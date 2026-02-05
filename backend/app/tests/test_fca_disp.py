"""FCA DISP compliance: final response evidence, received_at audit, retention, broker referral, outbound guard."""
import pytest
from datetime import datetime, timezone

from app.models.complaint import Complaint
from app.models.outcome import Outcome
from app.models.event import ComplaintEvent
from app.models.audit import AuditLog
from app.models.communication import Communication
from app.models.enums import ComplaintStatus, OutcomeType, CommunicationDirection
from app.services import complaints as service


def _complaint_with_outcome(db_session):
    received = datetime(2024, 1, 1, tzinfo=timezone.utc)
    ack_due, final_due = service.calculate_slas(received)
    c = Complaint(
        reference="CMP-2024-000099",
        source="Email",
        received_at=received,
        description="FCA test",
        category="Test",
        ack_due_at=ack_due,
        final_due_at=final_due,
        fca_complaint=True,
    )
    db_session.add(c)
    db_session.flush()
    o = Outcome(complaint_id=c.id, outcome=OutcomeType.upheld.value, rationale="ok")
    db_session.add(o)
    db_session.flush()
    c.outcome = o
    return c


def test_final_response_with_communication_creates_comm(db_session):
    """POST /final-response path: issue_final_response_with_communication creates a Communication when comm is None."""
    c = _complaint_with_outcome(db_session)
    initial_count = db_session.query(Communication).filter(Communication.complaint_id == c.id).count()
    service.issue_final_response_with_communication(db_session, c, "user-1")
    db_session.flush()
    comms = db_session.query(Communication).filter(Communication.complaint_id == c.id).all()
    assert len(comms) == initial_count + 1
    final_comm = next((x for x in comms if x.is_final_response), None)
    assert final_comm is not None
    assert final_comm.kind == "final_response"
    assert c.final_response_at is not None
    assert c.status == ComplaintStatus.final_response_issued


def test_final_response_confirmed_sent_externally_persists_reason_in_body(db_session):
    """When confirmed_sent_externally=True and external_send_reason is set, the stub Communication.body contains the reason."""
    c = _complaint_with_outcome(db_session)
    reason = "Final response letter was sent by post and we have a signed proof of delivery."
    service.issue_final_response_with_communication(
        db_session,
        c,
        "user-1",
        confirmed_sent_externally=True,
        external_send_reason=reason,
    )
    db_session.flush()
    final_comm = next(
        (x for x in c.communications if x.is_final_response),
        None,
    )
    assert final_comm is not None
    assert final_comm.body is not None
    assert "Evidence: sent externally" in final_comm.body
    assert "Reason:" in final_comm.body
    assert reason in final_comm.body


def test_received_at_change_audit_and_event(db_session):
    """PATCH received_at: audit_change and received_at_corrected event (called from API)."""
    c = _complaint_with_outcome(db_session)
    db_session.add(c)
    db_session.flush()
    old_received = c.received_at
    new_received = datetime(2024, 1, 15, 12, 0, tzinfo=timezone.utc)
    service.audit_change(db_session, str(c.id), "complaint", "received_at", old_received, new_received, "user-1")
    service.add_event(
        db_session, c, "received_at_corrected",
        f"received_at: {old_received} -> {new_received}",
        "user-1",
    )
    db_session.flush()
    logs = db_session.query(AuditLog).filter(AuditLog.complaint_id == c.id, AuditLog.field == "received_at").all()
    assert len(logs) >= 1
    events = db_session.query(ComplaintEvent).filter(
        ComplaintEvent.complaint_id == c.id,
        ComplaintEvent.event_type == "received_at_corrected",
    ).all()
    assert len(events) >= 1


def test_close_sets_retention_until(db_session):
    """Close complaint sets retention_until when not legal_hold."""
    c = _complaint_with_outcome(db_session)
    service.issue_final_response_with_communication(db_session, c, None)
    db_session.flush()
    assert getattr(c, "legal_hold", False) is False
    service.close_complaint(db_session, c, None)
    db_session.flush()
    assert c.closed_at is not None
    assert getattr(c, "retention_until", None) is not None


def test_broker_referral_creates_record_and_event(db_session):
    """create_broker_referral creates BrokerReferral and event (when ENABLE_BROKER_REFERRAL)."""
    from app.models.broker_referral import BrokerReferral
    c = _complaint_with_outcome(db_session)
    ref = service.create_broker_referral(
        db_session, c, "Broker-ABC", "user-1",
        what_was_sent="Summary sent", notes="N/A",
    )
    db_session.flush()
    assert ref.id is not None
    assert ref.broker_identifier == "Broker-ABC"
    events = db_session.query(ComplaintEvent).filter(
        ComplaintEvent.complaint_id == c.id,
        ComplaintEvent.event_type == "referred_to_broker",
    ).all()
    assert len(events) >= 1


def test_soft_delete_attachment_audit(db_session):
    """soft_delete_attachment sets deleted_at and writes audit/event."""
    from app.models.communication import Communication
    from app.models.attachment import Attachment
    c = _complaint_with_outcome(db_session)
    comm = Communication(
        complaint_id=c.id,
        channel="email",
        direction=CommunicationDirection.outbound,
        summary="Test",
        occurred_at=datetime.now(timezone.utc),
    )
    db_session.add(comm)
    db_session.flush()
    att = Attachment(
        communication_id=comm.id,
        file_name="x.pdf",
        content_type="application/pdf",
        storage_path="/tmp/x.pdf",
    )
    db_session.add(att)
    db_session.flush()
    service.soft_delete_attachment(db_session, att, "user-1", delete_reason="Test delete")
    db_session.flush()
    assert att.deleted_at is not None
    assert att.deleted_by_id == "user-1"
    logs = db_session.query(AuditLog).filter(AuditLog.entity == "attachment", AuditLog.field == "deleted").all()
    assert len(logs) >= 1
