from datetime import datetime, timedelta, timezone
from decimal import Decimal

import jwt
import pytest
from pydantic import ValidationError

from app.config import get_settings
from app.schemas import AppointmentIn, ServiceIn
from app.security import create_access_token, decode_token, hash_password, verify_password
from app.services.availability import generate_slots, is_within_schedule, next_open_day
from app.services.conflicts import overlaps
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Mexico_City")
DAY = datetime(2026, 10, 13, tzinfo=TZ).date()
BEFORE_OPEN = datetime(2026, 10, 13, 8, 0, tzinfo=TZ)


@pytest.fixture
def jwt_settings(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("JWT_SECRET", "unit-test-secret")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_thirty_minute_service_fills_the_workday():
    slots = generate_slots(DAY, 30, [], now=BEFORE_OPEN)
    assert len(slots) == 18
    assert slots[0].hour == 9 and slots[0].minute == 0
    assert slots[-1].hour == 17 and slots[-1].minute == 30


def test_hour_service_uses_its_own_block():
    slots = generate_slots(DAY, 60, [], now=BEFORE_OPEN)
    assert len(slots) == 9
    assert slots[1].hour == 10


def test_sunday_has_no_slots():
    sunday = datetime(2026, 10, 18, tzinfo=TZ).date()
    assert generate_slots(sunday, 30, [], now=datetime(2026, 10, 18, 8, 0, tzinfo=TZ)) == []


def test_busy_interval_removes_only_the_overlapping_slot():
    busy = [
        (
            datetime(2026, 10, 13, 9, 0, tzinfo=TZ),
            datetime(2026, 10, 13, 9, 30, tzinfo=TZ),
        )
    ]
    slots = generate_slots(DAY, 30, busy, now=BEFORE_OPEN)
    assert slots[0].hour == 9 and slots[0].minute == 30
    assert len(slots) == 17


def test_adjacent_appointments_do_not_overlap():
    first_end = datetime(2026, 10, 13, 9, 30, tzinfo=TZ)
    assert not overlaps(
        datetime(2026, 10, 13, 9, 0, tzinfo=TZ),
        first_end,
        first_end,
        datetime(2026, 10, 13, 10, 0, tzinfo=TZ),
    )


def test_partial_overlap_is_rejected():
    assert overlaps(
        datetime(2026, 10, 13, 9, 0, tzinfo=TZ),
        datetime(2026, 10, 13, 9, 30, tzinfo=TZ),
        datetime(2026, 10, 13, 9, 15, tzinfo=TZ),
        datetime(2026, 10, 13, 9, 45, tzinfo=TZ),
    )


def test_schedule_alignment():
    opening = datetime(2026, 10, 13, 9, 0, tzinfo=TZ)
    assert is_within_schedule(opening, 30, now=BEFORE_OPEN)
    assert not is_within_schedule(opening + timedelta(minutes=15), 30, now=BEFORE_OPEN)
    assert not is_within_schedule(datetime(2026, 10, 18, 9, 0, tzinfo=TZ), 30, now=BEFORE_OPEN)


def test_next_open_day_skips_sunday():
    assert next_open_day(datetime(2026, 10, 16, tzinfo=TZ).date()).isoformat() == "2026-10-17"
    assert next_open_day(datetime(2026, 10, 17, tzinfo=TZ).date()).isoformat() == "2026-10-19"


def test_password_roundtrip():
    hashed = hash_password("secreto123")
    assert hashed != "secreto123"
    assert verify_password("secreto123", hashed)
    assert not verify_password("otra-clave", hashed)


def test_token_roundtrip_and_invalid_token(jwt_settings):
    token = create_access_token(7, "client")
    payload = decode_token(token)
    assert payload["sub"] == "7"
    assert payload["role"] == "client"
    with pytest.raises(jwt.InvalidTokenError):
        decode_token("esto-no-es-un-jwt")


def test_duration_must_be_positive():
    with pytest.raises(ValidationError):
        ServiceIn(name="Corte", duration_minutes=0, price=Decimal("10.00"))


def test_past_appointment_is_rejected():
    with pytest.raises(ValidationError):
        AppointmentIn(
            barber_id=1,
            service_id=1,
            start_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
        )


def test_naive_datetime_is_rejected():
    with pytest.raises(ValidationError):
        AppointmentIn(
            barber_id=1,
            service_id=1,
            start_at=datetime(2035, 1, 2, 15, 0),
        )


def test_future_appointment_schema_accepts_timezone():
    payload = AppointmentIn(
        barber_id=1,
        service_id=1,
        start_at=datetime(2035, 1, 2, 15, 0, tzinfo=timezone.utc),
    )
    assert payload.barber_id == 1
