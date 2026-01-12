from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas


@dataclass(frozen=True)
class TimelineItem:
    when: datetime
    label: str
    details: str


def _fmt_dt(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    # Keep it simple + consistent (UK-friendly)
    return dt.strftime("%d %b %Y %H:%M")


def build_timeline_pdf(
    *,
    reference: str,
    complainant_name: str | None,
    complaint_summary: str | None,
    items: Iterable[TimelineItem],
    outcome_summary: str | None,
    redress_summary: str | None,
) -> bytes:
    """
    Generate a simple, printable PDF timeline similar to the team's current Word/PDF timeline format.
    This is intentionally minimal (no external rendering engines).
    """
    # reportlab expects a filename or a file-like buffer
    import io
    out = io.BytesIO()
    c = canvas.Canvas(out, pagesize=A4)

    width, height = A4
    left = 18 * mm
    right = 18 * mm
    top = 18 * mm
    bottom = 18 * mm

    y = height - top

    def new_page():
        nonlocal y
        c.showPage()
        y = height - top

    def draw_paragraph(text: str, font: str = "Helvetica", size: int = 10, leading: int = 14):
        nonlocal y
        if not text:
            return
        c.setFont(font, size)
        lines = simpleSplit(text, font, size, width - left - right)
        for line in lines:
            if y <= bottom + leading:
                new_page()
                c.setFont(font, size)
            c.drawString(left, y, line)
            y -= leading

    def draw_spacer(px: int = 10):
        nonlocal y
        y -= px

    # Title
    c.setFont("Helvetica-Bold", 14)
    c.drawString(left, y, f"Complaint Timeline — {reference}")
    y -= 18

    # Header metadata
    c.setFont("Helvetica", 10)
    if complainant_name:
        c.drawString(left, y, f"Complainant: {complainant_name}")
        y -= 14
    c.drawString(left, y, f"Generated: {_fmt_dt(datetime.utcnow())} (UTC)")
    y -= 18

    if complaint_summary:
        c.setFont("Helvetica-Bold", 11)
        c.drawString(left, y, "Complaint Summary")
        y -= 16
        draw_paragraph(complaint_summary, font="Helvetica", size=10, leading=14)
        draw_spacer(10)

    c.setFont("Helvetica-Bold", 11)
    c.drawString(left, y, "Timeline")
    y -= 16

    for idx, item in enumerate(sorted(items, key=lambda i: i.when)):
        line = f"{idx + 1}. {_fmt_dt(item.when)} — {item.label}"
        c.setFont("Helvetica-Bold", 10)
        if y <= bottom + 16:
            new_page()
        c.drawString(left, y, line)
        y -= 14
        draw_paragraph(item.details, font="Helvetica", size=10, leading=14)
        draw_spacer(6)

    if outcome_summary:
        draw_spacer(6)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(left, y, "Outcome")
        y -= 16
        draw_paragraph(outcome_summary, font="Helvetica", size=10, leading=14)

    if redress_summary:
        draw_spacer(10)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(left, y, "Redress")
        y -= 16
        draw_paragraph(redress_summary, font="Helvetica", size=10, leading=14)

    c.setFont("Helvetica-Oblique", 8)
    draw_spacer(14)
    draw_paragraph(
        "Internal document. Generated from Compass records; verify any external-facing details before sharing.",
        font="Helvetica-Oblique",
        size=8,
        leading=12,
    )

    c.save()
    return out.getvalue()


