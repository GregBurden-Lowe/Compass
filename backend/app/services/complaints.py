from datetime import datetime, timezone
from typing import Iterable, Optional

from sqlalchemy.orm import Session
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.models.complaint import Complaint
from app.models.complainant import Complainant
from app.models.policy import Policy
from app.models.communication import Communication
from app.models.attachment import Attachment
from app.models.event import ComplaintEvent
from app.models.outcome import Outcome
from app.models.redress import RedressPayment
from app.models.enums import (
    ComplaintStatus,
    OutcomeType,
    RedressPaymentStatus,
    RedressType,
    ActionStatus,
    UserRole,
    CommunicationChannel,
    CommunicationDirection,
)
from app.models.user import User
from app.utils.dates import add_business_days, add_weeks, utcnow
from app.core.config import get_settings


def generate_reference(db: Session) -> str:
    """
    Generate a unique complaint reference in the format CMP-YYYY-NNNNNN.

    IMPORTANT: must be safe under concurrency (multiple workers).
    Uses an atomic UPSERT against complaint_reference_counter.
    """
    year = datetime.now(timezone.utc).year
    # last_used is incremented atomically and returned
    seq = db.execute(
        text(
            """
            INSERT INTO complaint_reference_counter (year, last_used)
            VALUES (:year, 1)
            ON CONFLICT (year)
            DO UPDATE SET last_used = complaint_reference_counter.last_used + 1
            RETURNING last_used
            """
        ),
        {"year": year},
    ).scalar_one()
    return f"CMP-{year}-{int(seq):06d}"


def calculate_slas(received_at: datetime) -> tuple[datetime, datetime]:
    settings = get_settings()
    ack_due = add_business_days(received_at, settings.ack_sla_days)
    final_due = add_weeks(received_at, settings.final_response_sla_weeks)
    return ack_due, final_due


def create_complaint(
    db: Session,
    *,
    complaint_data: dict,
    complainant_data: dict,
    policy_data: dict,
) -> Complaint:
    if complaint_data.get("category") == "Vulnerability and Customer Treatment":
        complaint_data["vulnerability_flag"] = True
    if complaint_data.get("category") == "Other / Unclassified" and not (complaint_data.get("reason") or "").strip():
        raise ValueError("Reason is required when category is Other / Unclassified")
    # Reference generation is concurrency-safe via complaint_reference_counter,
    # but keep a small retry loop as belt-and-braces (e.g., if counter table is missing during deploy).
    last_exc: Exception | None = None
    for _ in range(3):
        reference = generate_reference(db)
        ack_due, final_due = calculate_slas(complaint_data["received_at"])
        complaint = Complaint(
            reference=reference,
            ack_due_at=ack_due,
            final_due_at=final_due,
            **complaint_data,
        )
        complaint.complainant = Complainant(**complainant_data)
        complaint.policy = Policy(**policy_data)
        db.add(complaint)
        try:
            db.flush()
            add_event(db, complaint, "created", f"Complaint created with ref {reference}")
            return complaint
        except IntegrityError as exc:
            db.rollback()
            last_exc = exc
            continue

    raise last_exc or RuntimeError("Failed to create complaint")


def add_event(db: Session, complaint: Complaint, event_type: str, description: str, user_id: Optional[str] = None) -> None:
    event = ComplaintEvent(
        complaint_id=complaint.id,
        event_type=event_type,
        description=description,
        created_by_id=user_id,
    )
    db.add(event)


def refresh_breach_flags(complaint: Complaint) -> None:
    now = utcnow()
    ack_due = complaint.ack_due_at
    final_due = complaint.final_due_at
    if ack_due and ack_due.tzinfo is None:
        ack_due = ack_due.replace(tzinfo=timezone.utc)
    if final_due and final_due.tzinfo is None:
        final_due = final_due.replace(tzinfo=timezone.utc)
    # Flags represent current outstanding breaches (not historical).
    complaint.ack_breached = bool(complaint.acknowledged_at is None and ack_due and now > ack_due)
    complaint.final_breached = bool(complaint.final_response_at is None and final_due and now > final_due)


