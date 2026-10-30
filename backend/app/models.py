from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role in ('client', 'barber', 'admin')", name="ck_users_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    role: Mapped[str] = mapped_column(String(20))


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    duration_minutes: Mapped[int] = mapped_column()
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint(
            "status in ('scheduled', 'cancelled', 'completed')",
            name="ck_appointments_status",
        ),
        Index("ix_appointments_barber_start", "barber_id", "start_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    barber_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="scheduled")

    client: Mapped[User] = relationship(foreign_keys=[client_id], lazy="joined")
    barber: Mapped[User] = relationship(foreign_keys=[barber_id], lazy="joined")
    service: Mapped[Service] = relationship(lazy="joined")
