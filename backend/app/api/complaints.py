from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    status,
)
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.event import ComplaintEvent
from app.models.outcome import Outcome
from app.models.redress import RedressPayment
from app.models.user import User
from app.models.enums import (
    ComplaintStatus,
    UserRole,
    CommunicationChannel,
    CommunicationDirection,
    OutcomeType,
    RedressPaymentStatus,
    ActionStatus,
)
from app.models.communication import Communication
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintUpdate,
    CommunicationOut,
    TaskCreate,
    TaskOut,
    OutcomeCreate,
    OutcomeOut,
    RedressCreate,
    RedressUpdate,
    RedressOut,
    ReopenRequest,
    EventOut,
    CloseRequest,
    EscalateRequest,
    ReferToFosRequest,
)
from app.models.task import Task
from app.services import complaints as service
from app.utils.dates import utcnow

router = APIRouter(prefix="/complaints", tags=["complaints"])


def _get_complaint(db: Session, complaint_id: str) -> Complaint:
    complaint = (
        db.query(Complaint)
        .options(
            joinedload(Complaint.complainant),
            joinedload(Complaint.policy),
            joinedload(Complaint.communications).joinedload(Communication.attachments),
            joinedload(Complaint.tasks),
            joinedload(Complaint.outcome),
            joinedload(Complaint.redress_payments),
        )
        .filter(Complaint.id == complaint_id)
        .first()
    )
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    return complaint


def _median(values: list[float]) -> Optional[float]:
    if not values:
        return None
    values = sorted(values)
    n = len(values)
    mid = n // 2
    if n % 2 == 1:
        return values[mid]
    return (values[mid - 1] + values[mid]) / 2
def _safe_pct(num: int, den: int) -> Optional[float]:
    if den <= 0:
        return None
    return (num / den) * 100


def _last_activity_at(c: Complaint):
    # last comm occurred_at if present, else received_at
    if c.communications:
        dates = [comm.occurred_at for comm in c.communications if comm.occurred_at]
        if dates:
            return max(dates)
    return c.received_at


