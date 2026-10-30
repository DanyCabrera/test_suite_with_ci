from datetime import date, datetime, timezone
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: str | None
    role: str

    model_config = ConfigDict(from_attributes=True)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=8, max_length=20, pattern=r"^[0-9+\-\s]+$")

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("full_name", "phone", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ServiceIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    duration_minutes: int = Field(gt=0, le=480)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    duration_minutes: int | None = Field(default=None, gt=0, le=480)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class ServiceOut(BaseModel):
    id: int
    name: str
    duration_minutes: int
    price: Decimal

    model_config = ConfigDict(from_attributes=True)


class BarberOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class AppointmentIn(BaseModel):
    barber_id: int
    service_id: int
    start_at: datetime

    @field_validator("start_at")
    @classmethod
    def must_be_future(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
            raise ValueError("La fecha debe incluir zona horaria")
        if value <= datetime.now(timezone.utc):
            raise ValueError("No se pueden reservar citas en el pasado")
        return value


class AppointmentOut(BaseModel):
    id: int
    client_id: int
    client_name: str
    barber_id: int
    barber_name: str
    service_id: int
    service_name: str
    start_at: datetime
    end_at: datetime
    status: str


class AvailabilityOut(BaseModel):
    date: date
    slots: list[datetime]
