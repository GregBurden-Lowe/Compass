#!/usr/bin/env python3
"""
Backfill complaint.acknowledged_at from acknowledgement communications.

Dry run by default:
    python backfill_acknowledged_at.py

Apply changes:
    python backfill_acknowledged_at.py --apply
"""

from __future__ import annotations

import argparse

from sqlalchemy import func

from app.db import base  # noqa: F401  # ensure models are registered
from app.db.session import SessionLocal
from app.models.complaint import Complaint
from app.models.communication import Communication
from app.services.complaints import refresh_breach_flags


def backfill(*, apply_changes: bool) -> None:
    db = SessionLocal()
    try:
        rows = (
            db.query(
                Complaint,
                func.min(Communication.occurred_at).label("acknowledged_at"),
            )
            .join(Communication, Communication.complaint_id == Complaint.id)
            .filter(Complaint.acknowledged_at.is_(None))
            .filter(Communication.kind == "acknowledgement")
            .filter(Communication.is_internal.is_(False))
            .group_by(Complaint.id)
            .all()
        )

        if not rows:
            print("No complaints found with missing acknowledged_at and an acknowledgement communication.")
            return

        print(f"Found {len(rows)} complaint(s) to backfill.")

        updated = 0
        for complaint, acknowledged_at in rows:
            complaint.acknowledged_at = acknowledged_at
            refresh_breach_flags(complaint)

            print(
                f"{complaint.reference}: set acknowledged_at={acknowledged_at.isoformat()} "
                f"ack_breached={complaint.ack_breached}"
            )
            updated += 1

        if apply_changes:
            db.commit()
            print(f"Applied updates to {updated} complaint(s).")
        else:
            db.rollback()
            print("Dry run only. Re-run with --apply to commit changes.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill complaint acknowledged_at from acknowledgement communications.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Commit changes. Without this flag the script runs as a dry run.",
    )
    args = parser.parse_args()
    backfill(apply_changes=args.apply)


if __name__ == "__main__":
    main()
