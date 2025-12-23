from datetime import timedelta, datetime, timezone
import secrets

import pyotp
from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password, get_password_hash
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, MFAEnrollResponse, MFAVerifyResponse
from app.schemas.user import UserOut
from app.core.config import get_settings
from app.api.deps import get_current_user, require_roles
from app.models.enums import UserRole

router = APIRouter(prefix="/auth", tags=["auth"])


def _generate_recovery_codes(count: int = 8) -> list[str]:
    return [secrets.token_hex(4) for _ in range(count)]


def _verify_totp(secret: str | None, code: str | None) -> bool:
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


@router.post("/token", response_model=LoginResponse)
def login(form: LoginRequest, db: Session = Depends(get_db)):
    user: User | None = db.query(User).filter(User.email == form.email).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials")

    if user.mfa_enabled:
        # Allow recovery code or TOTP
        if form.recovery_code:
            matched_index = None
            for idx, hashed in enumerate(user.recovery_codes or []):
                if verify_password(form.recovery_code, hashed):
                    matched_index = idx
                    break
            if matched_index is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid recovery code")
            remaining = list(user.recovery_codes or [])
            remaining.pop(matched_index)
            user.recovery_codes = remaining
            db.add(user)
            db.commit()
            db.refresh(user)
        elif form.mfa_code:
            if not _verify_totp(user.totp_secret, form.mfa_code):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code")
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="MFA code required")

    settings = get_settings()
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expire_time = datetime.now(timezone.utc) + expires_delta
    token = create_access_token({"sub": str(user.id), "role": user.role}, expires_delta=expires_delta)

    # Determine enrollment requirement
    remaining_skips = max(0, 3 - (user.mfa_skip_count or 0)) if not user.mfa_enabled else 0
    return LoginResponse(
        access_token=token,
        expires_at=expire_time,
        mfa_enrollment_required=not user.mfa_enabled,
        mfa_remaining_skips=remaining_skips,
    )


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/mfa/status")
def mfa_status(current_user: User = Depends(get_current_user)):
    return {"mfa_enabled": current_user.mfa_enabled}


@router.post("/mfa/enroll", response_model=MFAEnrollResponse)
def mfa_enroll(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.mfa_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA already enabled")
    secret = pyotp.random_base32()
    settings = get_settings()
    otpauth_url = pyotp.TOTP(secret).provisioning_uri(name=current_user.email, issuer_name=settings.app_name)
    current_user.totp_secret = secret
    current_user.recovery_codes = None
    current_user.mfa_enabled = False
    db.add(current_user)
    db.commit()
    return MFAEnrollResponse(secret=secret, otpauth_url=otpauth_url)


@router.post("/mfa/verify", response_model=MFAVerifyResponse)
def mfa_verify(
    code: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA not enrolled")
    if not _verify_totp(current_user.totp_secret, code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code")
    recovery_codes = _generate_recovery_codes()
    hashed_codes = [get_password_hash(c) for c in recovery_codes]
    current_user.mfa_enabled = True
    current_user.recovery_codes = hashed_codes
    current_user.mfa_skip_count = 0
    db.add(current_user)
    db.commit()
    return MFAVerifyResponse(recovery_codes=recovery_codes)


@router.post("/mfa/reset/{user_id}")
def mfa_reset(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin])),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.totp_secret = None
    user.mfa_enabled = False
    user.recovery_codes = None
    user.mfa_skip_count = 0
    db.add(user)
    db.commit()
    return {"status": "reset"}


@router.post("/mfa/recovery/{user_id}/regenerate", response_model=MFAVerifyResponse)
def mfa_regenerate_recovery_codes(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([UserRole.admin])),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA not enrolled")
    recovery_codes = _generate_recovery_codes()
    hashed_codes = [get_password_hash(c) for c in recovery_codes]
    user.recovery_codes = hashed_codes
    db.add(user)
    db.commit()
    return MFAVerifyResponse(recovery_codes=recovery_codes)


@router.post("/mfa/skip")
def mfa_skip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.mfa_enabled:
        return {"remaining_skips": 0}
    if (current_user.mfa_skip_count or 0) >= 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA enrollment required")
    current_user.mfa_skip_count = (current_user.mfa_skip_count or 0) + 1
    db.add(current_user)
    db.commit()
    remaining = max(0, 3 - (current_user.mfa_skip_count or 0))
    return {"remaining_skips": remaining}

