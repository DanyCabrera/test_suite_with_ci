from datetime import datetime, timezone


def same_instant(left: datetime, right: datetime) -> bool:
    return left.astimezone(timezone.utc) == right.astimezone(timezone.utc)


def overlaps(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    return start_a < end_b and start_b < end_a


def has_conflict(start: datetime, end: datetime, intervals: list[tuple[datetime, datetime]]) -> bool:
    return any(overlaps(start, end, busy_start, busy_end) for busy_start, busy_end in intervals)
