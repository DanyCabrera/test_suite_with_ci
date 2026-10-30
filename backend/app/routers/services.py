from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import get_db, require_role
from app.models import Service, User
from app.schemas import ServiceIn, ServiceOut, ServiceUpdate

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceOut])
def list_services(db: Session = Depends(get_db)) -> list[Service]:
    return db.query(Service).order_by(Service.id).all()


@router.post("", response_model=ServiceOut, status_code=201)
def create_service(
    payload: ServiceIn,
    _: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> Service:
    service = Service(
        name=payload.name,
        duration_minutes=payload.duration_minutes,
        price=payload.price,
    )
    db.add(service)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un servicio con ese nombre") from None
    db.refresh(service)
    return service


@router.patch("/{service_id}", response_model=ServiceOut)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    _: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(service, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ya existe un servicio con ese nombre") from None
    db.refresh(service)
    return service
