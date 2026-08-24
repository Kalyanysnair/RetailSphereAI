from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/fleet", tags=["Fleet Management"])

class VehicleCreatePayload(BaseModel):
    registration_number: str
    vehicle_type: str = "Mini Truck"
    capacity: int = 500
    assigned_driver_id: Optional[int] = None
    status: Optional[str] = "AVAILABLE"
    notes: Optional[str] = None
    model_name: Optional[str] = None
    year: Optional[int] = None

class VehicleUpdatePayload(BaseModel):
    registration_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    capacity: Optional[int] = None
    assigned_driver_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    model_name: Optional[str] = None
    year: Optional[int] = None

class StatusUpdatePayload(BaseModel):
    status: str

def format_vehicle_dict(v: models.Vehicle, db: Session) -> dict:
    driver_name = "Unassigned"
    if v.assigned_driver:
        driver_name = v.assigned_driver.full_name
    elif v.assigned_driver_id:
        u = db.query(models.User).filter(models.User.user_id == v.assigned_driver_id).first()
        if u:
            driver_name = u.full_name

    code_num = f"VH-{v.vehicle_id:03d}" if v.vehicle_id else "VH-000"

    return {
        "id": code_num,
        "vehicle_id": v.vehicle_id,
        "registration_number": v.registration_number,
        "vehicle_type": v.vehicle_type,
        "capacity": v.capacity,
        "assigned_driver_id": v.assigned_driver_id,
        "assigned_driver_name": driver_name,
        "status": v.status,
        "notes": v.notes or "",
        "model_name": v.model_name or "",
        "year": v.year,
        "created_at": v.created_at.isoformat() if v.created_at else None,
        "updated_at": v.updated_at.isoformat() if v.updated_at else None,
    }

@router.get("/summary")
def get_fleet_summary(db: Session = Depends(get_db)):
    vehicles = db.query(models.Vehicle).all()

    total = len(vehicles)
    available = sum(1 for v in vehicles if v.status == "AVAILABLE")
    assigned = sum(1 for v in vehicles if v.status == "ASSIGNED")
    maintenance = sum(1 for v in vehicles if v.status == "MAINTENANCE")
    inactive = sum(1 for v in vehicles if v.status == "INACTIVE")

    # Fetch active internal deliveries
    active_fulfillments = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.vehicle_id.isnot(None),
        models.OrderFulfillment.delivery_status != "DELIVERED",
        models.OrderFulfillment.fulfillment_status != "Delivered"
    ).all()

    active_deliveries = []
    for f in active_fulfillments:
        v = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == f.vehicle_id).first()
        ord_obj = f.order
        cust_name = ord_obj.customer_name if ord_obj else "Customer"
        driver_name = "Unassigned"
        if f.driver_user:
            driver_name = f.driver_user.full_name
        elif v and v.assigned_driver:
            driver_name = v.assigned_driver.full_name

        active_deliveries.append({
            "fulfillment_id": f.fulfillment_id,
            "order_id": f"RET-{f.order_id:06d}" if f.order_id else f"RET-{f.fulfillment_id}",
            "raw_order_id": f.order_id,
            "vehicle_code": f"VH-{v.vehicle_id:03d}" if v else "VH-000",
            "registration_number": v.registration_number if v else "N/A",
            "vehicle_type": v.vehicle_type if v else "Delivery Vehicle",
            "driver_name": driver_name,
            "status": f.delivery_status or "Out for Delivery",
            "dispatch_date": f.dispatched_at.strftime("%d %b %Y") if f.dispatched_at else "Recent",
            "expected_delivery_date": f.expected_delivery_date or "Pending",
            "customer_name": cust_name
        })

    return {
        "summary": {
            "total": total,
            "available": available,
            "assigned": assigned,
            "maintenance": maintenance,
            "inactive": inactive
        },
        "active_deliveries": active_deliveries
    }


@router.get("/vehicles")
def list_vehicles(
    status_filter: Optional[str] = Query(None, alias="status"),
    include_inactive: bool = Query(True),
    db: Session = Depends(get_db)
):
    query = db.query(models.Vehicle)

    if status_filter:
        query = query.filter(models.Vehicle.status == status_filter.upper())
    elif not include_inactive:
        query = query.filter(models.Vehicle.status != "INACTIVE")

    vehicles = query.order_by(models.Vehicle.vehicle_id.asc()).all()
    return [format_vehicle_dict(v, db) for v in vehicles]


@router.get("/vehicles/available")
def list_available_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(models.Vehicle).filter(models.Vehicle.status == "AVAILABLE").order_by(models.Vehicle.vehicle_id.asc()).all()
    return [format_vehicle_dict(v, db) for v in vehicles]


