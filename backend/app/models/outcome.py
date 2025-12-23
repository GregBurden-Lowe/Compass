from sqlalchemy import Column, String, Enum as SqlEnum, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import OutcomeType


class Outcome(Base):
    complaint_id = Column(ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False)
    outcome = Column(SqlEnum(OutcomeType), nullable=False)
    notes = Column(String(2000))
    recorded_by_id = Column(ForeignKey("user.id"), nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    complaint = relationship("Complaint", back_populates="outcome")
    redress_payments = relationship("RedressPayment", back_populates="outcome")

    __table_args__ = (UniqueConstraint("complaint_id", name="uq_outcome_complaint"),)