@router.get("", response_model=List[ComplaintOut])
def list_complaints(
    status_filter: Optional[str] = None,
    handler_id: Optional[str] = None,
    product: Optional[str] = None,
    outcome: Optional[OutcomeType] = None,
    vulnerability: Optional[bool] = None,
    overdue: Optional[bool] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Complaint).options(joinedload(Complaint.communications).joinedload(Communication.attachments))
    if status_filter:
        try:
            # Accept either canonical enum values (e.g. "in_investigation") or UI labels (e.g. "In Investigation")
            normalized = status_filter.strip().lower().replace(" ", "_").replace("-", "_")
            status_enum = ComplaintStatus(normalized)
            query = query.filter(Complaint.status == status_enum)
        except ValueError:
            pass
    if handler_id:
        query = query.filter(Complaint.assigned_handler_id == handler_id)
    if product:
        query = query.filter(Complaint.product == product)
    if vulnerability is not None:
        query = query.filter(Complaint.vulnerability_flag == vulnerability)
    if date_from:
        query = query.filter(Complaint.received_at >= date_from)
    if date_to:
        query = query.filter(Complaint.received_at <= date_to)
    if overdue:
        query = query.filter(or_(Complaint.ack_breached == True, Complaint.final_breached == True))  # noqa: E712
    if outcome:
        query = query.join(Complaint.outcome).filter(Complaint.outcome.has(outcome=outcome))
    if search:
        like = f"%{search}%"
        query = query.join(Complaint.complainant).filter(
            or_(
                Complaint.reference.ilike(like),
                Complaint.policy_number.ilike(like),
                Complaint.complainant.has(full_name=search),
            )
        )
    complaints = (
        query.order_by(Complaint.received_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    # Eager load attachments for communications in list view to reduce N+1
    for c in complaints:
        for comm in c.communications:
            _ = comm.attachments  # trigger lazy load if needed
    for c in complaints:
        service.refresh_breach_flags(c)
    db.commit()
    return complaints


@router.get("/metrics")
def complaint_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = utcnow()

    # Pull complaints + relationships needed for these metrics
    complaints = (
        db.query(Complaint)
        .options(
            joinedload(Complaint.communications).joinedload(Communication.attachments),
            joinedload(Complaint.outcome),
            joinedload(Complaint.redress_payments),
        )
        .all()
    )

    total = len(complaints)
    open_cases = [c for c in complaints if c.status != ComplaintStatus.closed]
    closed_cases = [c for c in complaints if c.closed_at]

    # ---------- KPI: my open ----------
    my_open = [
        c for c in open_cases
        if c.assigned_handler_id and str(c.assigned_handler_id) == str(current_user.id)
    ]

    # ---------- SLA: last 30 days (rolling) ----------
    since_30d = now - timedelta(days=30)

    # ack: only count records where ack_due_at + acknowledged_at exist AND received within 30d
    ack_records_30d = [
        c for c in complaints
        if c.received_at and c.received_at >= since_30d
        and c.ack_due_at and c.acknowledged_at
    ]
    ack_on_time_30d = [c for c in ack_records_30d if c.acknowledged_at <= c.ack_due_at]

    # final: only count records where final_due_at + final_response_at exist AND received within 30d
    final_records_30d = [
        c for c in complaints
        if c.received_at and c.received_at >= since_30d
        and c.final_due_at and c.final_response_at
    ]
    final_on_time_30d = [c for c in final_records_30d if c.final_response_at <= c.final_due_at]

    # SLA breaches (open)
    open_breaches = [c for c in open_cases if c.ack_breached or c.final_breached]

    # ---------- stale open (21d+) ----------
    stale_threshold = now - timedelta(days=21)
    stale_open = []
    for c in open_cases:
        last = _last_activity_at(c)
        if last and last < stale_threshold:
            stale_open.append(c)

    # ---------- Aging buckets (open) ----------
    def bucket(days: float) -> str:
        if days <= 7:
            return "0-7"
        if days <= 21:
            return "8-21"
        if days <= 56:
            return "22-56"
        return "56+"

    aging_buckets: dict[str, int] = {"0-7": 0, "8-21": 0, "22-56": 0, "56+": 0}
    for c in open_cases:
        if not c.received_at:
            continue
        days = (now - c.received_at).total_seconds() / 86400
        aging_buckets[bucket(days)] += 1

    # ---------- Flow (last 7 days rolling) ----------
    since_7d = now - timedelta(days=7)
    new_last_7d = len([c for c in complaints if c.received_at and c.received_at >= since_7d])
    closed_last_7d = len([c for c in complaints if c.closed_at and c.closed_at >= since_7d])

    # ---------- Workload open by handler (with names) ----------
    handler_counts: dict[str, int] = {}
    for c in open_cases:
        if c.assigned_handler_id:
            key = str(c.assigned_handler_id)
            handler_counts[key] = handler_counts.get(key, 0) + 1
        else:
            handler_counts["unassigned"] = handler_counts.get("unassigned", 0) + 1

    # map ids -> user names
    handler_ids = [k for k in handler_counts.keys() if k != "unassigned"]
    user_name_map: dict[str, str] = {}
    if handler_ids:
        users = db.query(User).filter(User.id.in_(handler_ids)).all()
        for u in users:
            # adjust this if your User model uses different fields (e.g. display_name)
            user_name_map[str(u.id)] = getattr(u, "full_name", None) or getattr(u, "email", None) or "Unknown"

    workload_open_by_handler = []
    for hid, count in handler_counts.items():
        if hid == "unassigned":
            workload_open_by_handler.append({"id": "unassigned", "name": "Unassigned", "count": count})
        else:
            workload_open_by_handler.append({"id": hid, "name": user_name_map.get(hid, "Unknown"), "count": count})

    workload_open_by_handler.sort(key=lambda x: x["count"], reverse=True)

    # ---------- Open status distribution (open only; sums to open) ----------
    status_open: dict[str, int] = {}
    for c in open_cases:
        key = c.status.value
        status_open[key] = status_open.get(key, 0) + 1

    # ---------- Risk metrics ----------
    open_vulnerable = [c for c in open_cases if c.vulnerability_flag]
    open_vulnerable_pct = _safe_pct(len(open_vulnerable), len(open_cases))

    reopened = [c for c in complaints if c.status == ComplaintStatus.reopened or c.reopened_from_id]
    reopened_pct_all_time = _safe_pct(len(reopened), total)

    escalated_open = len([c for c in open_cases if c.is_escalated])

    # Attachments on final response for open cases
    open_with_final_attachments = []
    for c in open_cases:
        has_final_attachment = any(
            comm.is_final_response and comm.attachments and len(comm.attachments) > 0
            for comm in c.communications
        )
        if has_final_attachment:
            open_with_final_attachments.append(c)
    final_attachment_open_pct = _safe_pct(len(open_with_final_attachments), len(open_cases))

    return {
        "as_of": now.isoformat(),
        "kpis": {
            "open": len(open_cases),
            "my_open": len(my_open),
            "open_sla_breaches": len(open_breaches),
            "open_stale_21d": len(stale_open),
        },
        "sla_30d": {
            "ack": {
                "on_time_pct": _safe_pct(len(ack_on_time_30d), len(ack_records_30d)),
                "on_time": len(ack_on_time_30d),
                "total": len(ack_records_30d),
            },
            "final": {
                "on_time_pct": _safe_pct(len(final_on_time_30d), len(final_records_30d)),
                "on_time": len(final_on_time_30d),
                "total": len(final_records_30d),
            },
        },
        "aging_open": aging_buckets,
        "flow_7d": {"new": new_last_7d, "closed": closed_last_7d},
        "workload_open_by_handler": workload_open_by_handler,
        "status_open": status_open,
        "risk": {
            "open_vulnerable": {"count": len(open_vulnerable), "pct_of_open": open_vulnerable_pct},
            "reopened": {"count": len(reopened), "pct_all_time": reopened_pct_all_time},
            "escalated_open": escalated_open,
            "final_attachment_open_pct": final_attachment_open_pct,
        },
        # (optional) keep legacy counts if you still use them elsewhere
        "counts": {"total": total, "open": len(open_cases), "closed": len(closed_cases)},
    }


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    if payload.category == "Other / Unclassified" and not (payload.reason and payload.reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reason is required when category is Other / Unclassified",
        )
    if payload.category == "Vulnerability and Customer Treatment":
        payload.vulnerability_flag = True
    complaint = service.create_complaint(
        db,
        complaint_data=payload.dict(exclude={"complainant", "policy"}),
        complainant_data=payload.complainant.dict(),
        policy_data=payload.policy.dict(),
    )
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = _get_complaint(db, complaint_id)
    service.add_event(db, complaint, "accessed", "Complaint viewed", str(current_user.id))
    service.refresh_breach_flags(complaint)
    db.commit()
    return complaint


@router.patch("/{complaint_id}", response_model=ComplaintOut)
def update_complaint(
    complaint_id: str,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
    # Allow all roles except read_only (admin, complaints_handler, complaints_manager, reviewer)
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    from app.models.complainant import Complainant
    from app.models.policy import Policy
    from app.services.complaints import calculate_slas
    
    complaint = _get_complaint(db, complaint_id)
    original_category = complaint.category
    original_escalated = complaint.is_escalated
    original_received_at = complaint.received_at
    
    if payload.category and payload.category == "Other / Unclassified" and not (payload.reason and payload.reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reason is required when category is Other / Unclassified",
        )
    if payload.category and payload.category == "Vulnerability and Customer Treatment":
        payload.vulnerability_flag = True
    
    # Update complaint fields (excluding nested objects)
    update_dict = payload.dict(exclude_none=True, exclude={"complainant", "policy"})
    for field, value in update_dict.items():
        setattr(complaint, field, value)
    
    # Update complainant if provided
    if payload.complainant:
        if complaint.complainant:
            for field, value in payload.complainant.dict(exclude_none=True).items():
                setattr(complaint.complainant, field, value)
        else:
            # Create new complainant if it doesn't exist
            complainant = Complainant(
                complaint_id=complaint.id,
                **payload.complainant.dict(exclude_none=True)
            )
            db.add(complainant)
            complaint.complainant = complainant
    
    # Update policy if provided
    if payload.policy:
        if complaint.policy:
            for field, value in payload.policy.dict(exclude_none=True).items():
                setattr(complaint.policy, field, value)
                # Also update the duplicate fields on complaint for consistency
                if field in ["policy_number", "insurer", "broker", "product", "scheme"]:
                    setattr(complaint, field, value)
        else:
            # Create new policy if it doesn't exist
            policy = Policy(
                complaint_id=complaint.id,
                **payload.policy.dict(exclude_none=True)
            )
            db.add(policy)
            complaint.policy = policy
            # Also update duplicate fields on complaint
            for field in ["policy_number", "insurer", "broker", "product", "scheme"]:
                value = getattr(policy, field, None)
                if value:
                    setattr(complaint, field, value)
    
    # Recalculate SLAs if received_at changed
    if payload.received_at and payload.received_at != original_received_at:
        ack_due, final_due = calculate_slas(payload.received_at)
        complaint.ack_due_at = ack_due
        complaint.final_due_at = final_due
    
    escalated_changed = complaint.is_escalated != original_escalated
    if original_category != complaint.category and complaint.status in (
        ComplaintStatus.final_response_issued,
        ComplaintStatus.closed,
    ):
        service.add_event(
            db,
            complaint,
            "category_changed_after_final",
            f"Category changed from {original_category} to {complaint.category} after final response",
            str(current_user.id),
        )
    else:
        service.add_event(db, complaint, "updated", "Complaint updated", str(current_user.id))
    if escalated_changed:
        service.add_event(
            db,
            complaint,
            "escalation_updated",
            "Marked as escalated" if complaint.is_escalated else "Escalation removed",
            str(current_user.id),
        )
    db.commit()
    db.refresh(complaint)
    return complaint


@router.patch("/{complaint_id}/redress/{redress_id}", response_model=RedressOut)
def update_redress(
    complaint_id: str,
    redress_id: str,
    payload: RedressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    complaint = _get_complaint(db, complaint_id)
    payment = next((p for p in complaint.redress_payments if str(p.id) == redress_id), None)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redress not found")
    try:
        updated = service.update_redress_payment(
            db,
            payment,
            status=payload.status,
            notes=payload.notes,
            rationale=payload.rationale,
            action_description=payload.action_description,
            action_status=payload.action_status,
            approved=payload.approved,
            amount=payload.amount,
            paid_at=payload.paid_at,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    db.commit()
    db.refresh(updated)
    return updated


@router.get("/{complaint_id}/events", response_model=List[EventOut])
def list_events(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = _get_complaint(db, complaint_id)
    events = (
        db.query(ComplaintEvent)
        .filter(ComplaintEvent.complaint_id == complaint.id)
        .order_by(ComplaintEvent.created_at.desc())
        .all()
    )
    return events


@router.get("/{complaint_id}/timeline.pdf")
def download_timeline_pdf(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a PDF timeline for internal use, similar to the team's current 'timeline' document.
    """
    from fastapi.responses import Response
    from app.utils.timeline_pdf import build_timeline_pdf, TimelineItem
    import re

    complaint = _get_complaint(db, complaint_id)
    # Pull events (already used by history tab)
    events = (
        db.query(ComplaintEvent)
        .filter(ComplaintEvent.complaint_id == complaint.id)
        .order_by(ComplaintEvent.created_at.asc())
        .all()
    )

    items: list[TimelineItem] = []

    # Core dates
    if complaint.received_at:
        items.append(
            TimelineItem(
                when=complaint.received_at,
                label="Complaint received",
                details=f"Source: {complaint.source}. Category: {complaint.category}.",
            )
        )
    if complaint.acknowledged_at:
        items.append(TimelineItem(when=complaint.acknowledged_at, label="Acknowledged", details="Acknowledgement sent."))
    if complaint.final_response_at:
        items.append(TimelineItem(when=complaint.final_response_at, label="Final response issued", details="Final response issued."))
    if complaint.closed_at:
        items.append(TimelineItem(when=complaint.closed_at, label="Closed", details="Complaint closed."))

    # Communications
    for comm in complaint.communications or []:
        label = "Note / Decision" if getattr(comm, "is_internal", False) else "Communication"
        details = comm.summary
        items.append(TimelineItem(when=comm.occurred_at, label=label, details=details))

    # Events
    for ev in events:
        # Skip noisy 'accessed' by default; it's still in history tab.
        if ev.event_type == "accessed":
            continue
        who = f" ({ev.created_by_name})" if getattr(ev, "created_by_name", None) else ""
        desc = (ev.description or ev.event_type).strip()
        # Remove emoji etc. keep clean
        desc = re.sub(r"\s+", " ", desc)
        items.append(TimelineItem(when=ev.created_at, label=f"{ev.event_type}{who}", details=desc))

    # Outcome summary
    outcome_summary = None
    if complaint.outcome:
        parts = [f"Outcome: {complaint.outcome.outcome}"]
        if getattr(complaint.outcome, "rationale", None):
            parts.append(f"Rationale: {complaint.outcome.rationale}")
        if complaint.outcome.notes:
            parts.append(f"Notes: {complaint.outcome.notes}")
        outcome_summary = "\n".join(parts)

    # Redress summary
    redress_summary = None
    if complaint.redress_payments:
        lines: list[str] = []
        for rp in complaint.redress_payments:
            amt = f"£{float(rp.amount):,.2f}" if rp.amount is not None else "—"
            paid = f", paid {rp.paid_at.date().isoformat()}" if rp.paid_at else ""
            lines.append(f"- {rp.payment_type}: {amt}{paid}")
            if rp.rationale:
                lines.append(f"  Rationale: {rp.rationale}")
            if rp.notes:
                lines.append(f"  Notes: {rp.notes}")
        redress_summary = "\n".join(lines)

    complainant_name = complaint.complainant.full_name if complaint.complainant else None
    complaint_summary = complaint.description

    pdf_bytes = build_timeline_pdf(
        reference=complaint.reference,
        complainant_name=complainant_name,
        complaint_summary=complaint_summary,
        items=items,
        outcome_summary=outcome_summary,
        redress_summary=redress_summary,
    )
    filename = f"{complaint.reference}-timeline.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{complaint_id}/acknowledge", response_model=ComplaintOut)
def acknowledge_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    complaint = _get_complaint(db, complaint_id)
    service.acknowledge(db, complaint, str(current_user.id))
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/assign", response_model=ComplaintOut)
def assign_handler(
    complaint_id: str,
    handler_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = _get_complaint(db, complaint_id)

    # Admin/Reviewer can assign freely
    if current_user.role in (UserRole.admin, UserRole.reviewer, UserRole.complaints_manager):
        service.assign_handler(db, complaint, handler_id, str(current_user.id))
    # Complaints Handler can only self-assign and only if unassigned
    elif current_user.role == UserRole.complaints_handler:
        if complaint.assigned_handler_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Already assigned")
        if handler_id != str(current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only self-assign")
        service.assign_handler(db, complaint, handler_id, str(current_user.id))
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/investigate", response_model=ComplaintOut)
def start_investigation(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    complaint = _get_complaint(db, complaint_id)
    service.start_investigation(db, complaint, str(current_user.id))
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/outcome", response_model=OutcomeOut)
def set_outcome(
    complaint_id: str,
    payload: OutcomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.reviewer, UserRole.complaints_manager, UserRole.complaints_handler])),
):
    complaint = _get_complaint(db, complaint_id)
    outcome = service.record_outcome(db, complaint, payload.outcome, payload.rationale, payload.notes, str(current_user.id))
    db.commit()
    db.refresh(outcome)
    return outcome


@router.post("/{complaint_id}/final-response", response_model=ComplaintOut)
def issue_final_response(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.reviewer, UserRole.complaints_manager, UserRole.complaints_handler])),
):
    complaint = _get_complaint(db, complaint_id)
    try:
        service.issue_final_response(db, complaint, str(current_user.id))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/draft-response", response_model=ComplaintOut)
def draft_response(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.reviewer, UserRole.complaints_manager, UserRole.complaints_handler])),
):
    complaint = _get_complaint(db, complaint_id)
    service.draft_response(db, complaint, str(current_user.id))
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/close", response_model=ComplaintOut)
def close_complaint(
    complaint_id: str,
    payload: CloseRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.reviewer, UserRole.complaints_manager, UserRole.complaints_handler])),
):
    complaint = _get_complaint(db, complaint_id)
    try:
        service.close_complaint(
            db,
            complaint,
            str(current_user.id),
            closed_at=payload.closed_at if payload else None,
            comment=payload.comment if payload else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/close-non-reportable", response_model=ComplaintOut)
def close_non_reportable(
    complaint_id: str,
    payload: CloseRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.reviewer, UserRole.complaints_manager, UserRole.complaints_handler])),
):
    complaint = _get_complaint(db, complaint_id)
    service.close_non_reportable(
        db,
        complaint,
        str(current_user.id),
        closed_at=payload.closed_at if payload else None,
        comment=payload.comment if payload else None,
    )
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/escalate", response_model=ComplaintOut)
def escalate_complaint(
    complaint_id: str,
    payload: EscalateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    complaint = _get_complaint(db, complaint_id)
    try:
        service.escalate(db, complaint, payload.manager_id, str(current_user.id))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/reopen", response_model=ComplaintOut)
def reopen_complaint(
    complaint_id: str,
    payload: ReopenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.reviewer, UserRole.complaints_manager, UserRole.complaints_handler])),
):
    complaint = _get_complaint(db, complaint_id)
    service.reopen(db, complaint, str(current_user.id), payload.reason, payload.reopened_at)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/refer-to-fos", response_model=ComplaintOut)
def refer_to_fos(
    complaint_id: str,
    payload: ReferToFosRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    complaint = _get_complaint(db, complaint_id)
    try:
        service.refer_to_fos(db, complaint, payload.fos_reference, payload.fos_referred_at, str(current_user.id))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    db.commit()
    db.refresh(complaint)
    return complaint


@router.post("/{complaint_id}/communications", response_model=CommunicationOut)
async def add_communication(
    complaint_id: str,
    channel: CommunicationChannel = Form(...),
    direction: CommunicationDirection = Form(...),
    summary: str = Form(...),
    is_final_response: bool = Form(False),
    is_internal: bool = Form(False),
    occurred_at: datetime = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    from app.core.config import get_settings
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        settings = get_settings()
        max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
        
        # Use FastAPI's standard File parameter handling instead of manual form parsing
        # This ensures compatibility with all multipart encodings and client libraries
        # files is already a List[UploadFile] with default=[]
        file_list: List[UploadFile] = files
        
        complaint = _get_complaint(db, complaint_id)
        storage_root = Path("storage/attachments")
        storage_root.mkdir(parents=True, exist_ok=True)
        saved_files = []
        for upload in file_list:
            # Check file size
            content = await upload.read()
            if len(content) > max_size_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File {upload.filename} exceeds maximum size of {settings.max_upload_size_mb}MB"
                )
            safe_name = f"{utcnow().timestamp()}-{upload.filename}"
            dest = storage_root / safe_name
            # Ensure absolute path for storage_path
            dest_absolute = dest.resolve()
            with dest_absolute.open("wb") as f:
                f.write(content)
            logger.info(f"Saved attachment: {upload.filename} -> {dest_absolute} ({len(content)} bytes)")
            saved_files.append(
                {"file_name": upload.filename, "content_type": upload.content_type or "application/octet-stream", "storage_path": str(dest_absolute)}
            )
        comm = service.add_communication_with_attachments(
            db,
            complaint=complaint,
            channel=channel,
            direction=direction,
            summary=summary,
            occurred_at=occurred_at,
            is_final_response=is_final_response,
            is_internal=is_internal,
            attachment_files=saved_files,
            user_id=str(current_user.id),
        )
        logger.info(f"Created communication {comm.id} with {len(saved_files)} attachment(s)")
        if is_final_response:
            if not complaint.outcome:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Outcome must be recorded before issuing final response",
                )
            service.issue_final_response(db, complaint, str(current_user.id))
        db.commit()
        # Reload communication with attachments using joinedload to ensure they're included in response
        comm_with_attachments = (
            db.query(Communication)
            .options(joinedload(Communication.attachments))
            .filter(Communication.id == comm.id)
            .first()
        )
        if comm_with_attachments:
            logger.info(f"Returning communication {comm_with_attachments.id} with {len(comm_with_attachments.attachments)} attachment(s)")
        return comm_with_attachments or comm
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding communication: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add communication: {str(e)}"
        )


@router.get("/{complaint_id}/attachments/debug")
def debug_attachments(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Debug endpoint to verify attachments are saved and accessible"""
    from pathlib import Path
    complaint = _get_complaint(db, complaint_id)
    attachments_info = []
    for comm in complaint.communications:
        for att in comm.attachments:
            file_exists = Path(att.storage_path).exists()
            file_size = Path(att.storage_path).stat().st_size if file_exists else 0
            attachments_info.append({
                "id": str(att.id),
                "file_name": att.file_name,
                "storage_path": att.storage_path,
                "url": att.url,
                "file_exists": file_exists,
                "file_size_bytes": file_size,
                "communication_id": str(att.communication_id),
            })
    return {
        "complaint_id": complaint_id,
        "total_attachments": len(attachments_info),
        "attachments": attachments_info,
    }


@router.get("/attachments/list")
def list_all_attachments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
    limit: int = 100,
):
    """List all attachments across all complaints (admin only)"""
    from pathlib import Path
    from app.models.attachment import Attachment
    from app.models.communication import Communication
    
    attachments = (
        db.query(Attachment)
        .join(Communication)
        .order_by(Attachment.uploaded_at.desc())
        .limit(limit)
        .all()
    )
    
    attachments_info = []
    for att in attachments:
        file_exists = Path(att.storage_path).exists()
        file_size = Path(att.storage_path).stat().st_size if file_exists else 0
        attachments_info.append({
            "id": str(att.id),
            "file_name": att.file_name,
            "content_type": att.content_type,
            "storage_path": att.storage_path,
            "url": att.url,
            "file_exists": file_exists,
            "file_size_bytes": file_size,
            "file_size_mb": round(file_size / (1024 * 1024), 2) if file_size > 0 else 0,
            "communication_id": str(att.communication_id),
            "uploaded_at": att.uploaded_at.isoformat() if att.uploaded_at else None,
        })
    
    return {
        "total": len(attachments_info),
        "limit": limit,
        "attachments": attachments_info,
    }


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """Delete an attachment (admin only). Removes both the database record and the file from disk."""
    from pathlib import Path
    from app.models.attachment import Attachment
    import logging
    
    logger = logging.getLogger(__name__)
    
    attachment = db.get(Attachment, attachment_id)
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")
    
    # Delete file from disk
    file_path = Path(attachment.storage_path)
    if file_path.exists():
        try:
            file_path.unlink()
            logger.info(f"Deleted attachment file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete attachment file {file_path}: {e}")
            # Continue with DB deletion even if file deletion fails
    
    # Delete database record (cascade will handle communication relationship)
    db.delete(attachment)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{complaint_id}/tasks", response_model=TaskOut)
def add_task(
    complaint_id: str,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    complaint = _get_complaint(db, complaint_id)
    new_task = Task(
        complaint_id=complaint.id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        status=payload.status,
        assigned_to_id=payload.assigned_to_id,
        is_checklist=payload.is_checklist,
    )
    db.add(new_task)
    service.add_event(db, complaint, "task_added", payload.title, str(current_user.id))
    db.commit()
    db.refresh(new_task)
    return new_task


@router.post("/{complaint_id}/redress", response_model=RedressOut)
def add_redress(
    complaint_id: str,
    payload: RedressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.reviewer, UserRole.complaints_manager, UserRole.complaints_handler])),
):
    complaint = _get_complaint(db, complaint_id)
    try:
        payment = service.add_redress_payment(
            db,
            complaint,
            amount=payload.amount,
            payment_type=payload.payment_type,
            status=payload.status,
            notes=payload.notes,
            outcome_id=payload.outcome_id,
            rationale=payload.rationale,
            action_description=payload.action_description,
            action_status=payload.action_status or ActionStatus.not_started,
            approved=payload.approved,
            paid_at=payload.paid_at,
            user_id=str(current_user.id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """Delete a complaint. Admin only. This will cascade delete all related records and their files."""
    from pathlib import Path
    from app.models.attachment import Attachment
    
    complaint = _get_complaint(db, complaint_id)
    
    # Collect all attachment file paths before deletion (cascade will remove DB records)
    attachment_files = []
    for comm in complaint.communications:
        for att in comm.attachments:
            file_path = Path(att.storage_path)
            if file_path.exists():
                attachment_files.append(file_path)
    
    # Delete the complaint (cascade will delete communications and attachment DB records)
    db.delete(complaint)
    db.commit()
    
    # Delete physical files from disk after DB commit succeeds
    deleted_count = 0
    for file_path in attachment_files:
        try:
            file_path.unlink()
            deleted_count += 1
            logger.info(f"Deleted attachment file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete attachment file {file_path}: {e}")
    
    if attachment_files:
        logger.info(f"Deleted complaint {complaint_id}: removed {deleted_count}/{len(attachment_files)} attachment files")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

