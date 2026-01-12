from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.db import base  # noqa: F401  # ensure all models are registered
from app.models import task as _task  # noqa: F401  # ensure Task is registered
from app.models import complaint as _complaint  # noqa: F401
from app.models.enums import UserRole, CommunicationChannel, CommunicationDirection, OutcomeType, RedressPaymentStatus, ActionStatus, RedressType
from app.models.user import User
from app.services import complaints as service
from app.utils.dates import utcnow


def seed_users(db: Session) -> dict[str, str]:
    users = {}
    default_password = get_password_hash("password123")
    seed = [
        ("admin@example.com", "Admin User", UserRole.admin),
        ("handler@example.com", "Handler User", UserRole.complaints_handler),
        ("reviewer@example.com", "Reviewer User", UserRole.reviewer),
        ("readonly@example.com", "Read Only User", UserRole.read_only),
    ]
    for email, name, role in seed:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            users[role] = str(existing.id)
            continue
        user = User(email=email, full_name=name, role=role, hashed_password=default_password)
        db.add(user)
        db.flush()
        users[role] = str(user.id)
    return users


def seed_complaints(db: Session, handler_id: str | None, reviewer_id: str | None):
    now = datetime.now(timezone.utc)
    recent = service.create_complaint(
        db,
        complaint_data={
            "source": "email",
            "received_at": now,
            "description": "Customer dissatisfied with claims handling delay.",
            "category": "Service",
            "reason": "Delay",
            "fca_complaint": True,
            "vulnerability_flag": False,
            "product": "Motor",
            "scheme": "Retail",
            "broker": "Example Broker",
            "insurer": "Example Insurer",
            "policy_number": "POL123456",
        },
        complainant_data={
            "full_name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "+441234567890",
            "address": "1 High Street, London",
        },
        policy_data={
            "policy_number": "POL123456",
            "insurer": "Example Insurer",
            "broker": "Example Broker",
            "product": "Motor",
            "scheme": "Retail",
        },
    )
    if handler_id:
        service.assign_handler(db, recent, handler_id, reviewer_id)
    service.acknowledge(db, recent, handler_id)
    service.start_investigation(db, recent, handler_id)
    service.record_outcome(db, recent, OutcomeType.partially_upheld, "Partial uphold due to delay.", None, reviewer_id)
    service.issue_final_response(db, recent, reviewer_id)
    service.add_redress_payment(
        db,
        recent,
        amount=150.0,
        payment_type=RedressType.goodwill,
        status=RedressPaymentStatus.authorised,
        notes="Approved by reviewer",
        rationale="Token gesture",
        outcome_id=recent.outcome.id if recent.outcome else None,
        action_description=None,
        action_status=ActionStatus.not_started,
        approved=True,
        user_id=reviewer_id,
    )
    service.add_communication_with_attachments(
        db,
        complaint=recent,
        channel=CommunicationChannel.email,
        direction=CommunicationDirection.outbound,
        summary="Sent acknowledgement email.",
        occurred_at=utcnow(),
        attachment_files=[],
    )

    # Stale example: last update 4 weeks ago so it appears in overdue list
    old_received = now - timedelta(days=35)
    stale = service.create_complaint(
        db,
        complaint_data={
            "source": "phone",
            "received_at": old_received,
            "description": "Policy wording dispute; awaiting customer documents.",
            "category": "Coverage",
            "reason": "Wording dispute",
            "fca_complaint": True,
            "vulnerability_flag": False,
            "product": "Home",
            "scheme": "Standard",
            "broker": "ABC Broker",
            "insurer": "ABC Insurer",
            "policy_number": "HOME-999",
        },
        complainant_data={
            "full_name": "John Smith",
            "email": "john@example.com",
            "phone": "+44111222333",
            "address": "2 High Street, London",
        },
        policy_data={
            "policy_number": "HOME-999",
            "insurer": "ABC Insurer",
            "broker": "ABC Broker",
            "product": "Home",
            "scheme": "Standard",
        },
    )
    if handler_id:
        service.assign_handler(db, stale, handler_id, reviewer_id)
    service.acknowledge(db, stale, handler_id)
    service.add_communication_with_attachments(
        db,
        complaint=stale,
        channel=CommunicationChannel.phone,
        direction=CommunicationDirection.inbound,
        summary="Initial call logged, awaiting documents.",
        occurred_at=old_received + timedelta(days=2),
        attachment_files=[],
    )

    # Overdue SLA example: missed final response (9 weeks old)
    overdue_final = service.create_complaint(
        db,
        complaint_data={
            "source": "web",
            "received_at": now - timedelta(weeks=9),
            "description": "Premium refund dispute; no final response issued.",
            "category": "Billing",
            "reason": "Refund",
            "fca_complaint": True,
            "vulnerability_flag": False,
            "product": "Travel",
            "scheme": "Retail",
            "broker": "Global Broker",
            "insurer": "Travel Insurer",
            "policy_number": "TRV-777",
        },
        complainant_data={
            "full_name": "Alice Walker",
            "email": "alice@example.com",
            "phone": "+441122334455",
            "address": "3 High Street, London",
        },
        policy_data={
            "policy_number": "TRV-777",
            "insurer": "Travel Insurer",
            "broker": "Global Broker",
            "product": "Travel",
            "scheme": "Retail",
        },
    )
    if handler_id:
        service.assign_handler(db, overdue_final, handler_id, reviewer_id)
    service.acknowledge(db, overdue_final, handler_id)
    service.start_investigation(db, overdue_final, handler_id)
    # no final response to force breach
    service.add_communication_with_attachments(
        db,
        complaint=overdue_final,
        channel=CommunicationChannel.email,
        direction=CommunicationDirection.inbound,
        summary="Customer chased for update, no response issued.",
        occurred_at=now - timedelta(weeks=7),
        attachment_files=[],
    )
    service.refresh_breach_flags(overdue_final)


def run_seed():
    db = SessionLocal()
    try:
        users = seed_users(db)
        seed_complaints(db, handler_id=users.get(UserRole.complaints_handler), reviewer_id=users.get(UserRole.reviewer))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()

