#!/usr/bin/env python3
"""
Recalculate SLA breach flags for existing complaints using current service logic.

Dry run by default:
    python backfill_sla_flags.py

Apply changes:
    python backfill_sla_flags.py --apply
"""

from __future__ import annotations

import argparse

from app.db import base  # noqa: F401  # ensure models are registered
from app.db.session import SessionLocal
from app.models.complaint import Complaint
from app.services.complaints import refresh_breach_flags


def backfill(*, apply_changes: bool) -> None:
    db = SessionLocal()
    try:
        complaints = db.query(Complaint).all()
        changed = 0

        for complaint in complaints:
            old_ack = complaint.ack_breached
            old_final = complaint.final_breached

            refresh_breach_flags(complaint)

            if complaint.ack_breached != old_ack or complaint.final_breached != old_final:
                changed += 1
                print(
                    f"{complaint.reference}: "
                    f"ack_breached {old_ack} -> {complaint.ack_breached}, "
                    f"final_breached {old_final} -> {complaint.final_breached}"
                )

        if changed == 0:
            print("No complaints needed SLA flag updates.")
        elif apply_changes:
            db.commit()
            print(f"Applied SLA flag updates to {changed} complaint(s).")
        else:
            db.rollback()
            print(f"Dry run only. {changed} complaint(s) would be updated. Re-run with --apply to commit.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Recalculate complaint SLA breach flags.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Commit changes. Without this flag the script runs as a dry run.",
    )
    args = parser.parse_args()
    backfill(apply_changes=args.apply)


if __name__ == "__main__":
    main()
