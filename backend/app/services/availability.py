from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.config import get_settings
from app.services.conflicts import has_conflict, same_instant

OPEN = time(9, 0)
CLOSE = time(18, 0)


def business_zone() -> ZoneInfo:
    return ZoneInfo(get_settings().timezone)


def next_open_day(today: date | None = None) -> date:
    if today is None:
        today = datetime.now(business_zone()).date()
    cursor = today + timedelta(days=1)
    while cursor.weekday() == 6:
        cursor += timedelta(days=1)
    return cursor


def generate_slots(
    day: date,
    duration_minutes: int,
    busy: list[tuple[datetime, datetime]],
    now: datetime | None = None,
) -> list[datetime]:
    if day.weekday() == 6 or duration_minutes <= 0:
        return []

    zone = business_zone()
    current = datetime.now(zone) if now is None else now.astimezone(zone)
    opening = datetime.combine(day, OPEN, tzinfo=zone)
    closing = datetime.combine(day, CLOSE, tzinfo=zone)
    step = timedelta(minutes=duration_minutes)
    normalized = [(start.astimezone(zone), end.astimezone(zone)) for start, end in busy]

    slots: list[datetime] = []
    cursor = opening
    while cursor + step <= closing:
        end = cursor + step
        if cursor > current and not has_conflict(cursor, end, normalized):
            slots.append(cursor)
        cursor += step
    return slots


def is_within_schedule(start: datetime, duration_minutes: int, now: datetime | None = None) -> bool:
    local = start.astimezone(business_zone())
    slots = generate_slots(local.date(), duration_minutes, [], now=now)
    return any(same_instant(slot, start) for slot in slots)
