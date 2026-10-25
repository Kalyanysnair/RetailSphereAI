from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app import models, auth
from app.utils.material_ledger import (
    record_business_material_transaction,
    record_customer_material_transaction,
)

router = APIRouter(prefix="/api/materials", tags=["Material Management"])

VALID_UNITS = {"sq_ft", "cu_ft", "cubic_ft", "meters", "pieces", "kg", "liters", "units"}


class CustomerMaterialCreatePayload(BaseModel):
    customer_id: Optional[int] = None
    customer_email: Optional[str] = None
    material_type: str  # Timber Wood, Fabric, Leather, Plywood
    wood_type: Optional[str] = None  # Teak, Mahogany, Oak, Rosewood
    quantity: float
    unit: str = "sq_ft"
    dimensions: Optional[str] = None
    condition: Optional[str] = "Good"
    photos: Optional[str] = None
    notes: Optional[str] = None

    @validator("unit")
    def normalize_unit(cls, v):
        u = (v or "sq_ft").lower().strip()
        if u == "cubic_ft":
            u = "cu_ft"
        if u not in VALID_UNITS:
            raise ValueError(f"Invalid unit '{v}'. Supported: {', '.join(sorted(VALID_UNITS))}")
        return u


CustomerMaterialRegisterPayload = CustomerMaterialCreatePayload


class CustomerMaterialStatusPayload(BaseModel):
    status: str  # REGISTERED, DELIVERED_AT_HUB, RECEIVED, INSPECTED, APPROVED, ALLOCATED, PARTIALLY_USED, COMPLETED
    remaining_quantity: Optional[float] = None
    notes: Optional[str] = None
    condition: Optional[str] = None


class RawMaterialCreatePayload(BaseModel):
    category: str
    material_name: str
    unit: str = "sq_ft"
    available_qty: float
    reorder_level: float = 10.0
    unit_cost: float = 0.0

    @validator("available_qty")
    def validate_initial_qty(cls, v):
        if v is None or v < 0:
            raise ValueError("Available quantity cannot be negative.")
        return float(v)


class RawMaterialStockUpdatePayload(BaseModel):
    available_qty: Optional[float] = None
    reserved_qty: Optional[float] = None
    used_qty: Optional[float] = None
    wasted_qty: Optional[float] = None
    adjustment_reason: Optional[str] = "Manual stock update"
    transaction_type: Optional[str] = "ADJUSTMENT"  # ADJUSTMENT, RECEIVED, WASTED