def acknowledge(db: Session, complaint: Complaint, user_id: Optional[str]) -> Complaint:
    if complaint.status not in (ComplaintStatus.new, ComplaintStatus.reopened):
        return complaint
    refresh_breach_flags(complaint)
    if complaint.ack_breached:
        add_event(db, complaint, "ack_sla_breached", "Acknowledgement SLA breached (sent late)", user_id)
    complaint.status = ComplaintStatus.acknowledged
    complaint.acknowledged_at = utcnow()
    complaint.ack_breached = False
    add_event(db, complaint, "acknowledged", "Acknowledgement sent", user_id)
    return complaint


def start_investigation(db: Session, complaint: Complaint, user_id: Optional[str]) -> Complaint:
    if complaint.status not in (ComplaintStatus.acknowledged, ComplaintStatus.new, ComplaintStatus.reopened):
        return complaint
    complaint.status = ComplaintStatus.in_investigation
    add_event(db, complaint, "investigation_started", "Investigation started", user_id)
    return complaint


def draft_response(db: Session, complaint: Complaint, user_id: Optional[str]) -> Complaint:
    # Move to "response drafted" from the investigation stage.
    # If already drafted, this is a no-op.
    if complaint.status == ComplaintStatus.response_drafted:
        return complaint
    if complaint.status not in (ComplaintStatus.in_investigation, ComplaintStatus.acknowledged, ComplaintStatus.reopened):
        return complaint
    complaint.status = ComplaintStatus.response_drafted
    add_event(db, complaint, "response_drafted", "Response drafted", user_id)
    return complaint


def record_outcome(
    db: Session,
    complaint: Complaint,
    outcome: OutcomeType,
    rationale: Optional[str],
    notes: Optional[str],
    user_id: Optional[str],
) -> Outcome:
    if complaint.outcome:
        complaint.outcome.outcome = outcome
        complaint.outcome.rationale = rationale
        complaint.outcome.notes = notes
        complaint.outcome.recorded_by_id = user_id
    else:
        complaint.outcome = Outcome(
            complaint_id=complaint.id,
            outcome=outcome,
            rationale=rationale,
            notes=notes,
            recorded_by_id=user_id,
        )
        db.add(complaint.outcome)
    add_event(db, complaint, "outcome_recorded", f"Outcome set to {outcome}", user_id)
    return complaint.outcome


def issue_final_response(db: Session, complaint: Complaint, user_id: Optional[str]) -> Complaint:
    if not complaint.outcome:
        raise ValueError("Outcome required before final response")
    refresh_breach_flags(complaint)
    if complaint.final_breached:
        add_event(db, complaint, "final_sla_breached", "Final response SLA breached (sent late)", user_id)
    complaint.status = ComplaintStatus.final_response_issued
    complaint.final_response_at = utcnow()
    complaint.final_breached = False
    add_event(db, complaint, "final_response_issued", "Final response issued", user_id)
    return complaint


def close_complaint(
    db: Session,
    complaint: Complaint,
    user_id: Optional[str],
    *,
    closed_at: Optional[datetime] = None,
    comment: Optional[str] = None,
) -> Complaint:
    if not complaint.outcome:
        raise ValueError("Outcome required before closing complaint")
    if not complaint.final_response_at:
        raise ValueError("Final response required before closing complaint")
    complaint.status = ComplaintStatus.closed
    complaint.closed_at = closed_at or utcnow()
    desc = "Complaint closed"
    if comment:
        desc = f"{desc} — {comment}"
    add_event(db, complaint, "closed", desc[:240], user_id)
    return complaint


def close_non_reportable(
    db: Session,
    complaint: Complaint,
    user_id: Optional[str],
    *,
    closed_at: Optional[datetime] = None,
    comment: Optional[str] = None,
) -> Complaint:
    complaint.non_reportable = True
    complaint.status = ComplaintStatus.closed
    complaint.closed_at = closed_at or utcnow()
    desc = "Closed as non-reportable"
    if comment:
        desc = f"{desc} — {comment}"
    add_event(db, complaint, "closed_non_reportable", desc[:240], user_id)
    return complaint


