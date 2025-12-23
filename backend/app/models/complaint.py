from sqlalchemy import (
    Column,
    String,
    Enum as SqlEnum,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import ComplaintStatus
from app.models.user import User
from app.models.user import User


class Complaint(Base):
    reference = Column(String(32), unique=True, nullable=False, index=True)
    status = Column(SqlEnum(ComplaintStatus), default=ComplaintStatus.new, nullable=False)
    source = Column(String(64), nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=False)
    description = Column(String(2000), nullable=False)
    category = Column(String(255), nullable=False)
    reason = Column(String(255), nullable=True)
    fca_complaint = Column(Boolean, default=False, nullable=False)
    fca_rationale = Column(String(1000), nullable=True)
    vulnerability_flag = Column(Boolean, default=False, nullable=False)
    vulnerability_notes = Column(String(1000), nullable=True)
    non_reportable = Column(Boolean, default=False, nullable=False)

    policy_number = Column(String(128), index=True)
    insurer = Column(String(255))
    broker = Column(String(255))
    product = Column(String(255))
    scheme = Column(String(255))

    ack_due_at = Column(DateTime(timezone=True), nullable=False)
    final_due_at = Column(DateTime(timezone=True), nullable=False)
    acknowledged_at = Column(DateTime(timezone=True))
    final_response_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    ack_breached = Column(Boolean, default=False, nullable=False)
    final_breached = Column(Boolean, default=False, nullable=False)

    assigned_handler_id = Column(ForeignKey("user.id"), nullable=True)
    reopened_from_id = Column(ForeignKey("complaint.id"), nullable=True)
    is_escalated = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    complainant = relationship("Complainant", back_populates="complaint", cascade="all, delete-orphan", uselist=False)
    policy = relationship("Policy", back_populates="complaint", cascade="all, delete-orphan", uselist=False)
    communications = relationship("Communication", back_populates="complaint", cascade="all, delete-orphan")
    events = relationship("ComplaintEvent", back_populates="complaint", cascade="all, delete-orphan")
    outcome = relationship("Outcome", back_populates="complaint", cascade="all, delete-orphan", uselist=False)
    redress_payments = relationship("RedressPayment", back_populates="complaint", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="complaint", cascade="all, delete-orphan")
    assigned_handler = relationship("User", foreign_keys=[assigned_handler_id])

    @property
    def assigned_handler_name(self) -> str | None:
        return self.assigned_handler.full_name if self.assigned_handler else None


Index("ix_complaint_filters", Complaint.status, Complaint.assigned_handler_id, Complaint.received_at)

