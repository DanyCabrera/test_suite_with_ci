from decimal import Decimal

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Service, User
from app.security import hash_password

SERVICES: list[tuple[str, int, Decimal]] = [
    ("Corte", 30, Decimal("150.00")),
    ("Barba", 30, Decimal("100.00")),
    ("Corte y barba", 60, Decimal("220.00")),
    ("Cejas", 15, Decimal("50.00")),
]


def seed(db: Session) -> None:
    settings = get_settings()
    existing_names = {row.name for row in db.query(Service.name).all()}
    for name, duration, price in SERVICES:
        if name not in existing_names:
            db.add(Service(name=name, duration_minutes=duration, price=price))

    _ensure_user(
        db,
        email=settings.seed_admin_email,
        password=settings.seed_admin_password,
        full_name="Administración",
        role="admin",
    )
    _ensure_user(
        db,
        email=settings.seed_barber1_email,
        password=settings.seed_barber_password,
        full_name=settings.seed_barber1_name,
        role="barber",
        phone="5510000001",
    )
    _ensure_user(
        db,
        email=settings.seed_barber2_email,
        password=settings.seed_barber_password,
        full_name=settings.seed_barber2_name,
        role="barber",
        phone="5510000002",
    )


def _ensure_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    role: str,
    phone: str | None = None,
) -> None:
    existing = db.query(User).filter(User.email == email).one_or_none()
    if existing is not None:
        return
    db.add(
        User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            phone=phone,
            role=role,
        )
    )