def escalate(
    db: Session,
    complaint: Complaint,
    manager_id: str,
    user_id: Optional[str],
) -> Complaint:
    manager = db.get(User, manager_id)
    if not manager or manager.role != UserRole.complaints_manager:
        raise ValueError("Manager must be a valid complaints manager")
    complaint.is_escalated = True
    complaint.assigned_handler_id = manager_id
    add_event(db, complaint, "escalated", f"Escalated to {manager.full_name}", user_id)
    return complaint


def reopen(db: Session, complaint: Complaint, user_id: Optional[str], reason: Optional[str], reopened_at: Optional[datetime]) -> Complaint:
    complaint.status = ComplaintStatus.reopened
    complaint.reopened_from_id = complaint.id
    complaint.closed_at = None
    when = reopened_at or utcnow()
    complaint.received_at = complaint.received_at  # keep original
    complaint.ack_breached = False
    complaint.final_breached = False
    add_event(db, complaint, "reopened", reason or "Complaint reopened", user_id)
    return complaint


def refer_to_fos(
    db: Session,
    complaint: Complaint,
    fos_reference: str,
    fos_referred_at: Optional[datetime],
    user_id: Optional[str],
) -> Complaint:
    if complaint.fos_complaint:
        raise ValueError("Complaint has already been referred to FOS")
    # If closed, automatically reopen when referring to FOS
    if complaint.status == ComplaintStatus.closed:
        complaint.status = ComplaintStatus.reopened
        complaint.closed_at = None
        add_event(db, complaint, "reopened", "Complaint reopened due to FOS referral", user_id)
    complaint.fos_complaint = True
    complaint.fos_reference = fos_reference
    complaint.fos_referred_at = fos_referred_at or utcnow()
    date_str = complaint.fos_referred_at.strftime("%d %b %Y")
    add_event(
        db,
        complaint,
        "referred_to_fos",
        f"Referred to Financial Ombudsman Service. Reference: {fos_reference}. Date: {date_str}",
        user_id,
    )
    return complaint


def assign_handler(db: Session, complaint: Complaint, handler_id: str, user_id: Optional[str]) -> Complaint:
    assignee_name = None
    assignee = db.get(User, handler_id)
    if assignee:
        assignee_name = assignee.full_name
    complaint.assigned_handler_id = handler_id
    label = assignee_name or handler_id
    add_event(db, complaint, "assigned", f"Assigned to {label}", user_id)
    return complaint


def add_communication_with_attachments(
    db: Session,
    *,
    complaint: Complaint,
    channel: CommunicationChannel | str,
    direction: CommunicationDirection | str,
    summary: str,
    occurred_at: datetime,
    is_final_response: bool = False,
    is_internal: bool = False,
    attachment_files: Iterable[dict] | None = None,
    user_id: Optional[str] = None,
) -> Communication:
    # Convert string to enum if needed
    if isinstance(channel, str):
        channel = CommunicationChannel(channel)
    if isinstance(direction, str):
        direction = CommunicationDirection(direction)
    
    comm = Communication(
        complaint_id=complaint.id,
        channel=channel,
        direction=direction,
        summary=summary,
        occurred_at=occurred_at,
        user_id=user_id,
        is_final_response=is_final_response,
        is_internal=is_internal,
    )
    db.add(comm)
    db.flush()
    attachments = []
    for meta in attachment_files or []:
        attachment = Attachment(
            communication_id=comm.id,
            file_name=meta["file_name"],
            content_type=meta["content_type"],
            storage_path=meta["storage_path"],
        )
        attachments.append(attachment)
        db.add(attachment)
    add_event(db, complaint, "note_added" if is_internal else "communication_added", summary[:240], user_id)
    return comm


