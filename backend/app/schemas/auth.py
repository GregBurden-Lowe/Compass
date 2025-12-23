from datetime import datetime
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str | None = None
    role: str | None = None
    exp: int | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    mfa_code: str | None = None
    recovery_code: str | None = None


class LoginResponse(Token):
    expires_at: datetime
    mfa_enrollment_required: bool = False
    mfa_remaining_skips: int = 0


class MFAEnrollResponse(BaseModel):
    secret: str
    otpauth_url: str


class MFAVerifyResponse(BaseModel):
    recovery_codes: list[str]