@router.get("/vehicles/{vehicle_id}")
def get_vehicle_details(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle #{vehicle_id} not found.")

    formatted = format_vehicle_dict(vehicle, db)

    # Active Assignment
    active_assignment = None
    if vehicle.status == "ASSIGNED":
        active_f = db.query(models.OrderFulfillment).filter(
            models.OrderFulfillment.vehicle_id == vehicle_id,
            models.OrderFulfillment.delivery_status != "DELIVERED",
            models.OrderFulfillment.fulfillment_status != "Delivered"
        ).order_by(models.OrderFulfillment.fulfillment_id.desc()).first()

        if active_f:
            ord_obj = active_f.order
            active_assignment = {
                "order_id": f"RET-{active_f.order_id:06d}" if active_f.order_id else f"RET-{active_f.fulfillment_id}",
                "raw_order_id": active_f.order_id,
                "customer": ord_obj.customer_name if ord_obj else "Store Customer",
                "customer_email": ord_obj.customer_email if ord_obj else "",
                "dispatch_date": active_f.dispatched_at.strftime("%d %b %Y, %I:%M %p") if active_f.dispatched_at else "Recent",
                "expected_delivery_date": active_f.expected_delivery_date or "To be delivered",
                "order_status": ord_obj.order_status if ord_obj else active_f.fulfillment_status
            }

    # Delivery History
    history_fulfillments = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.vehicle_id == vehicle_id
    ).order_by(models.OrderFulfillment.fulfillment_id.desc()).limit(50).all()

    history = []
    for h in history_fulfillments:
        ord_obj = h.order
        history.append({
            "order_id": f"RET-{h.order_id:06d}" if h.order_id else f"RET-{h.fulfillment_id}",
            "customer": ord_obj.customer_name if ord_obj else "Store Customer",
            "dispatch_date": h.dispatched_at.strftime("%d %b %Y") if h.dispatched_at else (h.updated_at.strftime("%d %b %Y") if h.updated_at else "Recent"),
            "delivery_status": h.delivery_status or h.fulfillment_status or "Dispatched"
        })

    return {
        "vehicle": formatted,
        "current_assignment": active_assignment,
        "delivery_history": history
    }


@router.get("/drivers")
def list_eligible_drivers(db: Session = Depends(get_db)):
    """
    Returns list of active staff/workers with Driver capability (is_driver == True).
    """
    drivers = db.query(models.User).filter(
        models.User.is_driver == True,
        models.User.status == True,
        models.User.email != "admin@retailsphere.com",
        models.User.full_name != "admin"
    ).order_by(models.User.full_name.asc()).all()

    result = []
    for d in drivers:
        role_name = d.role.role_name if d.role else "Worker"
        result.append({
            "user_id": d.user_id,
            "id": d.user_id,
            "full_name": d.full_name,
            "name": d.full_name,
            "email": d.email,
            "phone": d.phone or "",
            "role": role_name,
            "specialization": d.specialization or "",
            "is_driver": True
        })
    return result


import re

REGISTRATION_REGEX = re.compile(
    r'^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{0,3}[-\s]?[0-9]{1,4}$|^[A-Z0-9\s-]{4,15}$',
    re.IGNORECASE
)

def validate_registration_number(reg: str) -> str:
    clean = reg.strip().upper()
    if not clean:
        raise HTTPException(status_code=400, detail="Vehicle registration number is required.")
    if len(clean) < 4 or len(clean) > 20:
        raise HTTPException(
            status_code=400,
            detail="Registration number must be between 4 and 20 characters."
        )
    if not REGISTRATION_REGEX.match(clean):
        raise HTTPException(
            status_code=400,
            detail="Invalid vehicle registration number format. Expected standard registration (e.g. KL-01-AB-1234 or KL-14-1234)."
        )
    return clean


@router.post("/vehicles", status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleCreatePayload, db: Session = Depends(get_db)):
    reg_clean = validate_registration_number(payload.registration_number)

    existing = db.query(models.Vehicle).filter(models.Vehicle.registration_number == reg_clean).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Vehicle registration number '{reg_clean}' is already registered in the system."
        )

    if payload.assigned_driver_id:
        driver = db.query(models.User).filter(models.User.user_id == payload.assigned_driver_id).first()
        if not driver:
            raise HTTPException(status_code=400, detail="Assigned driver user not found.")
        if not driver.status:
            raise HTTPException(status_code=400, detail=f"User '{driver.full_name}' account is currently inactive.")
        if not driver.is_driver:
            raise HTTPException(
                status_code=400,
                detail=f"User '{driver.full_name}' does not have Driver capability. Enable Driver capability for this user first."
            )

    v = models.Vehicle(
        registration_number=reg_clean,
        vehicle_type=payload.vehicle_type.strip(),
        capacity=payload.capacity,
        assigned_driver_id=payload.assigned_driver_id,
        status=payload.status.upper() if payload.status else "AVAILABLE",
        notes=payload.notes.strip() if payload.notes else None,
        model_name=payload.model_name.strip() if payload.model_name else None,
        year=payload.year
    )
    db.add(v)
    db.commit()
    db.refresh(v)

    return {
        "message": f"Vehicle '{v.registration_number}' added to fleet successfully.",
        "vehicle": format_vehicle_dict(v, db)
    }