def add_redress_payment(
    db: Session,
    complaint: Complaint,
    amount: Optional[float],
    payment_type: RedressType | str,
    status: RedressPaymentStatus | str,
    notes: Optional[str],
    outcome_id: Optional[str],
    rationale: Optional[str],
    action_description: Optional[str],
    action_status: ActionStatus | str,
    approved: bool,
    user_id: Optional[str],
    paid_at: Optional[datetime] = None,
) -> RedressPayment:
    def normalize_payment_type(pt: RedressType | str) -> RedressType:
        if isinstance(pt, RedressType):
            return pt
        key = (pt or "").strip().lower()
        aliases = {
            "goodwill": RedressType.goodwill,
            "goodwill_payment": RedressType.goodwill,
            "apology": RedressType.apology,
            "apology_or_explanation": RedressType.apology,
            "remedial": RedressType.remedial_action,
            "remedial_action": RedressType.remedial_action,
        }
        if key in aliases:
            return aliases[key]
        return RedressType(key)

    payment_type = normalize_payment_type(payment_type)
    payment_type_value = payment_type.value
    if payment_type_value == "apology":
        payment_type_value = "apology_or_explanation"
    # Treat redress as record-only (no standalone workflow).
    # Keep status internally as pending and always approved.
    status = RedressPaymentStatus.pending
    action_status = ActionStatus(action_status)
    monetary_types = {
        RedressType.financial_loss,
        RedressType.interest,
        RedressType.distress,
        RedressType.consequential_loss,
        RedressType.premium_refund,
        RedressType.goodwill,
        RedressType.third_party,
    }
    is_monetary = payment_type in monetary_types
    if is_monetary:
        if amount is None:
            raise ValueError("Amount required for monetary redress")
        if rationale is None or rationale.strip() == "":
            raise ValueError("Rationale required for monetary redress")
    else:
        if action_description is None or action_description.strip() == "":
            raise ValueError("Action description required for non-monetary redress")
    payment = RedressPayment(
        complaint_id=complaint.id,
        outcome_id=outcome_id,
        amount=amount,
        payment_type=payment_type_value,
        status=status,
        notes=notes,
        rationale=rationale,
        action_description=action_description,
        action_status=action_status,
        approved=True,
        paid_at=paid_at,
    )
    db.add(payment)
    add_event(db, complaint, "redress_added", f"Redress {amount or ''} {payment_type}", user_id)
    return payment


def update_redress_payment(
    db: Session,
    payment: RedressPayment,
    status: Optional[RedressPaymentStatus | str] = None,
    notes: Optional[str] = None,
    rationale: Optional[str] = None,
    action_description: Optional[str] = None,
    action_status: Optional[ActionStatus | str] = None,
    approved: Optional[bool] = None,
    amount: Optional[float] = None,
    paid_at: Optional[datetime] = None,
) -> RedressPayment:
    monetary_types = {
        RedressType.financial_loss,
        RedressType.interest,
        RedressType.distress,
        RedressType.consequential_loss,
        RedressType.premium_refund,
        RedressType.goodwill,
        RedressType.third_party,
    }
    is_monetary = payment.payment_type in monetary_types
    if status is not None:
        # Keep record-only: ignore status changes from clients.
        payment.status = RedressPaymentStatus.pending
    if action_status is not None:
        payment.action_status = ActionStatus(action_status)
    if approved is not None:
        # Keep record-only: ignore approved changes from clients.
        payment.approved = True
    if amount is not None:
        payment.amount = amount
    if notes is not None:
        payment.notes = notes
    if rationale is not None:
        payment.rationale = rationale
    if action_description is not None:
        payment.action_description = action_description
    if paid_at is not None:
        payment.paid_at = paid_at
    if not is_monetary:
        # ensure action description exists
        if not (payment.action_description and payment.action_description.strip()):
            raise ValueError("Action description required for non-monetary redress")
    if paid_at is not None:
        add_event(
            db,
            payment.complaint,
            "redress_paid",
            f"Payment date recorded: {paid_at.date().isoformat()}",
            None,
        )
    else:
        add_event(
            db,
            payment.complaint,
            "redress_updated",
            f"Redress updated (status={payment.status}, action_status={payment.action_status})",
            None,
        )
    return payment

