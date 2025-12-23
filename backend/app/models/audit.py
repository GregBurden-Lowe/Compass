from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class AuditLog(Base):
    complaint_id = Column(ForeignKey("complaint.id", ondelete="SET NULL"), nullable=True, index=True)
    entity = Column(String(255), nullable=False)
    field = Column(String(255), nullable=False)
    old_value = Column(String(2000))
    new_value = Column(String(2000))
    changed_by_id = Column(ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    complaint = relationship("Complaint", back_populates="audit_logs")

