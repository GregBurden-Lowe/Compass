from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import os

from app.models.base import Base


class Attachment(Base):
    communication_id = Column(ForeignKey("communication.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    content_type = Column(String(128), nullable=False)
    storage_path = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    communication = relationship("Communication", back_populates="attachments")

    @property
    def url(self) -> str:
        # Expose a path served by StaticFiles mount
        filename = os.path.basename(self.storage_path)
        return f"/attachments/{filename}"

