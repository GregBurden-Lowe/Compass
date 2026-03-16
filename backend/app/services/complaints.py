from datetime import datetime, timezone, timedelta
from typing import Iterable, Optional, List, Any

from sqlalchemy.orm import Session
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from app.models.complaint import Complaint
from app.models.complainant import Complainant
from app.models.policy import Policy
from app.models.communication import Communication
from app.models.attachment import Attachment
from app.models.event import ComplaintEvent
from app.models.audit import AuditLog
from app.models.outcome import Outcome
from app.models.redress import RedressPayment
from app.models.broker_referral import BrokerReferral
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

# D1 checklist keys required when REQUIRE_D1_CHECKLIST is on
D1_REQUIRED_KEYS = [
    "decision_outcome",
    "reasons",
    "redress_summary",
    "fos_right_to_refer",
    "fos_6_months",
    "fos_website",
    "leaflet_statement",
    "waiver_statement",
]


def audit_change(
    db: Session,
    complaint_id: Optional[str],
    entity: str,
    field: str,
    old_value: Any,
    new_value: Any,
    user_id: Optional[str] = None,
) -> None:
    """Write a single field change to AuditLog. Values stringified; truncate to 2000."""
    def _str(v: Any) -> Optional[str]:
        if v is None:
            return None
        s = str(v)
        return s[:2000] if len(s) > 2000 else s
    row = AuditLog(
        complaint_id=complaint_id,
        entity=entity,
        field=field,
        old_value=_str(old_value),
        new_value=_str(new_value),
        changed_by_id=user_id,
    )
    db.add(row)


def validate_d1_checklist(
    d1_checklist_confirmed: Optional[List[str]],
    confirmed_in_attachment: bool,
    attachment_count: int,
    require_d1: bool,
) -> None:
    """When require_d1 is True, raise ValueError if D1 not satisfied."""
    if not require_d1:
        return
    if confirmed_in_attachment and attachment_count >= 1:
        return
    if d1_checklist_confirmed is not None and set(d1_checklist_confirmed) >= set(D1_REQUIRED_KEYS):
        return
    raise ValueError(
        "When D1 checklist is required: either confirm all D1 blocks in the checklist, "
        "or select 'confirmed in attachment' and attach at least one file."
    )


def get_d1_template_body(settings: Any) -> str:
    """Default final response body template with placeholders (FCA D1)."""
    waiver = getattr(settings, "waiver_statement_text", None) or "[Waiver statement - set WAIVER_STATEMENT_TEXT]"
    website = getattr(settings, "d1_fos_website_url", None) or "https://www.financial-ombudsman.org.uk"
    return (
        "Decision: {decision_outcome}\nReasons: {reasons}\n\n"
        "Redress: {redress_summary}\n\n"
        "You have the right to refer this complaint to the Financial Ombudsman Service (FOS) within 6 months of the date of this letter.\n"
        f"FOS website: {website}\n"
        "Leaflet: We have enclosed / made available the FOS leaflet.\n"
        f"Waiver: {waiver}"
    )


def get_delay_response_template(settings: Any) -> str:
    """Template for 8-week delay response (DISP 1.6.2R(2))."""
    website = getattr(settings, "d1_fos_website_url", None) or "https://www.financial-ombudsman.org.uk"
    waiver = getattr(settings, "waiver_statement_text", None) or "[Waiver statement - set WAIVER_STATEMENT_TEXT]"
    return (
        "We are still investigating your complaint and have not yet been able to send our final response. "
        "We will send our final response by [DATE]. "
        "You may refer your complaint to the Financial Ombudsman Service now if you wish. "
        f"Website: {website}. "
        "We have enclosed / made available the FOS leaflet. "
        f"Waiver: {waiver}"
    )


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
    if complaint.non_reportable or complaint.status == ComplaintStatus.closed:
        complaint.ack_breached = False
        complaint.final_breached = False
        return

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


def acknowledge(db: Session, complaint: Complaint, user_id: Optional[str], acknowledged_at: Optional[datetime] = None) -> Complaint:
    if complaint.status not in (ComplaintStatus.new, ComplaintStatus.reopened):
        return complaint

    sent_at = acknowledged_at or utcnow()
    if sent_at.tzinfo is None:
        sent_at = sent_at.replace(tzinfo=timezone.utc)
    ack_due = complaint.ack_due_at
    if ack_due and ack_due.tzinfo is None:
        ack_due = ack_due.replace(tzinfo=timezone.utc)
    # Determine breach based on when the acknowledgement was sent (not when the button was clicked).
    if ack_due and sent_at > ack_due:
        add_event(db, complaint, "ack_sla_breached", "Acknowledgement SLA breached (sent late)", user_id)

    complaint.status = ComplaintStatus.acknowledged
    complaint.acknowledged_at = sent_at
    complaint.ack_breached = False
    add_event(db, complaint, "acknowledged", "Acknowledgement sent", user_id)
    return complaint