# 1. Customer-Owned Materials Endpoints
@router.get("/customer")
def get_customer_materials(
    customer_id: Optional[int] = None,
    customer_email: Optional[str] = None,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Returns customer-owned material lots. If accessed by an authenticated customer,
    strictly restricts data to their own registered lots.
    Admin & Production Staff can view all lots or filter by customer.
    """
    auth_user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        auth_user = auth.get_user_from_token_silent(db, token)

    query = db.query(models.CustomerMaterial)

    # Enforce role-based scoping: customer can only see their own records
    if auth_user and auth_user.role and auth_user.role.role_name == "Customer":
        if auth_user.customer_profile:
            query = query.filter(models.CustomerMaterial.customer_id == auth_user.customer_profile.customer_id)
        else:
            return []
    elif customer_id:
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
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_customer_material(
    payload: CustomerMaterialCreatePayload,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional),
    authorization: Optional[str] = Header(None)
):
    """
    Registers a customer-owned material declaration.
    Derives customer identity securely from authentication token if present.
    Guards against duplicate rapid resubmissions.
    """
    if payload.quantity is None or payload.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material quantity must be strictly greater than 0."
        )

    customer = None

    # Derive authenticated customer from current_user or token
    if current_user and current_user.customer_profile:
        customer = current_user.customer_profile
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        auth_user = auth.get_user_from_token_silent(db, token)
        if auth_user and auth_user.customer_profile:
            customer = auth_user.customer_profile

    # Fallback to email or ID if token absent (backward compatibility)
    if not customer and payload.customer_email and payload.customer_email.strip():
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

    # Idempotency / duplicate protection: check if identical record registered in last 60 seconds
    recent_dup = db.query(models.CustomerMaterial).filter(
        models.CustomerMaterial.customer_id == cust_id,
        models.CustomerMaterial.material_type == payload.material_type,
        models.CustomerMaterial.wood_type == payload.wood_type,
        models.CustomerMaterial.quantity == payload.quantity,
        models.CustomerMaterial.created_at >= (datetime.utcnow() - timedelta(seconds=60))
    ).first()

    if recent_dup:
        return {
            "message": "Customer material already declared (duplicate submission prevented)",
            "material_id": recent_dup.material_id,
            "status": recent_dup.status
        }

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
def update_customer_material_status(
    material_id: int,
    payload: CustomerMaterialStatusPayload,
    db: Session = Depends(get_db)
):
    mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Customer material record not found")

    mat.status = payload.status
    if payload.remaining_quantity is not None:
        mat.remaining_quantity = max(float(payload.remaining_quantity), 0.0)
    if payload.condition:
        mat.condition = payload.condition
    if payload.notes:
        mat.notes = (mat.notes or "") + f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {payload.notes}"

    db.commit()
    db.refresh(mat)
    return {"message": "Customer material status updated", "material_id": material_id, "status": mat.status}


# 2. Raw Manufacturing Material Endpoints (Business Stock)
@router.get("/raw")
def get_raw_materials(db: Session = Depends(get_db)):
    materials = db.query(models.RawMaterial).all()
    if not materials:
        # Seed standard initial raw materials if table empty
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
            "available_qty": float(r.available_qty or 0.0),
            "reserved_qty": float(r.reserved_qty or 0.0),
            "used_qty": float(r.used_qty or 0.0),
            "wasted_qty": float(r.wasted_qty or 0.0),
            "reorder_level": float(r.reorder_level or 10.0),
            "unit_cost": float(r.unit_cost or 0.0),
            "status": "Low Stock" if float(r.available_qty or 0.0) <= float(r.reorder_level or 10.0) else "In Stock"
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

    # Record initial receipt transaction in ledger
    try:
        tx = models.MaterialTransaction(
            raw_material_id=new_raw.material_id,
            order_type="Receipt",
            quantity=payload.available_qty,
            unit=payload.unit,
            transaction_type="RECEIVED",
            notes=f"Initial stock creation for {payload.material_name}",
            created_at=datetime.utcnow()
        )
        db.add(tx)
        db.commit()
    except Exception:
        db.rollback()

    return {"message": "Raw material added to manufacturing inventory", "material_id": new_raw.material_id}


@router.patch("/raw/{material_id}")
def update_raw_material_stock(
    material_id: int,
    payload: RawMaterialStockUpdatePayload,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """
    Atomically updates business raw material stock and writes an audit entry
    to tbl_material_transaction.
    """
    raw = db.query(models.RawMaterial).filter(models.RawMaterial.material_id == material_id).first()
    if not raw:
        raise HTTPException(status_code=404, detail="Raw material not found")

    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        u = auth.get_user_from_token_silent(db, token)
        if u:
            user_id = u.user_id

    old_avail = float(raw.available_qty or 0.0)
    target_avail = payload.available_qty if payload.available_qty is not None else old_avail

    if target_avail < 0:
        raise HTTPException(status_code=400, detail="Stock quantity cannot be negative.")

    # Record atomic transaction
    delta = abs(target_avail - old_avail)
    t_type = "RECEIVED" if target_avail > old_avail else ("ADJUSTMENT" if target_avail < old_avail else "ADJUSTMENT")

    raw.available_qty = target_avail
    if payload.reserved_qty is not None:
        raw.reserved_qty = max(float(payload.reserved_qty), 0.0)
    if payload.used_qty is not None:
        raw.used_qty = max(float(payload.used_qty), 0.0)
    if payload.wasted_qty is not None:
        raw.wasted_qty = max(float(payload.wasted_qty), 0.0)
    raw.updated_at = datetime.utcnow()

    tx = models.MaterialTransaction(
        raw_material_id=raw.material_id,
        order_type="StockAdjustment",
        quantity=delta if delta > 0 else target_avail,
        unit=raw.unit,
        transaction_type=t_type,
        notes=payload.adjustment_reason or "Manual stock adjustment by admin",
        performed_by_id=user_id,
        created_at=datetime.utcnow()
    )
    db.add(tx)
    db.commit()

    return {"message": "Raw material inventory updated", "material_id": material_id, "available_qty": raw.available_qty}


# 3. Material Ledger Audit Transactions Endpoint
@router.get("/transactions")
def get_material_transactions(
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Returns an auditable log of material movements across both
    business inventory and customer-supplied material lots.
    """
    txs = db.query(models.MaterialTransaction).order_by(
        models.MaterialTransaction.created_at.desc()
    ).limit(limit).all()

    res = []
    for t in txs:
        raw_name = t.raw_material.material_name if t.raw_material else None
        cust_desc = None
        if t.customer_material:
            cust = t.customer_material.customer
            cust_name = cust.user.full_name if (cust and cust.user) else "Customer"
            cust_desc = f"Lot #{t.customer_material.material_id} ({t.customer_material.wood_type or t.customer_material.material_type} - {cust_name})"

        performer = t.performed_by.full_name if t.performed_by else "System Staff"

        res.append({
            "transaction_id": t.transaction_id,
            "raw_material_id": t.raw_material_id,
            "customer_material_id": t.customer_material_id,
            "material_name": raw_name or cust_desc or "Material",
            "ownership": "Business Stock" if t.raw_material_id else "Customer-Owned",
            "transaction_type": t.transaction_type,
            "quantity": float(t.quantity),
            "unit": t.unit or "sq_ft",
            "order_type": t.order_type,
            "order_id": t.order_id,
            "notes": t.notes,
            "performed_by": performer,
            "created_at": t.created_at.isoformat() if t.created_at else None
        })
    return res


# 4. Material Allocation, Consumption, and Returns
class MaterialAllocatePayload(BaseModel):
    ownership: str  # "BUSINESS" or "CUSTOMER"
    material_id: int
    order_id: int
    order_type: str  # Custom, Fabrication
    quantity: float
    notes: Optional[str] = None


class MaterialConsumePayload(BaseModel):
    ownership: str  # "BUSINESS" or "CUSTOMER"
    material_id: int
    order_id: int
    order_type: str  # Custom, Fabrication
    quantity_consumed: float
    quantity_wasted: Optional[float] = 0.0
    notes: Optional[str] = None


class MaterialReturnPayload(BaseModel):
    ownership: str  # "BUSINESS" or "CUSTOMER"
    material_id: int
    order_id: int
    order_type: str  # Custom, Fabrication
    quantity_returned: float
    notes: Optional[str] = None


@router.post("/allocate")
def allocate_material_to_order(
    payload: MaterialAllocatePayload,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    """
    Allocates material to an active fabrication or custom order.
    Guarantees stock availability and writes an audit transaction atomically.
    """
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Allocation quantity must be greater than zero.")

    user_id = current_user.user_id if current_user else 1
    own = payload.ownership.upper().strip()

    if own == "BUSINESS":
        from app.utils.material_ledger import record_business_material_transaction
        raw = db.query(models.RawMaterial).filter(models.RawMaterial.material_id == payload.material_id).first()
        if not raw:
            raise HTTPException(status_code=404, detail="Raw material stock item not found.")

        record_business_material_transaction(
            db=db,
            raw_material_id=raw.material_id,
            quantity=payload.quantity,
            transaction_type="ALLOCATED",
            order_id=payload.order_id,
            order_type=payload.order_type,
            performed_by_id=user_id,
            notes=payload.notes or f"Allocated {payload.quantity} {raw.unit} to {payload.order_type} #{payload.order_id}"
        )
        db.commit()
        return {"message": "Material successfully allocated to order", "material_id": raw.material_id, "available_qty": float(raw.available_qty)}

    elif own == "CUSTOMER":
        from app.utils.material_ledger import record_customer_material_transaction
        c_mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == payload.material_id).first()
        if not c_mat:
            raise HTTPException(status_code=404, detail="Customer material lot not found.")
        if c_mat.status not in ["RECEIVED", "INSPECTED", "APPROVED", "ALLOCATED", "PARTIALLY_USED"]:
            raise HTTPException(status_code=400, detail=f"Customer material must be received and verified before allocation (current status: {c_mat.status}).")

        rem = float(c_mat.remaining_quantity if c_mat.remaining_quantity is not None else c_mat.quantity)
        if rem < payload.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient customer material remaining (available: {rem} {c_mat.unit}, requested: {payload.quantity}).")

        record_customer_material_transaction(
            db=db,
            customer_material_id=c_mat.material_id,
            quantity=payload.quantity,
            transaction_type="ALLOCATED",
            order_id=payload.order_id,
            order_type=payload.order_type,
            performed_by_id=user_id,
            notes=payload.notes or f"Allocated {payload.quantity} {c_mat.unit} to {payload.order_type} #{payload.order_id}"
        )
        db.commit()
        return {"message": "Customer material successfully allocated to order", "material_id": c_mat.material_id}
    else:
        raise HTTPException(status_code=400, detail="Invalid ownership type. Must be BUSINESS or CUSTOMER.")


@router.post("/consume")
def record_material_consumption(
    payload: MaterialConsumePayload,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    """
    Records material consumed and wasted during manufacturing.
    Updates ledger and balance atomically.
    """
    if payload.quantity_consumed <= 0:
        raise HTTPException(status_code=400, detail="Quantity consumed must be greater than zero.")

    user_id = current_user.user_id if current_user else 1
    own = payload.ownership.upper().strip()
    wasted = max(float(payload.quantity_wasted or 0.0), 0.0)

    if own == "BUSINESS":
        from app.utils.material_ledger import record_business_material_transaction
        raw = db.query(models.RawMaterial).filter(models.RawMaterial.material_id == payload.material_id).first()
        if not raw:
            raise HTTPException(status_code=404, detail="Raw material stock item not found.")

        record_business_material_transaction(
            db=db,
            raw_material_id=raw.material_id,
            quantity=payload.quantity_consumed,
            transaction_type="CONSUMED",
            order_id=payload.order_id,
            order_type=payload.order_type,
            performed_by_id=user_id,
            notes=payload.notes or f"Consumed {payload.quantity_consumed} {raw.unit} for {payload.order_type} #{payload.order_id}"
        )

        if wasted > 0:
            record_business_material_transaction(
                db=db,
                raw_material_id=raw.material_id,
                quantity=wasted,
                transaction_type="WASTAGE",
                order_id=payload.order_id,
                order_type=payload.order_type,
                performed_by_id=user_id,
                notes=f"Wastage recorded for {payload.order_type} #{payload.order_id}"
            )

        db.commit()
        return {"message": "Material consumption successfully recorded", "material_id": raw.material_id}

    elif own == "CUSTOMER":
        from app.utils.material_ledger import record_customer_material_transaction
        c_mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == payload.material_id).first()
        if not c_mat:
            raise HTTPException(status_code=404, detail="Customer material lot not found.")

        current_rem = float(c_mat.remaining_quantity if c_mat.remaining_quantity is not None else c_mat.quantity)
        total_depletion = payload.quantity_consumed + wasted
        if total_depletion > current_rem:
            raise HTTPException(status_code=400, detail=f"Cannot consume {total_depletion} {c_mat.unit}. Only {current_rem} {c_mat.unit} remaining in lot #{c_mat.material_id}.")

        record_customer_material_transaction(
            db=db,
            customer_material_id=c_mat.material_id,
            quantity=payload.quantity_consumed,
            transaction_type="CONSUMED",
            order_id=payload.order_id,
            order_type=payload.order_type,
            performed_by_id=user_id,
            notes=payload.notes or f"Consumed {payload.quantity_consumed} {c_mat.unit} for {payload.order_type} #{payload.order_id}"
        )

        if wasted > 0:
            record_customer_material_transaction(
                db=db,
                customer_material_id=c_mat.material_id,
                quantity=wasted,
                transaction_type="WASTAGE",
                order_id=payload.order_id,
                order_type=payload.order_type,
                performed_by_id=user_id,
                notes=f"Wastage: {wasted} {c_mat.unit} for {payload.order_type} #{payload.order_id}"
            )

        db.commit()
        return {
            "message": "Customer material consumption recorded",
            "material_id": c_mat.material_id,
            "remaining_quantity": float(c_mat.remaining_quantity),
            "status": c_mat.status
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid ownership type. Must be BUSINESS or CUSTOMER.")


@router.post("/return")
def return_material_from_order(
    payload: MaterialReturnPayload,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user_optional)
):
    """
    Returns unconsumed allocated material back to available inventory.
    """
    if payload.quantity_returned <= 0:
        raise HTTPException(status_code=400, detail="Quantity returned must be greater than zero.")

    user_id = current_user.user_id if current_user else 1
    own = payload.ownership.upper().strip()

    if own == "BUSINESS":
        from app.utils.material_ledger import record_business_material_transaction
        raw = db.query(models.RawMaterial).filter(models.RawMaterial.material_id == payload.material_id).first()
        if not raw:
            raise HTTPException(status_code=404, detail="Raw material stock item not found.")

        record_business_material_transaction(
            db=db,
            raw_material_id=raw.material_id,
            quantity=payload.quantity_returned,
            transaction_type="RETURNED",
            order_id=payload.order_id,
            order_type=payload.order_type,
            performed_by_id=user_id,
            notes=payload.notes or f"Returned {payload.quantity_returned} {raw.unit} from {payload.order_type} #{payload.order_id}"
        )
        db.commit()
        return {"message": "Material successfully returned to stock", "material_id": raw.material_id, "available_qty": float(raw.available_qty)}

    elif own == "CUSTOMER":
        from app.utils.material_ledger import record_customer_material_transaction
        c_mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == payload.material_id).first()
        if not c_mat:
            raise HTTPException(status_code=404, detail="Customer material lot not found.")

        record_customer_material_transaction(
            db=db,
            customer_material_id=c_mat.material_id,
            quantity=payload.quantity_returned,
            transaction_type="RETURNED",
            order_id=payload.order_id,
            order_type=payload.order_type,
            performed_by_id=user_id,
            notes=payload.notes or f"Returned {payload.quantity_returned} {c_mat.unit} to customer lot #{c_mat.material_id}"
        )
        db.commit()
        return {
            "message": "Customer material returned to lot balance",
            "material_id": c_mat.material_id,
            "remaining_quantity": float(c_mat.remaining_quantity)
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid ownership type. Must be BUSINESS or CUSTOMER.")

