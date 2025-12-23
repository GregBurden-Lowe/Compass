from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Enum as SqlEnum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import RedressPaymentStatus, RedressType, ActionStatus


class RedressPayment(Base):
    complaint_id = Column(ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False, index=True)
    outcome_id = Column(ForeignKey("outcome.id", ondelete="CASCADE"), nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=True)
    payment_type = Column(SqlEnum(RedressType), nullable=False)
    status = Column(SqlEnum(RedressPaymentStatus), default=RedressPaymentStatus.pending, nullable=False)
    rationale = Column(String(2000))
    action_description = Column(String(1000))
    action_status = Column(SqlEnum(ActionStatus), default=ActionStatus.not_started, nullable=False)
    approved = Column(Boolean, nullable=False, default=False, server_default=func.false())
    notes = Column(String(1000))
    paid_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    complaint = relationship("Complaint", back_populates="redress_payments")
    outcome = relationship("Outcome", back_populates="redress_payments")

