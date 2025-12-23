from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func

from app.models.base import Base


class Broker(Base):
    name = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


