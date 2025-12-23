from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SqlEnum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import TaskStatus


class Task(Base):
    complaint_id = Column(ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(1000))
    status = Column(SqlEnum(TaskStatus), default=TaskStatus.open, nullable=False)
    due_date = Column(DateTime(timezone=True))
    assigned_to_id = Column(ForeignKey("user.id"), nullable=True)
    is_checklist = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    complaint = relationship("Complaint", backref="tasks")

