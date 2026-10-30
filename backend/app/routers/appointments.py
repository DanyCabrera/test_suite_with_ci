from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.deps import get_db, require_role
from app.models import Appointment, Service, User
from app.schemas import AppointmentIn, AppointmentOut
from app.services.availability import business_zone, is_within_schedule

router = APIRouter(prefix="/appointments", tags=["appointments"])


def serialize(appointment: Appointment) -> AppointmentOut:
    return AppointmentOut(
        id=appointment.id,
        client_id=appointment.client_id,
        client_name=appointment.client.full_name,
        barber_id=appointment.barber_id,
        barber_name=appointment.barber.full_name,
        service_id=appointment.service_id,
        service_name=appointment.service.name,
        start_at=appointment.start_at,
        end_at=appointment.end_at,
        status=appointment.status,
    )


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(
    payload: AppointmentIn,
    user: User = Depends(require_role("client")),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    barber = db.get(User, payload.barber_id)
    if barber is None or barber.role != "barber":
        raise HTTPException(status_code=404, detail="Barbero no encontrado")
    service = db.get(Service, payload.service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if not is_within_schedule(payload.start_at, service.duration_minutes):
        raise HTTPException(status_code=400, detail="Horario no disponible")

    end_at = payload.start_at + timedelta(minutes=service.duration_minutes)
    db.query(User).filter(User.id == barber.id).with_for_update().one()
    conflict = (
        db.query(Appointment)
        .filter(
            Appointment.barber_id == barber.id,
            Appointment.status != "cancelled",
            Appointment.start_at < end_at,
            Appointment.end_at > payload.start_at,
        )
        .first()
    )
    if conflict is not None:
        raise HTTPException(status_code=409, detail="El horario ya está ocupado")

    appointment = Appointment(
        client_id=user.id,
        barber_id=barber.id,
        service_id=service.id,
        start_at=payload.start_at,
        end_at=end_at,
        status="scheduled",
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return serialize(appointment)


@router.get("/me", response_model=list[AppointmentOut])
def my_appointments(
    user: User = Depends(require_role("client")),
    db: Session = Depends(get_db),
) -> list[AppointmentOut]:
    rows = (
        db.query(Appointment)
        .filter(Appointment.client_id == user.id)
        .order_by(Appointment.start_at.desc())
        .all()
    )
    return [serialize(row) for row in rows]


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    day: date | None = Query(default=None, alias="date"),
    barber_id: int | None = None,
    user: User = Depends(require_role("barber", "admin")),
    db: Session = Depends(get_db),
) -> list[AppointmentOut]:
    if user.role == "barber":
        if barber_id is not None and barber_id != user.id:
            raise HTTPException(status_code=403, detail="No puedes ver la agenda de otro barbero")
        barber_id = user.id

    query = db.query(Appointment)
    if barber_id is not None:
        query = query.filter(Appointment.barber_id == barber_id)
    if day is not None:
        zone = business_zone()
        start = datetime.combine(day, datetime.min.time(), tzinfo=zone)
        query = query.filter(Appointment.start_at >= start, Appointment.start_at < start + timedelta(days=1))

    rows = query.order_by(Appointment.start_at.asc()).all()
    return [serialize(row) for row in rows]


@router.patch("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel_appointment(
    appointment_id: int,
    user: User = Depends(require_role("client")),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if appointment.client_id != user.id:
        raise HTTPException(status_code=403, detail="No puedes cancelar esta cita")
    if appointment.status != "scheduled":
        raise HTTPException(status_code=400, detail="La cita no está programada")
    appointment.status = "cancelled"
    db.commit()
    db.refresh(appointment)
    return serialize(appointment)


@router.patch("/{appointment_id}/complete", response_model=AppointmentOut)
def complete_appointment(
    appointment_id: int,
    user: User = Depends(require_role("barber", "admin")),
    db: Session = Depends(get_db),
) -> AppointmentOut:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if user.role == "barber" and appointment.barber_id != user.id:
        raise HTTPException(status_code=403, detail="No puedes modificar la cita de otro barbero")
    if appointment.status != "scheduled":
        raise HTTPException(status_code=400, detail="La cita no está programada")
    appointment.status = "completed"
    db.commit()
    db.refresh(appointment)
    return serialize(appointment)
