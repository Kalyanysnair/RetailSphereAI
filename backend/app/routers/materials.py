from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/materials", tags=["Material Management"])

class CustomerMaterialCreatePayload(BaseModel):
    customer_id: Optional[int] = None
    customer_email: Optional[str] = None
    material_type: str  # Timber, Fabric, Leather, Board
    wood_type: Optional[str] = None  # Teak, Mahogany, Oak, Rosewood
    quantity: float
    unit: str = "sq_ft"
    dimensions: Optional[str] = None
    condition: Optional[str] = "Good"
    photos: Optional[str] = None
    notes: Optional[str] = None

class CustomerMaterialStatusPayload(BaseModel):
    status: str  # SUBMITTED, RECEIVED, INSPECTED, APPROVED, ALLOCATED, PARTIALLY_USED, COMPLETED
    remaining_quantity: Optional[float] = None
    notes: Optional[str] = None

class RawMaterialCreatePayload(BaseModel):
    category: str
    material_name: str
    unit: str = "sq_ft"
    available_qty: float
    reorder_level: float = 10.0
    unit_cost: float = 0.0

class RawMaterialStockUpdatePayload(BaseModel):
    available_qty: Optional[float] = None
    reserved_qty: Optional[float] = None
    used_qty: Optional[float] = None
    wasted_qty: Optional[float] = None

# 1. Customer-Owned Materials Endpoints
@router.get("/customer")
def get_customer_materials(
    customer_id: Optional[int] = None,
    customer_email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.CustomerMaterial)
    if customer_id:
        query = query.filter(models.CustomerMaterial.customer_id == customer_id)
    elif customer_email and customer_email.strip():
        user = db.query(models.User).filter(models.User.email.ilike(customer_email.strip())).first()
        if user and user.customer_profile:
            query = query.filter(models.CustomerMaterial.customer_id == user.customer_profile.customer_id)

    materials = query.order_by(models.CustomerMaterial.created_at.desc()).all()
    res = []
    for m in materials:
        cust = m.customer
        cust_user = cust.user if cust else None
        res.append({
            "material_id": m.material_id,
            "customer_id": m.customer_id,
            "customer_name": cust_user.full_name if cust_user else "Customer",
            "customer_email": cust_user.email if cust_user else "",
            "material_type": m.material_type,
            "wood_type": m.wood_type,
            "quantity": float(m.quantity),
            "unit": m.unit,
            "dimensions": m.dimensions,
            "condition": m.condition,
            "photos": m.photos,
            "notes": m.notes,
            "status": m.status,
            "remaining_quantity": float(m.remaining_quantity) if m.remaining_quantity is not None else float(m.quantity),
            "created_at": m.created_at.isoformat() if m.created_at else None
        })
    return res

@router.post("/customer", status_code=status.HTTP_201_CREATED)
def register_customer_material(payload: CustomerMaterialCreatePayload, db: Session = Depends(get_db)):
    customer = None
    if payload.customer_email and payload.customer_email.strip():
        user = db.query(models.User).filter(models.User.email.ilike(payload.customer_email.strip())).first()
        if user and user.customer_profile:
            customer = user.customer_profile

    if not customer and payload.customer_id:
        customer = db.query(models.Customer).filter(
            (models.Customer.customer_id == payload.customer_id) | (models.Customer.user_id == payload.customer_id)
        ).first()

    if not customer:
        customer = db.query(models.Customer).first()

    cust_id = customer.customer_id if customer else 1

    new_mat = models.CustomerMaterial(
        customer_id=cust_id,
        material_type=payload.material_type,
        wood_type=payload.wood_type,
        quantity=payload.quantity,
        unit=payload.unit,
        dimensions=payload.dimensions,
        condition=payload.condition,
        photos=payload.photos,
        notes=payload.notes,
        status="REGISTERED",
        remaining_quantity=payload.quantity,
        created_at=datetime.utcnow()
    )
    db.add(new_mat)
    db.commit()
    db.refresh(new_mat)

    return {
        "message": "Customer material registered successfully",
        "material_id": new_mat.material_id,
        "status": new_mat.status
    }