def sync_acknowledgement_from_communication(
    db: Session,
    complaint: Complaint,
    user_id: Optional[str],
    occurred_at: datetime,
) -> Complaint:
    if complaint.acknowledged_at is not None:
        complaint.ack_breached = False
        return complaint

    sent_at = occurred_at
    if sent_at.tzinfo is None:
        sent_at = sent_at.replace(tzinfo=timezone.utc)

    if complaint.status in (ComplaintStatus.new, ComplaintStatus.reopened):
        return acknowledge(db, complaint, user_id, acknowledged_at=sent_at)

    ack_due = complaint.ack_due_at
    if ack_due and ack_due.tzinfo is None:
        ack_due = ack_due.replace(tzinfo=timezone.utc)
    if ack_due and sent_at > ack_due:
        add_event(db, complaint, "ack_sla_breached", "Acknowledgement SLA breached (sent late)", user_id)

    complaint.acknowledged_at = sent_at
    complaint.ack_breached = False
    add_event(db, complaint, "acknowledged", "Acknowledgement logged from communication", user_id)
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


def issue_final_response_with_communication(
    db: Session,
    complaint: Complaint,
    user_id: Optional[str],
    *,
    communication: Optional[Communication] = None,
    summary: Optional[str] = None,
    body: Optional[str] = None,
    confirmed_sent_externally: bool = False,
    external_send_reason: Optional[str] = None,
    attachment_count: int = 0,
    d1_checklist_confirmed: Optional[List[str]] = None,
    confirmed_in_attachment: bool = False,
) -> Complaint:
    """
    Ensure a Communication record exists for the final response, then issue it.
    When communication is None (POST /final-response): creates a stub Communication.
    When REQUIRE_FINAL_RESPONSE_EVIDENCE: requires attachment_count>=1 or (confirmed_sent_externally and reason len>=20).
    When REQUIRE_D1_CHECKLIST: requires D1 checklist complete or confirmed_in_attachment + attachment.
    """
    settings = get_settings()
    require_evidence = getattr(settings, "require_final_response_evidence", False)
    require_d1 = getattr(settings, "require_d1_checklist", False)

    if communication is None:
        if require_evidence:
            if attachment_count >= 1:
                pass
            elif confirmed_sent_externally and (external_send_reason or "").strip() and len((external_send_reason or "").strip()) >= 20:
                pass
            else:
                raise ValueError(
                    "Evidence required: attach at least one file, or set confirmed_sent_externally=true "
                    "with external_send_reason (min 20 characters)."
                )
        if require_d1:
            validate_d1_checklist(d1_checklist_confirmed, confirmed_in_attachment, attachment_count, require_d1=True)

        stub_summary = summary or "Final response issued via status action. Evidence stored in attachments or external send."
        # Persist confirmed_sent_externally / external_send_reason in body for audit (no separate DB columns)
        body_to_store = body
        if confirmed_sent_externally and (external_send_reason or "").strip():
            evidence_text = "Evidence: sent externally.\nReason: " + (external_send_reason or "").strip()
            body_to_store = (body + "\n\n" + evidence_text) if body else evidence_text
        add_communication_with_attachments(
            db,
            complaint=complaint,
            kind="final_response",
            channel=CommunicationChannel.other,
            direction=CommunicationDirection.outbound,
            summary=stub_summary,
            body=body_to_store,
            occurred_at=utcnow(),
            is_final_response=True,
            is_internal=False,
            attachment_files=None,
            user_id=user_id,
            d1_checklist_confirmed=d1_checklist_confirmed,
            confirmed_in_attachment=confirmed_in_attachment,
        )
    else:
        if require_d1:
            att_count = len(communication.attachments) if communication.attachments else 0
            validate_d1_checklist(
                getattr(communication, "d1_checklist_confirmed", None),
                getattr(communication, "confirmed_in_attachment", False),
                att_count,
                require_d1=True,
            )
    return issue_final_response(db, complaint, user_id)


