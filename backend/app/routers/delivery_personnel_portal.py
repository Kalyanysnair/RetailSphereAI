from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/delivery-personnel", tags=["Delivery Personnel Portal"])


def get_current_delivery_personnel(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
) -> models.DeliveryPersonnel:
    """
    Resolves the DeliveryPersonnel record associated with the authenticated platform user.
    """
    person = db.query(models.DeliveryPersonnel).filter(
        models.DeliveryPersonnel.user_id == current_user.user_id
    ).first()

    if not person:
        person = db.query(models.DeliveryPersonnel).filter(
            models.DeliveryPersonnel.email == current_user.email
        ).first()

    if not person and current_user.phone:
        person = db.query(models.DeliveryPersonnel).filter(
            models.DeliveryPersonnel.phone == current_user.phone
        ).first()

    if not person:
        # Check if user is a Carrier Partner acting as self-driver
        carrier = db.query(models.CarrierPartner).filter(
            (models.CarrierPartner.user_id == current_user.user_id) |
            (models.CarrierPartner.contact_email == current_user.email)
        ).first()
        if carrier:
            # Create or resolve a primary driver profile for carrier owner
            person = db.query(models.DeliveryPersonnel).filter(
                models.DeliveryPersonnel.carrier_id == carrier.carrier_id
            ).first()
            if not person:
                person = models.DeliveryPersonnel(
                    carrier_id=carrier.carrier_id,
                    user_id=current_user.user_id,
                    name=carrier.carrier_name,
                    phone=carrier.contact_phone,
                    email=carrier.contact_email,
                    vehicle_type="Mini Truck",
                    status="ACTIVE"
                )
                db.add(person)
                db.commit()
                db.refresh(person)

    if not person:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current account is not registered as active Delivery Personnel / Driver."
        )

    return person


get_current_personnel = get_current_delivery_personnel


class TaskStatusUpdatePayload(BaseModel):
    status: str  # "Accepted", "Out for Delivery", "Delivered", "Cancelled"
    notes: Optional[str] = None


class AcknowledgePayload(BaseModel):
    is_read: Optional[bool] = True


# --- 1. SUMMARY / DRIVER PROFILE ---
@router.get("/summary")
def get_personnel_summary(
    personnel: models.DeliveryPersonnel = Depends(get_current_personnel),
    db: Session = Depends(get_db)
):
    carrier = personnel.carrier_partner

    # Tasks assigned directly to this personnel or under their carrier
    tasks = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.assigned_personnel_id == personnel.personnel_id
    ).all()

    active_tasks = sum(1 for t in tasks if (t.fulfillment_status or '').lower() not in ['delivered', 'cancelled'])
    out_for_delivery = sum(1 for t in tasks if (t.delivery_status or '').lower() in ['out for delivery', 'in transit'])
    completed_tasks = sum(1 for t in tasks if (t.fulfillment_status or '').lower() == 'delivered')

    return {
        "personnel_id": personnel.personnel_id,
        "name": personnel.name,
        "phone": personnel.phone,
        "email": personnel.email,
        "vehicle_type": personnel.vehicle_type or "Mini Truck",
        "vehicle_reg": personnel.vehicle_reg or "KL-05-AT-4482",
        "status": personnel.status or "ACTIVE",
        "carrier": {
            "carrier_id": carrier.carrier_id if carrier else None,
            "carrier_name": carrier.carrier_name if carrier else "RetailSphere Logistics",
            "contact_phone": carrier.contact_phone if carrier else None,
            "contact_email": carrier.contact_email if carrier else None,
        } if carrier else None,
        "active_tasks_count": active_tasks,
        "out_for_delivery_count": out_for_delivery,
        "completed_tasks_count": completed_tasks,
        "total_tasks_count": len(tasks)
    }


