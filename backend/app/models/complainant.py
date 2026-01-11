from sqlalchemy import Column, String, ForeignKey, Date
from sqlalchemy.orm import relationship

from app.models.base import Base


class Complainant(Base):
    complaint_id = Column(ForeignKey("complaint.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(64))
    address = Column(String(500))
    date_of_birth = Column(Date, nullable=True)
    preferred_contact_method = Column(String(64))

    complaint = relationship("Complaint", back_populates="complainant")

