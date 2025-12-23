from datetime import datetime, timedelta, timezone


def add_business_days(start: datetime, days: int) -> datetime:
    """Add business days (Mon-Fri) ignoring holidays."""
    current = start
    added = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:
            added += 1
    return current


def add_weeks(start: datetime, weeks: int) -> datetime:
    return start + timedelta(weeks=weeks)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)

