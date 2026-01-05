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
    Request,
    status,
)
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.event import ComplaintEvent
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
            status_enum = ComplaintStatus(status_filter.lower())
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
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    complaint = _get_complaint(db, complaint_id)
    original_category = complaint.category
    original_escalated = complaint.is_escalated
    if payload.category == "Other / Unclassified" and not (payload.reason and payload.reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reason is required when category is Other / Unclassified",
        )
    if payload.category == "Vulnerability and Customer Treatment":
        payload.vulnerability_flag = True
    for field, value in payload.dict(exclude_none=True).items():
        setattr(complaint, field, value)
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
    outcome = service.record_outcome(db, complaint, payload.outcome, payload.notes, str(current_user.id))
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


@router.post("/{complaint_id}/communications", response_model=CommunicationOut)
async def add_communication(
    request: Request,
    complaint_id: str,
    channel: CommunicationChannel = Form(...),
    direction: CommunicationDirection = Form(...),
    summary: str = Form(...),
    is_final_response: bool = Form(False),
    occurred_at: datetime = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin, UserRole.complaints_handler, UserRole.complaints_manager, UserRole.reviewer])),
):
    from app.core.config import get_settings
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        settings = get_settings()
        max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
        
        # Parse files from form data manually to handle both single and multiple files
        form = await request.form()
        file_list: List[UploadFile] = []
        if "files" in form:
            files_field = form.getlist("files")
            # form.getlist returns a list, but items might be strings or UploadFiles
            for item in files_field:
                if isinstance(item, UploadFile):
                    file_list.append(item)
        
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
            with dest.open("wb") as f:
                f.write(content)
            saved_files.append(
                {"file_name": upload.filename, "content_type": upload.content_type or "application/octet-stream", "storage_path": str(dest)}
            )
        comm = service.add_communication_with_attachments(
            db,
            complaint=complaint,
            channel=channel,
            direction=direction,
            summary=summary,
            occurred_at=occurred_at,
            is_final_response=is_final_response,
            attachment_files=saved_files,
            user_id=str(current_user.id),
        )
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
        return comm_with_attachments or comm
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding communication: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add communication: {str(e)}"
        )


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
    """Delete a complaint. Admin only. This will cascade delete all related records."""
    complaint = _get_complaint(db, complaint_id)
    db.delete(complaint)
    db.commit()
    return None

