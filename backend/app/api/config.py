"""Feature flags and config for frontend (FCA DISP compliance). All flags default OFF."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.models.user import User

router = APIRouter(prefix="/config", tags=["config"])


class FeaturesOut(BaseModel):
    require_final_response_evidence: bool = False
    require_outbound_before_close: bool = False
    enable_deadline_notifications: bool = False
    enable_support_needs: bool = False
    enable_delay_response_kind: bool = False
    enable_broker_referral: bool = False
    enable_attachment_hashing: bool = False
    restrict_vulnerability_notes: bool = False
    no_outbound_days_warning: int = 14


@router.get("/features", response_model=FeaturesOut)
def get_features(
    current_user: User = Depends(get_current_user),
):
    """Return feature flags for frontend. Authenticated only."""
    s = get_settings()
    return FeaturesOut(
        require_final_response_evidence=getattr(s, "require_final_response_evidence", False),
        require_outbound_before_close=getattr(s, "require_outbound_before_close", False),
        enable_deadline_notifications=getattr(s, "enable_deadline_notifications", False),
        enable_support_needs=getattr(s, "enable_support_needs", False),
        enable_delay_response_kind=getattr(s, "enable_delay_response_kind", False),
        enable_broker_referral=getattr(s, "enable_broker_referral", False),
        enable_attachment_hashing=getattr(s, "enable_attachment_hashing", False),
        restrict_vulnerability_notes=getattr(s, "restrict_vulnerability_notes", False),
        no_outbound_days_warning=getattr(s, "no_outbound_days_warning", 14),
    )
