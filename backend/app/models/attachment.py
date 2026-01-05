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
        # Expose a path served by StaticFiles mount at /attachments
        # Extract filename from storage_path (handles both relative and absolute paths)
        # The storage_path is the full absolute path like /app/storage/attachments/1736179200.123-filename.pdf
        # We need just the filename part (with timestamp prefix) for the URL
        filename = os.path.basename(self.storage_path)
        # Ensure URL is absolute from root (nginx will proxy /attachments/ to backend)
        # URL format: /attachments/1736179200.123-filename.pdf
        return f"/attachments/{filename}"

