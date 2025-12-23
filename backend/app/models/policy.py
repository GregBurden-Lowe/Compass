from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import Base


class Policy(Base):
    complaint_id = Column(ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False, unique=True)
    policy_number = Column(String(128), index=True)
    insurer = Column(String(255))
    broker = Column(String(255))
    product = Column(String(255))
    scheme = Column(String(255))

    complaint = relationship("Complaint", back_populates="policy")