@router.put("/vehicles/{vehicle_id}")
def update_vehicle(vehicle_id: int, payload: VehicleUpdatePayload, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle #{vehicle_id} not found.")

    if payload.registration_number:
        new_reg = validate_registration_number(payload.registration_number)
        if new_reg != vehicle.registration_number:
            existing = db.query(models.Vehicle).filter(models.Vehicle.registration_number == new_reg).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Registration number '{new_reg}' is already registered to another vehicle.")
            vehicle.registration_number = new_reg

    if payload.vehicle_type is not None:
        vehicle.vehicle_type = payload.vehicle_type.strip()
    if payload.capacity is not None:
        vehicle.capacity = payload.capacity
    if payload.assigned_driver_id is not None:
        if payload.assigned_driver_id > 0:
            driver = db.query(models.User).filter(models.User.user_id == payload.assigned_driver_id).first()
            if not driver:
                raise HTTPException(status_code=400, detail="Assigned driver user not found.")
            if not driver.status:
                raise HTTPException(status_code=400, detail=f"User '{driver.full_name}' account is currently inactive.")
            if not driver.is_driver:
                raise HTTPException(
                    status_code=400,
                    detail=f"User '{driver.full_name}' does not have Driver capability. Enable Driver capability for this user first."
                )
            vehicle.assigned_driver_id = payload.assigned_driver_id
        else:
            vehicle.assigned_driver_id = None
    if payload.status is not None:
        st_clean = payload.status.upper()
        if st_clean not in ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "INACTIVE"]:
            raise HTTPException(status_code=400, detail=f"Invalid vehicle status '{payload.status}'.")
        vehicle.status = st_clean
    if payload.notes is not None:
        vehicle.notes = payload.notes.strip()
    if payload.model_name is not None:
        vehicle.model_name = payload.model_name.strip()
    if payload.year is not None:
        vehicle.year = payload.year

    vehicle.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(vehicle)

    return {
        "message": f"Vehicle '{vehicle.registration_number}' updated successfully.",
        "vehicle": format_vehicle_dict(vehicle, db)
    }


@router.put("/vehicles/{vehicle_id}/status")
def update_vehicle_status(vehicle_id: int, payload: StatusUpdatePayload, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle #{vehicle_id} not found.")

    st_clean = payload.status.upper()
    if st_clean not in ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "INACTIVE"]:
        raise HTTPException(status_code=400, detail=f"Invalid vehicle status '{payload.status}'.")

    if vehicle.status == "ASSIGNED" and st_clean != "ASSIGNED":
        # Check if vehicle has undelivered active assignment
        active_f = db.query(models.OrderFulfillment).filter(
            models.OrderFulfillment.vehicle_id == vehicle_id,
            models.OrderFulfillment.delivery_status != "DELIVERED",
            models.OrderFulfillment.fulfillment_status != "Delivered"
        ).first()
        if active_f and st_clean == "INACTIVE":
            raise HTTPException(status_code=400, detail="Cannot deactivate vehicle while it is currently assigned to an active delivery.")

    vehicle.status = st_clean
    vehicle.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(vehicle)

    return {
        "message": f"Vehicle '{vehicle.registration_number}' status set to {vehicle.status}.",
        "vehicle": format_vehicle_dict(vehicle, db)
    }


@router.get("/vehicles/{vehicle_id}/history")
def get_vehicle_history(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle #{vehicle_id} not found.")

    fulfillments = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.vehicle_id == vehicle_id
    ).order_by(models.OrderFulfillment.fulfillment_id.desc()).all()

    history = []
    for h in fulfillments:
        ord_obj = h.order
        history.append({
            "order_id": f"RET-{h.order_id:06d}" if h.order_id else f"RET-{h.fulfillment_id}",
            "customer": ord_obj.customer_name if ord_obj else "Store Customer",
            "dispatch_date": h.dispatched_at.strftime("%d %b %Y") if h.dispatched_at else (h.updated_at.strftime("%d %b %Y") if h.updated_at else "Recent"),
            "delivery_status": h.delivery_status or h.fulfillment_status or "Dispatched"
        })

    return {
        "vehicle_id": vehicle.vehicle_id,
        "registration_number": vehicle.registration_number,
        "history": history
    }
