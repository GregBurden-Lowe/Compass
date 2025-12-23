from sqlalchemy import Column, String, Enum as SqlEnum, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import CommunicationChannel, CommunicationDirection


class Communication(Base):
    complaint_id = Column(ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(ForeignKey("user.id"), nullable=True)
    channel = Column(SqlEnum(CommunicationChannel), nullable=False)
    direction = Column(SqlEnum(CommunicationDirection), nullable=False)
    summary = Column(String(1000), nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_final_response = Column(Boolean, nullable=False, server_default=func.false())

    complaint = relationship("Complaint", back_populates="communications")
    attachments = relationship("Attachment", back_populates="communication", cascade="all, delete-orphan")

