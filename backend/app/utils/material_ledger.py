from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app import models


def record_business_material_transaction(
    db: Session,
    raw_material_id: int,
    transaction_type: str,
    quantity: float,
    unit: Optional[str] = None,
    order_type: Optional[str] = None,
    order_id: Optional[int] = None,
    performed_by_id: Optional[int] = None,
    notes: Optional[str] = None,
    user_id: Optional[int] = None,
    **kwargs
) -> models.MaterialTransaction:
    """
    Atomically updates business inventory (tbl_raw_material) and records
    an immutable transaction audit entry in tbl_material_transaction.
    Prevents negative available stock and records user and reason.
    """
    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction quantity must be greater than zero."
        )

    effective_user_id = performed_by_id or user_id

    # Fetch with row-level lock where supported
    raw = db.query(models.RawMaterial).filter(models.RawMaterial.material_id == raw_material_id).with_for_update().first()
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Raw material #{raw_material_id} not found."
        )

    avail = float(raw.available_qty or 0.0)
    reserved = float(raw.reserved_qty or 0.0)
    used = float(raw.used_qty or 0.0)
    wasted = float(raw.wasted_qty or 0.0)
    tx_unit = unit or raw.unit or "sq_ft"

    ttype = transaction_type.upper().strip()

    if ttype == "RECEIVED":
        raw.available_qty = avail + quantity
    elif ttype in ["RESERVED", "ALLOCATED"]:
        if avail < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient available stock for {raw.material_name}. Requested: {quantity} {tx_unit}, Available: {avail} {raw.unit}."
            )
        raw.available_qty = avail - quantity
        raw.reserved_qty = reserved + quantity
    elif ttype == "CONSUMED":
        if reserved >= quantity:
            raw.reserved_qty = reserved - quantity
        elif (avail + reserved) >= quantity:
            shortfall = quantity - reserved
            raw.reserved_qty = 0.0
            raw.available_qty = avail - shortfall
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot consume {quantity} {tx_unit} of {raw.material_name}. Total stock available + reserved is {avail + reserved}."
            )
        raw.used_qty = used + quantity
    elif ttype == "RETURNED":
        # Un-reserve or return unused stock to available pool
        if reserved >= quantity:
            raw.reserved_qty = reserved - quantity
        raw.available_qty = float(raw.available_qty or 0.0) + quantity
    elif ttype in ["WASTED", "WASTAGE"]:
        if reserved >= quantity:
            raw.reserved_qty = reserved - quantity
        elif avail >= quantity:
            raw.available_qty = avail - quantity
        raw.wasted_qty = wasted + quantity
    elif ttype == "ADJUSTMENT":
        # Direct stock level adjustment (delta or explicit)
        raw.available_qty = quantity
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported transaction type '{transaction_type}'."
        )

    raw.updated_at = datetime.utcnow()

    tx = models.MaterialTransaction(
        raw_material_id=raw.material_id,
        customer_material_id=None,
        order_type=order_type,
        order_id=order_id,
        quantity=quantity,
        unit=tx_unit,
        transaction_type=ttype,
        notes=notes,
        performed_by_id=effective_user_id,
        created_at=datetime.utcnow()
    )
    db.add(tx)
    return tx


def record_customer_material_transaction(
    db: Session,
    customer_material_id: int,
    transaction_type: str,
    quantity: float,
    unit: Optional[str] = None,
    order_type: Optional[str] = None,
    order_id: Optional[int] = None,
    performed_by_id: Optional[int] = None,
    notes: Optional[str] = None,
    condition: Optional[str] = None,
    user_id: Optional[int] = None,
    **kwargs
) -> models.MaterialTransaction:
    """
    Atomically updates customer-supplied material lot (tbl_customer_material)
    and records an audit entry in tbl_material_transaction.
    Separates customer material ownership from store stock.
    """
    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction quantity must be greater than zero."
        )

    effective_user_id = performed_by_id or user_id

    c_mat = db.query(models.CustomerMaterial).filter(
        models.CustomerMaterial.material_id == customer_material_id
    ).with_for_update().first()

    if not c_mat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer material #{customer_material_id} not found."
        )

    rem = float(c_mat.remaining_quantity if c_mat.remaining_quantity is not None else c_mat.quantity)
    tx_unit = unit or c_mat.unit or "sq_ft"
    ttype = transaction_type.upper().strip()

    if ttype == "RECEIVED":
        # Physical intake at workshop
        c_mat.status = "RECEIVED"
        if condition:
            c_mat.condition = condition
        c_mat.remaining_quantity = quantity
    elif ttype in ["VERIFIED", "INSPECTED"]:
        c_mat.status = "INSPECTED"
        if condition:
            c_mat.condition = condition
    elif ttype == "ALLOCATED":
        c_mat.status = "ALLOCATED"
    elif ttype == "CONSUMED":
        if rem < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot consume {quantity} {tx_unit}. Only {rem} {c_mat.unit} remaining in customer lot #{customer_material_id}."
            )
        new_rem = rem - quantity
        c_mat.remaining_quantity = new_rem
        c_mat.status = "COMPLETED" if new_rem <= 0.001 else "PARTIALLY_USED"
    elif ttype == "RETURNED":
        new_rem = rem + quantity
        c_mat.remaining_quantity = new_rem
        c_mat.status = "RECEIVED" if new_rem >= float(c_mat.quantity) else "PARTIALLY_USED"
    elif ttype in ["WASTED", "WASTAGE"]:
        new_rem = max(rem - quantity, 0.0)
        c_mat.remaining_quantity = new_rem
        c_mat.status = "COMPLETED" if new_rem <= 0.001 else "PARTIALLY_USED"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported customer material transaction type '{transaction_type}'."
        )

    if condition and not c_mat.condition:
        c_mat.condition = condition

    if notes:
        timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        c_mat.notes = (c_mat.notes or "") + f"\n[{timestamp_str}] {ttype}: {notes}"

    tx = models.MaterialTransaction(
        raw_material_id=None,
        customer_material_id=c_mat.material_id,
        order_type=order_type,
        order_id=order_id,
        quantity=quantity,
        unit=tx_unit,
        transaction_type=ttype,
        notes=notes,
        performed_by_id=effective_user_id,
        created_at=datetime.utcnow()
    )
    db.add(tx)
    return tx