def _has_outbound_comm(complaint: Complaint) -> bool:
    """True if complaint has at least one outbound communication or acknowledgement or delay response or final response."""
    for c in complaint.communications or []:
        if getattr(c, "deleted_at", None):
            continue
        if c.direction == CommunicationDirection.outbound:
            return True
        if c.kind in ("acknowledgement", "delay_response_8week") or c.is_final_response:
            return True
    return bool(complaint.acknowledged_at)


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
    settings = get_settings()
    if getattr(settings, "require_outbound_before_close", False) and not _has_outbound_comm(complaint):
        raise ValueError("At least one outbound communication (or acknowledgement / delay / final response) must be logged before closing.")
    complaint.status = ComplaintStatus.closed
    closed = closed_at or utcnow()
    complaint.closed_at = closed
    if not getattr(complaint, "legal_hold", False):
        retention_years = 6
        complaint.retention_until = closed + timedelta(days=365 * retention_years)
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
    kind: Optional[str] = None,
    channel: CommunicationChannel | str,
    direction: CommunicationDirection | str,
    summary: str,
    occurred_at: datetime,
    is_final_response: bool = False,
    is_internal: bool = False,
    attachment_files: Iterable[dict] | None = None,
    user_id: Optional[str] = None,
    body: Optional[str] = None,
    d1_checklist_confirmed: Optional[List[str]] = None,
    confirmed_in_attachment: bool = False,
) -> Communication:
    settings = get_settings()
    require_d1 = getattr(settings, "require_d1_checklist", False)
    if is_final_response and require_d1:
        att_list = list(attachment_files or [])
        validate_d1_checklist(d1_checklist_confirmed, confirmed_in_attachment, len(att_list), require_d1=True)

    if isinstance(channel, str):
        channel = CommunicationChannel(channel)
    if isinstance(direction, str):
        direction = CommunicationDirection(direction)

    comm = Communication(
        complaint_id=complaint.id,
        channel=channel,
        direction=direction,
        kind=kind,
        summary=summary,
        body=body,
        occurred_at=occurred_at,
        user_id=user_id,
        is_final_response=is_final_response,
        is_internal=is_internal,
        d1_checklist_confirmed=d1_checklist_confirmed,
        confirmed_in_attachment=confirmed_in_attachment,
    )
    db.add(comm)
    db.flush()
    if kind == "acknowledgement" and not is_internal:
        sync_acknowledgement_from_communication(db, complaint, user_id, occurred_at)
    for meta in attachment_files or []:
        attachment = Attachment(
            communication_id=comm.id,
            file_name=meta["file_name"],
            content_type=meta["content_type"],
            storage_path=meta["storage_path"],
            sha256=meta.get("sha256"),
            size_bytes=meta.get("size_bytes"),
        )
        db.add(attachment)
    add_event(db, complaint, "note_added" if is_internal else "communication_added", summary[:240], user_id)
    return comm


def soft_delete_attachment(
    db: Session,
    attachment: Attachment,
    user_id: Optional[str],
    delete_reason: Optional[str] = None,
) -> None:
    """Soft delete: set deleted_at, deleted_by_id, delete_reason; write AuditLog + ComplaintEvent. Do not remove file."""
    complaint = attachment.communication.complaint if attachment.communication else None
    old_meta = f"file_name={attachment.file_name}, sha256={attachment.sha256 or 'n/a'}"
    attachment.deleted_at = utcnow()
    attachment.deleted_by_id = user_id
    attachment.delete_reason = (delete_reason or "")[:500]
    audit_change(
        db,
        complaint.id if complaint else None,
        "attachment",
        "deleted",
        old_meta,
        f"deleted_at={attachment.deleted_at}; reason={attachment.delete_reason}",
        user_id,
    )
    if complaint:
        add_event(
            db,
            complaint,
            "attachment_deleted",
            f"Attachment deleted: {attachment.file_name}" + (f" (hash: {attachment.sha256})" if attachment.sha256 else ""),
            user_id,
        )


def create_broker_referral(
    db: Session,
    complaint: Complaint,
    broker_identifier: str,
    user_id: Optional[str],
    referred_at: Optional[datetime] = None,
    what_was_sent: Optional[str] = None,
    notes: Optional[str] = None,
) -> BrokerReferral:
    ref = BrokerReferral(
        complaint_id=complaint.id,
        broker_identifier=broker_identifier,
        referred_at=referred_at or utcnow(),
        what_was_sent=what_was_sent or "",
        notes=notes,
        created_by_id=user_id,
    )
    db.add(ref)
    db.flush()
    add_event(
        db,
        complaint,
        "referred_to_broker",
        f"Referred to broker: {broker_identifier}. Sent: {(what_was_sent or '')[:100]}",
        user_id,
    )
    audit_change(db, str(complaint.id), "broker_referral", "created", None, f"broker={broker_identifier}", user_id)
    return ref


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