# --- 2. ASSIGNED TASKS / DELIVERIES ---
@router.get("/tasks")
def get_assigned_tasks(
    personnel: models.DeliveryPersonnel = Depends(get_current_personnel),
    db: Session = Depends(get_db)
):
    # Query tasks assigned to this personnel
    tasks = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.assigned_personnel_id == personnel.personnel_id
    ).order_by(models.OrderFulfillment.fulfillment_id.desc()).all()

    # If no tasks assigned directly, also check unassigned tasks for their carrier
    if not tasks and personnel.carrier_id:
        tasks = db.query(models.OrderFulfillment).filter(
            models.OrderFulfillment.carrier_id == personnel.carrier_id,
            models.OrderFulfillment.assigned_personnel_id == None
        ).order_by(models.OrderFulfillment.fulfillment_id.desc()).all()

    result = []
    for d in tasks:
        ord_obj = d.order
        fab_obj = d.fabrication_request
        customer = ord_obj.customer if ord_obj else (fab_obj.customer if fab_obj else None)
        cust_user = customer.user if customer else None

        # Extract items directly from DB
        order_items = []
        if ord_obj and ord_obj.items:
            for it in ord_obj.items:
                prod = it.product
                order_items.append({
                    "item_id": it.item_id,
                    "product_id": it.product_id,
                    "product_name": it.product_name or (prod.product_name if prod else "Furniture Consignment"),
                    "quantity": it.quantity,
                    "unit_price": float(it.unit_price) if it.unit_price else 0.0,
                    "total_price": float(it.quantity * it.unit_price) if it.unit_price else 0.0,
                    "image_url": it.image_url or (prod.images[0].image_url if (prod and prod.images) else None),
                    "dimensions": getattr(prod, 'dimensions', None) if prod else None,
                    "material": getattr(prod, 'material', None) if prod else None
                })
        elif fab_obj:
            order_items.append({
                "item_id": 1,
                "product_id": 0,
                "product_name": f"Wood Fabrication ({fab_obj.service_type})",
                "quantity": fab_obj.quantity or 1,
                "unit_price": float(fab_obj.estimated_price) if fab_obj.estimated_price else 0.0,
                "total_price": float(fab_obj.estimated_price) if fab_obj.estimated_price else 0.0,
                "image_url": fab_obj.drawing_image,
                "dimensions": fab_obj.dimensions,
                "material": fab_obj.material_source
            })

        dest_address = (
            d.destination_address
            or (ord_obj.delivery_address if ord_obj and ord_obj.delivery_address and ord_obj.delivery_address != "Standard Delivery" else None)
            or (f"{customer.address}, {customer.city} - {customer.pincode}" if customer and customer.address else "Customer Delivery Address")
        )

        cust_name = (
            cust_user.full_name
            if cust_user and cust_user.full_name
            else (ord_obj.customer_name if ord_obj and ord_obj.customer_name else "Customer")
        )

        display_id = f"ORD-RS-{ord_obj.order_id:04d}" if ord_obj else (f"FAB-{fab_obj.fabrication_id:04d}" if fab_obj else f"FUL-{d.fulfillment_id:04d}")
        order_total = float(ord_obj.total_amount) if ord_obj and ord_obj.total_amount else (float(fab_obj.estimated_price) if fab_obj and fab_obj.estimated_price else 0.0)

        result.append({
            "fulfillment_id": d.fulfillment_id,
            "order_id": display_id,
            "raw_order_id": ord_obj.order_id if ord_obj else (fab_obj.fabrication_id if fab_obj else None),
            "fabrication_id": fab_obj.fabrication_id if fab_obj else None,
            "job_type": d.job_type or "FURNITURE_DELIVERY",
            "fulfillment_status": d.fulfillment_status or "Dispatched",
            "delivery_status": d.delivery_status or d.fulfillment_status or "Dispatched",
            "tracking_number": d.tracking_number or f"RS-EXP-{d.fulfillment_id:05d}",
            "expected_delivery_date": d.expected_delivery_date or "Within 2-3 Business Days",
            "pickup_address": d.pickup_address or "RetailSphere Operations Facility, MC Road, Ettumanoor, Kottayam, Kerala - 686631",
            "destination_address": dest_address,
            "distance_km": float(d.distance_km) if d.distance_km is not None else 0.0,
            "customer_name": cust_name,
            "customer_phone": cust_user.phone if cust_user else (customer.phone if customer else None),
            "total_amount": order_total,
            "items": order_items,
            "items_count": sum(it["quantity"] for it in order_items) if order_items else 1,
            "delivery_notes": d.delivery_notes,
            "dispatched_at": d.dispatched_at.isoformat() if d.dispatched_at else None,
            "delivered_at": d.delivered_at.isoformat() if d.delivered_at else None
        })

    return result


