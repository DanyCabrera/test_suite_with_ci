from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Appointment, Service, User
from app.schemas import AvailabilityOut, BarberOut
from app.services.availability import business_zone, generate_slots

router = APIRouter(prefix="/barbers", tags=["barbers"])


def busy_intervals(db: Session, barber_id: int, day: date) -> list[tuple[datetime, datetime]]:
    zone = business_zone()
    day_start = datetime.combine(day, datetime.min.time(), tzinfo=zone)
    day_end = day_start + timedelta(days=1)
    rows = (
        db.query(Appointment)
        .filter(
            Appointment.barber_id == barber_id,
            Appointment.status != "cancelled",
            Appointment.start_at < day_end,
            Appointment.end_at > day_start,
        )
        .all()
    )
    return [(row.start_at, row.end_at) for row in rows]


@router.get("", response_model=list[BarberOut])
def list_barbers(db: Session = Depends(get_db)) -> list[User]:
    return db.query(User).filter(User.role == "barber").order_by(User.full_name).all()


@router.get("/{barber_id}/availability", response_model=AvailabilityOut)
def availability(
    barber_id: int,
    service_id: int,
    day: date = Query(alias="date"),
    db: Session = Depends(get_db),
) -> AvailabilityOut:
    barber = db.get(User, barber_id)
    if barber is None or barber.role != "barber":
        raise HTTPException(status_code=404, detail="Barbero no encontrado")
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    slots = generate_slots(
        day,
        service.duration_minutes,
        busy_intervals(db, barber_id, day),
    )
    return AvailabilityOut(date=day, slots=slots)
