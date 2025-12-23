from sqlalchemy import Column, String, Boolean, Enum as SqlEnum, DateTime, Integer
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func

from app.models.base import Base
from app.models.enums import UserRole


class User(Base):
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SqlEnum(UserRole), nullable=False, default=UserRole.read_only)
    is_active = Column(Boolean, default=True, nullable=False)
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    totp_secret = Column(String(64), nullable=True)
    recovery_codes = Column(ARRAY(String), nullable=True)
    mfa_skip_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