# --- 3. UPDATE TASK STATUS (Accept, Out for Delivery, Complete Delivery) ---
@router.put("/tasks/{fulfillment_id}/status")
def update_task_status(
    fulfillment_id: int,
    payload: TaskStatusUpdatePayload,
    personnel: models.DeliveryPersonnel = Depends(get_current_personnel),
    db: Session = Depends(get_db)
):
    fulfillment = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.fulfillment_id == fulfillment_id
    ).first()

    if not fulfillment:
        raise HTTPException(status_code=404, detail="Assigned delivery task not found.")

    # Assign to personnel if not already assigned
    if not fulfillment.assigned_personnel_id:
        fulfillment.assigned_personnel_id = personnel.personnel_id

    new_st = payload.status.strip()
    fulfillment.delivery_status = new_st
    fulfillment.fulfillment_status = new_st
    if payload.notes:
        fulfillment.delivery_notes = payload.notes.strip()

    if new_st.lower() == "delivered":
        fulfillment.delivered_at = datetime.utcnow()
        if fulfillment.order:
            fulfillment.order.order_status = "Delivered"
        if fulfillment.fabrication_request:
            if fulfillment.job_type == "FABRICATION_PICKUP":
                fulfillment.fabrication_request.status = "IN_PRODUCTION"
            elif fulfillment.job_type == "FABRICATION_RETURN":
                fulfillment.fabrication_request.status = "COMPLETED"

        # Update or create settlement record for carrier
        if fulfillment.carrier_id:
            carrier = db.query(models.CarrierPartner).filter(
                models.CarrierPartner.carrier_id == fulfillment.carrier_id
            ).first()

            settlement = db.query(models.CarrierSettlement).filter(
                models.CarrierSettlement.fulfillment_id == fulfillment.fulfillment_id
            ).first()

            dist = float(fulfillment.distance_km) if fulfillment.distance_km is not None else 0.0
            cust_charge = float(fulfillment.transportation_charge) if fulfillment.transportation_charge is not None else 0.0

            active_agreement = db.query(models.CarrierAgreement).filter(
                models.CarrierAgreement.carrier_id == fulfillment.carrier_id,
                models.CarrierAgreement.status == "ACTIVE"
            ).order_by(models.CarrierAgreement.agreement_id.desc()).first()

            base_rate = float(active_agreement.base_payout_rate) if active_agreement and active_agreement.base_payout_rate else 100.0
            per_km_rate = float(active_agreement.per_km_payout_rate) if active_agreement and active_agreement.per_km_payout_rate else 15.0
            carrier_payout = round(base_rate + (dist * per_km_rate), 2)
            service_margin = max(cust_charge - carrier_payout, 0.0)

            eff_order_type = "Fabrication" if fulfillment.fabrication_id else "Readymade"
            eff_order_id = fulfillment.fabrication_id if fulfillment.fabrication_id else (fulfillment.order_id or 0)

            if not settlement:
                settlement = models.CarrierSettlement(
                    carrier_id=fulfillment.carrier_id,
                    fulfillment_id=fulfillment.fulfillment_id,
                    order_type=eff_order_type,
                    order_id=eff_order_id,
                    distance_km=dist,
                    customer_charge=cust_charge,
                    carrier_payout=carrier_payout,
                    service_margin=service_margin,
                    settlement_status="PENDING",
                    notes=f"Delivery completed by driver {personnel.name}"
                )
                db.add(settlement)

    db.commit()
    db.refresh(fulfillment)

    return {
        "success": True,
        "message": f"Delivery task updated to '{new_st}'",
        "fulfillment_id": fulfillment.fulfillment_id,
        "delivery_status": fulfillment.delivery_status
    }


