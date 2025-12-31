from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.enums import UserRole
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    mfa_enabled: bool = False
    mfa_skip_count: int = 0
    must_change_password: bool = False


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = None


class UserOut(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

