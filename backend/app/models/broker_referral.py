from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class BrokerReferral(Base):
    __tablename__ = "broker_referral"
    complaint_id = Column(ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False, index=True)
    broker_identifier = Column(String(255), nullable=False)
    referred_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    what_was_sent = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    broker_ack_at = Column(DateTime(timezone=True), nullable=True)
    created_by_id = Column(ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    complaint = relationship("Complaint", back_populates="broker_referrals")
    created_by = relationship("User")
