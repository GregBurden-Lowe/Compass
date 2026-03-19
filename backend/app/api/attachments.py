"""Attachment preview endpoints.

Provides:
  GET /attachments/{attachment_id}/preview — parse EML/MSG files and return
    structured JSON (headers + HTML/plain body) for in-app rendering without
    requiring the user to download and open the file locally.

Supported formats
-----------------
  .eml  — RFC 2822 email (parsed via Python stdlib ``email`` module)
  .msg  — Microsoft Outlook binary format (parsed via ``extract-msg``)

Security
--------
The endpoint returns raw HTML sourced from email bodies.  The frontend is
responsible for rendering this inside a sandboxed <iframe> with no
``allow-scripts`` permission so that JavaScript in the email cannot execute.
"""

import email as email_lib
import email.policy
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.attachment import Attachment
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/attachments", tags=["attachments"])


# ── Response schema ───────────────────────────────────────────────────────────

class EmailPreviewResponse(BaseModel):
    subject: str
    from_: str
    to: str
    cc: Optional[str] = None
    date: Optional[str] = None
    html_body: Optional[str] = None
    plain_body: Optional[str] = None
    has_html: bool

    model_config = {"populate_by_name": True}


# ── EML parser (Python stdlib) ────────────────────────────────────────────────

def _parse_eml(path: str) -> EmailPreviewResponse:
    """Parse an RFC 2822 .eml file using the Python stdlib email module."""
    with open(path, "rb") as fh:
        raw = fh.read()

    msg = email_lib.message_from_bytes(raw, policy=email_lib.policy.default)

    html_body: Optional[str] = None
    plain_body: Optional[str] = None

    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            disp = str(part.get("Content-Disposition", ""))
            # Skip file attachments — we only want the message body parts.
            if "attachment" in disp:
                continue
            if ct == "text/html" and html_body is None:
                try:
                    html_body = part.get_content()
                except Exception:
                    raw_payload = part.get_payload(decode=True)
                    if isinstance(raw_payload, bytes):
                        html_body = raw_payload.decode("utf-8", errors="replace")
            elif ct == "text/plain" and plain_body is None:
                try:
                    plain_body = part.get_content()
                except Exception:
                    raw_payload = part.get_payload(decode=True)
                    if isinstance(raw_payload, bytes):
                        plain_body = raw_payload.decode("utf-8", errors="replace")
    else:
        ct = msg.get_content_type()
        try:
            body_text = msg.get_content()
        except Exception:
            raw_payload = msg.get_payload(decode=True)
            body_text = (
                raw_payload.decode("utf-8", errors="replace")
                if isinstance(raw_payload, bytes)
                else str(raw_payload or "")
            )
        if ct == "text/html":
            html_body = body_text
        else:
            plain_body = body_text

    return EmailPreviewResponse(
        subject=str(msg.get("Subject", "") or ""),
        from_=str(msg.get("From", "") or ""),
        to=str(msg.get("To", "") or ""),
        cc=str(msg.get("Cc", "") or "") or None,
        date=str(msg.get("Date", "") or "") or None,
        html_body=html_body,
        plain_body=plain_body,
        has_html=html_body is not None,
    )


# ── MSG parser (extract-msg) ──────────────────────────────────────────────────

def _parse_msg(path: str) -> EmailPreviewResponse:
    """Parse a Microsoft Outlook .msg file using the extract-msg library."""
    try:
        import extract_msg  # type: ignore[import]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=(
                "MSG file parsing is not available — the extract-msg library "
                "is not installed. Add `extract-msg>=0.28.0` to requirements.txt "
                "and rebuild the container."
            ),
        )

    msg = extract_msg.Message(path)
    try:
        html_body: Optional[str] = msg.htmlBody
        if isinstance(html_body, bytes):
            html_body = html_body.decode("utf-8", errors="replace")
        # Some versions return empty string instead of None for missing bodies.
        html_body = html_body or None

        plain_body: Optional[str] = msg.body or None

        date_str: Optional[str] = None
        if msg.date:
            try:
                date_str = msg.date.isoformat()
            except Exception:
                date_str = str(msg.date)

        return EmailPreviewResponse(
            subject=msg.subject or "",
            from_=msg.sender or "",
            to=msg.to or "",
            cc=msg.cc or None,
            date=date_str,
            html_body=html_body,
            plain_body=plain_body,
            has_html=bool(html_body),
        )
    finally:
        msg.close()


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/{attachment_id}/preview", response_model=EmailPreviewResponse)
def preview_email_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EmailPreviewResponse:
    """Parse an EML or MSG attachment and return structured email content.

    Only ``.eml`` and ``.msg`` files are supported.  All other file types
    return HTTP 422.  The caller is responsible for rendering the returned
    HTML inside a sandboxed environment.
    """
    attachment = (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id, Attachment.deleted_at.is_(None))
        .first()
    )
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found.",
        )

    name_lower = attachment.file_name.lower()
    ct = (attachment.content_type or "").lower()

    is_eml = name_lower.endswith(".eml") or ct == "message/rfc822"
    is_msg = name_lower.endswith(".msg") or ct in (
        "application/vnd.ms-outlook",
        "application/x-msg",
    )

    if not (is_eml or is_msg):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only .eml and .msg files can be previewed in-app.",
        )

    path = attachment.storage_path
    if not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment file not found on server.",
        )

    try:
        if is_eml:
            return _parse_eml(path)
        else:
            return _parse_msg(path)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Failed to parse email attachment %s: %s", attachment_id, exc
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse email file: {exc}",
        )
