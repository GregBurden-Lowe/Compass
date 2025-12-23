from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.base import Base


class ComplaintEvent(Base):
    __tablename__ = "complaint_event"
    complaint_id = Column(ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(128), nullable=False)
    description = Column(String(1000))
    created_by_id = Column(ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    complaint = relationship("Complaint", back_populates="events")
    created_by = relationship("User")

    @property
    def created_by_name(self) -> str | None:
        return self.created_by.full_name if self.created_by else None