# --- 4. ACKNOWLEDGE / MARK AS READ ---
@router.put("/tasks/{fulfillment_id}/acknowledge")
def acknowledge_task(
    fulfillment_id: int,
    payload: AcknowledgePayload,
    personnel: models.DeliveryPersonnel = Depends(get_current_personnel),
    db: Session = Depends(get_db)
):
    fulfillment = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.fulfillment_id == fulfillment_id
    ).first()

    if not fulfillment:
        raise HTTPException(status_code=404, detail="Assigned delivery task not found.")

    if not fulfillment.assigned_personnel_id:
        fulfillment.assigned_personnel_id = personnel.personnel_id

    if (fulfillment.delivery_status or '').lower() in ['dispatched', 'pending', 'assigned']:
        fulfillment.delivery_status = "Accepted & Read"

    db.commit()
    return {
        "success": True,
        "message": "Task acknowledged and marked as read.",
        "fulfillment_id": fulfillment_id,
        "delivery_status": fulfillment.delivery_status
    }


# --- 5. EMAIL CHANGE REQUEST ---

class EmailChangeRequestPayload(BaseModel):
    requested_email: str
    reason: Optional[str] = None


@router.post("/request-email-change")
def submit_email_change_request(
    payload: EmailChangeRequestPayload,
    personnel: models.DeliveryPersonnel = Depends(get_current_personnel),
    db: Session = Depends(get_db)
):
    target_email = payload.requested_email.strip().lower()
    if not target_email or "@" not in target_email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    current_email = (personnel.email or (personnel.user.email if personnel.user else '')).strip().lower()
    if target_email == current_email:
        raise HTTPException(status_code=400, detail="The requested email is the same as your current registered email.")

    # Check if target_email is already in use by another user
    existing_user = db.query(models.User).filter(models.User.email == target_email).first()
    if existing_user and existing_user.user_id != personnel.user_id:
        raise HTTPException(status_code=400, detail="This email address is already registered to another account.")

    # Check for pending request
    pending_req = db.query(models.PersonnelEmailChangeRequest).filter(
        models.PersonnelEmailChangeRequest.personnel_id == personnel.personnel_id,
        models.PersonnelEmailChangeRequest.status == "PENDING"
    ).first()

    if pending_req:
        pending_req.requested_email = target_email
        pending_req.reason = payload.reason or "Driver requested updated login email."
        pending_req.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(pending_req)
        return {
            "success": True,
            "message": "Existing pending email change request updated.",
            "request_id": pending_req.request_id,
            "requested_email": pending_req.requested_email,
            "status": pending_req.status
        }

    new_req = models.PersonnelEmailChangeRequest(
        personnel_id=personnel.personnel_id,
        carrier_id=personnel.carrier_id,
        current_email=current_email or personnel.email or "driver@carrier.com",
        requested_email=target_email,
        reason=payload.reason or "Driver requested updated login email.",
        status="PENDING",
        created_at=datetime.utcnow()
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    return {
        "success": True,
        "message": "Email change request submitted to Carrier Partner for approval.",
        "request_id": new_req.request_id,
        "requested_email": new_req.requested_email,
        "status": new_req.status
    }


@router.get("/email-change-requests")
def get_driver_email_change_requests(
    personnel: models.DeliveryPersonnel = Depends(get_current_personnel),
    db: Session = Depends(get_db)
):
    requests = db.query(models.PersonnelEmailChangeRequest).filter(
        models.PersonnelEmailChangeRequest.personnel_id == personnel.personnel_id
    ).order_by(models.PersonnelEmailChangeRequest.request_id.desc()).all()

    return [
        {
            "request_id": r.request_id,
            "current_email": r.current_email,
            "requested_email": r.requested_email,
            "reason": r.reason,
            "status": r.status,
            "rejection_reason": r.rejection_reason,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in requests
    ]