@router.put("/customer/{material_id}/status")
def update_customer_material_status(material_id: int, payload: CustomerMaterialStatusPayload, db: Session = Depends(get_db)):
    mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Customer material record not found")

    mat.status = payload.status
    if payload.remaining_quantity is not None:
        mat.remaining_quantity = payload.remaining_quantity
    if payload.notes:
        mat.notes = (mat.notes or "") + f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {payload.notes}"

    db.commit()
    db.refresh(mat)
    return {"message": "Customer material status updated", "material_id": material_id, "status": mat.status}


# 2. Raw Manufacturing Material Endpoints
@router.get("/raw")
def get_raw_materials(db: Session = Depends(get_db)):
    materials = db.query(models.RawMaterial).all()
    if not materials:
        # Seed initial raw materials if empty
        demo_items = [
            models.RawMaterial(category="Timber", material_name="Teak Wood Planks", unit="cu_ft", available_qty=250.0, reserved_qty=30.0, reorder_level=50.0, unit_cost=1800.0),
            models.RawMaterial(category="Timber", material_name="Rosewood Slabs", unit="cu_ft", available_qty=120.0, reserved_qty=15.0, reorder_level=30.0, unit_cost=2400.0),
            models.RawMaterial(category="Plywood", material_name="Commercial Marine Plywood (18mm)", unit="pieces", available_qty=85.0, reserved_qty=10.0, reorder_level=20.0, unit_cost=2200.0),
            models.RawMaterial(category="Fabric", material_name="Velvet Upholstery Fabric (Emerald)", unit="meters", available_qty=150.0, reserved_qty=20.0, reorder_level=40.0, unit_cost=650.0),
            models.RawMaterial(category="Foam", material_name="High-Density PU Foam Sheets (4-inch)", unit="pieces", available_qty=40.0, reserved_qty=5.0, reorder_level=15.0, unit_cost=1400.0),
            models.RawMaterial(category="Hardware", material_name="Stainless Steel Soft-Close Hinges", unit="pieces", available_qty=500.0, reserved_qty=50.0, reorder_level=100.0, unit_cost=120.0),
        ]
        db.add_all(demo_items)
        db.commit()
        materials = db.query(models.RawMaterial).all()

    res = []
    for r in materials:
        res.append({
            "material_id": r.material_id,
            "category": r.category,
            "material_name": r.material_name,
            "unit": r.unit,
            "available_qty": float(r.available_qty),
            "reserved_qty": float(r.reserved_qty),
            "used_qty": float(r.used_qty),
            "wasted_qty": float(r.wasted_qty),
            "reorder_level": float(r.reorder_level),
            "unit_cost": float(r.unit_cost),
            "status": "Low Stock" if float(r.available_qty) <= float(r.reorder_level) else "In Stock"
        })
    return res

@router.post("/raw", status_code=status.HTTP_201_CREATED)
def create_raw_material(payload: RawMaterialCreatePayload, db: Session = Depends(get_db)):
    new_raw = models.RawMaterial(
        category=payload.category,
        material_name=payload.material_name,
        unit=payload.unit,
        available_qty=payload.available_qty,
        reorder_level=payload.reorder_level,
        unit_cost=payload.unit_cost,
        updated_at=datetime.utcnow()
    )
    db.add(new_raw)
    db.commit()
    db.refresh(new_raw)
    return {"message": "Raw material added to manufacturing inventory", "material_id": new_raw.material_id}

@router.patch("/raw/{material_id}")
def update_raw_material_stock(material_id: int, payload: RawMaterialStockUpdatePayload, db: Session = Depends(get_db)):
    raw = db.query(models.RawMaterial).filter(models.RawMaterial.material_id == material_id).first()
    if not raw:
        raise HTTPException(status_code=404, detail="Raw material not found")

    if payload.available_qty is not None:
        raw.available_qty = payload.available_qty
    if payload.reserved_qty is not None:
        raw.reserved_qty = payload.reserved_qty
    if payload.used_qty is not None:
        raw.used_qty = payload.used_qty
    if payload.wasted_qty is not None:
        raw.wasted_qty = payload.wasted_qty
    raw.updated_at = datetime.utcnow()

    db.commit()
    return {"message": "Raw material inventory updated", "material_id": material_id}
