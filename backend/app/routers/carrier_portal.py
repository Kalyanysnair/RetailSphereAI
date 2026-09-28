from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/carrier", tags=["Carrier Portal"])


def get_current_carrier(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
) -> models.CarrierPartner:
    """Resolves the CarrierPartner entity associated with the authenticated platform user."""
    carrier = db.query(models.CarrierPartner).filter(
        models.CarrierPartner.user_id == current_user.user_id
    ).first()
    
    if not carrier:
        carrier = db.query(models.CarrierPartner).filter(
            models.CarrierPartner.contact_email == current_user.email
        ).first()

    if not carrier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current account is not registered as an active Carrier Partner."
        )
    return carrier


# --- Pydantic Request Schemas ---

class DeliveryStatusUpdatePayload(BaseModel):
    status: str  # "Dispatched", "Out for Delivery", "Delivered", "Cancelled"
    notes: Optional[str] = None


class PersonnelAssignPayload(BaseModel):
    personnel_id: int


class PersonnelCreatePayload(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    vehicle_type: Optional[str] = "Mini Truck"
    vehicle_reg: Optional[str] = None
    notes: Optional[str] = None


class PersonnelUpdatePayload(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_reg: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# --- 1. CARRIER SUMMARY KPI ENDPOINT ---

@router.get("/summary")
def get_carrier_summary(
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    # Deliveries assigned to this carrier
    all_deliveries = db.query(models.OrderFulfillment).filter(
        (models.OrderFulfillment.carrier_id == carrier.carrier_id) |
        (models.OrderFulfillment.carrier.ilike(f"%{carrier.carrier_name}%"))
    ).all()

    active_count = sum(
        1 for d in all_deliveries
        if (d.fulfillment_status or '').lower() not in ['delivered', 'cancelled']
    )
    pending_count = sum(
        1 for d in all_deliveries
        if (d.fulfillment_status or '').lower() in ['pending', 'packed', 'dispatched']
    )
    completed_count = sum(
        1 for d in all_deliveries
        if (d.fulfillment_status or '').lower() == 'delivered'
    )

    personnel_count = db.query(models.DeliveryPersonnel).filter(
        models.DeliveryPersonnel.carrier_id == carrier.carrier_id,
        models.DeliveryPersonnel.status == "ACTIVE"
    ).count()

    active_agreement = db.query(models.CarrierAgreement).filter(
        models.CarrierAgreement.carrier_id == carrier.carrier_id,
        models.CarrierAgreement.status == "ACTIVE"
    ).order_by(models.CarrierAgreement.agreement_id.desc()).first()

    return {
        "carrier_id": carrier.carrier_id,
        "carrier_name": carrier.carrier_name,
        "contact_email": carrier.contact_email,
        "contact_phone": carrier.contact_phone,
        "coverage_areas": carrier.coverage_areas,
        "active_deliveries": active_count,
        "pending_deliveries": pending_count,
        "completed_deliveries": completed_count,
        "delivery_personnel_count": personnel_count,
        "active_agreement": {
            "agreement_id": active_agreement.agreement_id,
            "agreement_number": active_agreement.agreement_number,
            "title": active_agreement.title,
            "effective_date": active_agreement.effective_date.isoformat() if active_agreement.effective_date else None,
            "expiry_date": active_agreement.expiry_date.isoformat() if active_agreement.expiry_date else None,
            "base_payout_rate": float(active_agreement.base_payout_rate) if active_agreement.base_payout_rate else 100.0,
            "per_km_payout_rate": float(active_agreement.per_km_payout_rate) if active_agreement.per_km_payout_rate else 15.0,
            "status": active_agreement.status
        } if active_agreement else None
    }


# --- 2. CURRENT ACTIVE DELIVERIES ---

@router.get("/deliveries/current")
def get_current_deliveries(
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    deliveries = db.query(models.OrderFulfillment).filter(
        (models.OrderFulfillment.carrier_id == carrier.carrier_id) |
        (models.OrderFulfillment.carrier.ilike(f"%{carrier.carrier_name}%")),
        models.OrderFulfillment.fulfillment_status != "Delivered",
        models.OrderFulfillment.fulfillment_status != "Cancelled"
    ).order_by(models.OrderFulfillment.fulfillment_id.desc()).all()

    result = []
    for d in deliveries:
        ord_obj = d.order
        fab_obj = d.fabrication_request
        customer = ord_obj.customer if ord_obj else (fab_obj.customer if fab_obj else None)
        cust_user = customer.user if customer else None
        personnel = d.assigned_personnel

        # Extract items directly from the database order or fabrication request
        order_items = []
        if ord_obj and ord_obj.items:
            for it in ord_obj.items:
                prod = it.product
                order_items.append({
                    "item_id": it.item_id,
                    "product_id": it.product_id,
                    "product_name": it.product_name or (prod.product_name if prod else "Custom Furniture Unit"),
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

        # Check driver assignment status
        is_driver_assigned = bool(personnel or d.driver_id or d.assigned_personnel_id)
        if not is_driver_assigned:
            effective_delivery_status = "Pending Driver Allotment"
            effective_fulfillment_status = "Assigned to Carrier"
        else:
            effective_delivery_status = d.delivery_status or d.fulfillment_status or "In Transit"
            effective_fulfillment_status = d.fulfillment_status or "In Transit"

        result.append({
            "fulfillment_id": d.fulfillment_id,
            "order_id": display_id,
            "raw_order_id": ord_obj.order_id if ord_obj else (fab_obj.fabrication_id if fab_obj else None),
            "fabrication_id": fab_obj.fabrication_id if fab_obj else None,
            "job_type": d.job_type or ("FABRICATION_PICKUP" if "PICKUP" in (d.job_type or "") else "FURNITURE_DELIVERY"),
            "fulfillment_status": effective_fulfillment_status,
            "delivery_status": effective_delivery_status,
            "tracking_number": d.tracking_number or f"RS-EXP-{d.fulfillment_id:05d}",
            "expected_delivery_date": d.expected_delivery_date or "Within 2-3 Business Days",
            "pickup_address": d.pickup_address or "RetailSphere Operations Facility, MC Road, Ettumanoor, Kottayam, Kerala - 686631",
            "destination_address": dest_address,
            "distance_km": float(d.distance_km) if d.distance_km is not None else 0.0,
            "customer_name": cust_name,
            "customer_phone": cust_user.phone if cust_user else (customer.phone if customer else None),
            "total_amount": order_total,
            "transportation_charge": float(d.transportation_charge) if d.transportation_charge is not None else 0.0,
            "items": order_items,
            "items_count": sum(it["quantity"] for it in order_items) if order_items else 1,
            "assigned_personnel": {
                "personnel_id": personnel.personnel_id,
                "name": personnel.name,
                "phone": personnel.phone,
                "vehicle_type": personnel.vehicle_type,
                "vehicle_reg": personnel.vehicle_reg
            } if personnel else None,
            "delivery_notes": d.delivery_notes,
            "dispatched_at": d.dispatched_at.isoformat() if d.dispatched_at else None
        })

    return result


# --- 3. PREVIOUS DELIVERIES (COMPLETED HISTORY) ---

@router.get("/deliveries/previous")
def get_previous_deliveries(
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    deliveries = db.query(models.OrderFulfillment).filter(
        (models.OrderFulfillment.carrier_id == carrier.carrier_id) |
        (models.OrderFulfillment.carrier.ilike(f"%{carrier.carrier_name}%")),
        models.OrderFulfillment.fulfillment_status == "Delivered"
    ).order_by(models.OrderFulfillment.delivered_at.desc(), models.OrderFulfillment.fulfillment_id.desc()).all()

    result = []
    for d in deliveries:
        ord_obj = d.order
        fab_obj = d.fabrication_request
        customer = ord_obj.customer if ord_obj else (fab_obj.customer if fab_obj else None)
        cust_user = customer.user if customer else None
        personnel = d.assigned_personnel

        # Extract items directly from the database order or fabrication request
        order_items = []
        if ord_obj and ord_obj.items:
            for it in ord_obj.items:
                prod = it.product
                order_items.append({
                    "item_id": it.item_id,
                    "product_id": it.product_id,
                    "product_name": it.product_name or (prod.product_name if prod else "Custom Furniture Unit"),
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

        result.append({
            "fulfillment_id": d.fulfillment_id,
            "order_id": display_id,
            "raw_order_id": ord_obj.order_id if ord_obj else (fab_obj.fabrication_id if fab_obj else None),
            "fabrication_id": fab_obj.fabrication_id if fab_obj else None,
            "job_type": d.job_type or "FURNITURE_DELIVERY",
            "fulfillment_status": "Delivered",
            "delivery_status": "Delivered",
            "tracking_number": d.tracking_number or f"RS-EXP-{d.fulfillment_id:05d}",
            "delivered_at": d.delivered_at.strftime("%d %B %Y, %I:%M %p") if d.delivered_at else "Recently",
            "pickup_address": d.pickup_address or "RetailSphere Central Hub, Kottayam",
            "destination_address": dest_address,
            "distance_km": float(d.distance_km) if d.distance_km is not None else 0.0,
            "customer_name": cust_name,
            "customer_phone": cust_user.phone if cust_user else (customer.phone if customer else None),
            "items": order_items,
            "items_count": sum(it["quantity"] for it in order_items) if order_items else 1,
            "assigned_personnel": {
                "personnel_id": personnel.personnel_id,
                "name": personnel.name,
                "phone": personnel.phone,
                "vehicle_type": personnel.vehicle_type,
                "vehicle_reg": personnel.vehicle_reg
            } if personnel else None,
            "delivery_notes": d.delivery_notes,
            "transportation_charge": float(d.transportation_charge) if d.transportation_charge is not None else 0.0
        })

    return result


# --- 4. UPDATE DELIVERY STATUS ---

@router.put("/deliveries/{fulfillment_id}/status")
def update_carrier_delivery_status(
    fulfillment_id: int,
    payload: DeliveryStatusUpdatePayload,
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    fulfillment = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.fulfillment_id == fulfillment_id,
        models.OrderFulfillment.carrier_id == carrier.carrier_id
    ).first()

    if not fulfillment:
        raise HTTPException(status_code=404, detail="Assigned transportation job not found.")

    new_st = payload.status.strip()

    # Validate that driver/personnel is assigned before marking active transit or delivery
    if not fulfillment.assigned_personnel_id and not fulfillment.driver_id:
        if new_st.lower() in ["out for delivery", "out for pickup", "in transit", "delivered"]:
            raise HTTPException(
                status_code=400,
                detail="Please assign a delivery driver/personnel to this job before changing the status to in-transit or delivered."
            )

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

        # Create or update settlement record
        settlement = db.query(models.CarrierSettlement).filter(
            models.CarrierSettlement.fulfillment_id == fulfillment.fulfillment_id
        ).first()

        dist = float(fulfillment.distance_km) if fulfillment.distance_km is not None else 0.0
        cust_charge = float(fulfillment.transportation_charge) if fulfillment.transportation_charge is not None else 0.0

        active_agreement = db.query(models.CarrierAgreement).filter(
            models.CarrierAgreement.carrier_id == carrier.carrier_id,
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
                carrier_id=carrier.carrier_id,
                fulfillment_id=fulfillment.fulfillment_id,
                order_type=eff_order_type,
                order_id=eff_order_id,
                distance_km=dist,
                customer_charge=cust_charge,
                carrier_payout=carrier_payout,
                service_margin=service_margin,
                settlement_status="PENDING",
                notes=f"Delivery completed by {carrier.carrier_name}"
            )
            db.add(settlement)

    db.commit()
    db.refresh(fulfillment)

    return {
        "message": f"Transportation status updated to '{new_st}'",
        "fulfillment_id": fulfillment.fulfillment_id,
        "delivery_status": fulfillment.delivery_status
    }


# --- 5. ASSIGN PERSONNEL TO DELIVERY ---

@router.put("/deliveries/{fulfillment_id}/assign-personnel")
def assign_personnel_to_delivery(
    fulfillment_id: int,
    payload: PersonnelAssignPayload,
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    fulfillment = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.fulfillment_id == fulfillment_id,
        models.OrderFulfillment.carrier_id == carrier.carrier_id
    ).first()

    if not fulfillment:
        raise HTTPException(status_code=404, detail="Assigned transportation job not found.")

    personnel = db.query(models.DeliveryPersonnel).filter(
        models.DeliveryPersonnel.personnel_id == payload.personnel_id,
        models.DeliveryPersonnel.carrier_id == carrier.carrier_id
    ).first()

    if not personnel:
        raise HTTPException(status_code=404, detail="Delivery personnel not found under your agency.")

    fulfillment.assigned_personnel_id = personnel.personnel_id
    
    # Automatically set appropriate active transit status upon personnel assignment
    if (fulfillment.job_type or "").upper() == "FABRICATION_PICKUP":
        fulfillment.delivery_status = "Out for Pickup"
        fulfillment.fulfillment_status = "In Transit"
    else:
        fulfillment.delivery_status = "Out for Delivery"
        fulfillment.fulfillment_status = "In Transit"

    db.commit()

    return {
        "message": f"Assigned Delivery Personnel '{personnel.name}' to Job #{fulfillment_id}. Status updated to '{fulfillment.delivery_status}'.",
        "personnel_name": personnel.name,
        "delivery_status": fulfillment.delivery_status
    }


# --- 6. DELIVERY PERSONNEL CRUD ---

@router.get("/personnel")
def list_delivery_personnel(
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    personnel_list = db.query(models.DeliveryPersonnel).filter(
        models.DeliveryPersonnel.carrier_id == carrier.carrier_id
    ).order_by(models.DeliveryPersonnel.personnel_id.asc()).all()

    return personnel_list


@router.post("/personnel", status_code=status.HTTP_201_CREATED)
def create_delivery_personnel(
    payload: PersonnelCreatePayload,
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    name_clean = payload.name.strip()
    phone_clean = payload.phone.strip()
    if not name_clean or not phone_clean:
        raise HTTPException(status_code=400, detail="Name and Phone number are required.")

    new_person = models.DeliveryPersonnel(
        carrier_id=carrier.carrier_id,
        name=name_clean,
        phone=phone_clean,
        email=payload.email.strip() if payload.email else None,
        vehicle_type=payload.vehicle_type.strip() if payload.vehicle_type else "Mini Truck",
        vehicle_reg=payload.vehicle_reg.strip() if payload.vehicle_reg else None,
        notes=payload.notes.strip() if payload.notes else None,
        status="ACTIVE"
    )
    db.add(new_person)
    db.commit()
    db.refresh(new_person)

    return new_person


@router.put("/personnel/{personnel_id}")
def update_delivery_personnel(
    personnel_id: int,
    payload: PersonnelUpdatePayload,
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    person = db.query(models.DeliveryPersonnel).filter(
        models.DeliveryPersonnel.personnel_id == personnel_id,
        models.DeliveryPersonnel.carrier_id == carrier.carrier_id
    ).first()

    if not person:
        raise HTTPException(status_code=404, detail="Delivery personnel not found.")

    if payload.name is not None and payload.name.strip():
        person.name = payload.name.strip()
    if payload.phone is not None and payload.phone.strip():
        person.phone = payload.phone.strip()
    if payload.email is not None:
        person.email = payload.email.strip() if payload.email else None
    if payload.vehicle_type is not None:
        person.vehicle_type = payload.vehicle_type.strip()
    if payload.vehicle_reg is not None:
        person.vehicle_reg = payload.vehicle_reg.strip()
    if payload.status is not None:
        person.status = payload.status.strip()
    if payload.notes is not None:
        person.notes = payload.notes.strip()

    db.commit()
    db.refresh(person)
    return person


# --- 7. CARRIER AGREEMENTS ENDPOINT ---

@router.get("/agreements")
def get_carrier_agreements(
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    agreements = db.query(models.CarrierAgreement).filter(
        models.CarrierAgreement.carrier_id == carrier.carrier_id
    ).order_by(models.CarrierAgreement.agreement_id.desc()).all()

    return [
        {
            "agreement_id": a.agreement_id,
            "carrier_id": a.carrier_id,
            "agreement_number": a.agreement_number,
            "title": a.title,
            "effective_date": a.effective_date.isoformat() if a.effective_date else None,
            "expiry_date": a.expiry_date.isoformat() if a.expiry_date else None,
            "services_covered": a.services_covered,
            "transportation_terms": a.transportation_terms,
            "settlement_terms": a.settlement_terms,
            "terms_text": f"{a.transportation_terms}\n\nSettlement Terms: {a.settlement_terms}\n\nServices Covered: {a.services_covered}",
            "coverage_area": a.coverage_area or carrier.coverage_areas,
            "base_payout_rate": float(a.base_payout_rate) if a.base_payout_rate else 100.0,
            "per_km_payout_rate": float(a.per_km_payout_rate) if a.per_km_payout_rate else 15.0,
            "status": a.status,
            "document_url": a.document_url,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in agreements
    ]


# --- 8. CARRIER SETTLEMENTS ENDPOINT ---

@router.get("/settlements")
def get_carrier_settlements(
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    settlements = db.query(models.CarrierSettlement).filter(
        models.CarrierSettlement.carrier_id == carrier.carrier_id
    ).order_by(models.CarrierSettlement.settlement_id.desc()).all()

    return [
        {
            "settlement_id": s.settlement_id,
            "carrier_id": s.carrier_id,
            "fulfillment_id": s.fulfillment_id,
            "order_type": s.order_type,
            "order_id": s.order_id,
            "distance_km": float(s.distance_km) if s.distance_km is not None else 0.0,
            "customer_charge": float(s.customer_charge) if s.customer_charge is not None else 0.0,
            "carrier_payout": float(s.carrier_payout) if s.carrier_payout is not None else 0.0,
            "service_margin": float(s.service_margin) if s.service_margin is not None else 0.0,
            "settlement_status": s.settlement_status,
            "notes": s.notes,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "settled_at": s.settled_at.isoformat() if s.settled_at else None
        }
        for s in settlements
    ]


# --- 9. PERSONNEL EMAIL CHANGE REQUESTS REVIEW ---

class EmailChangeReviewPayload(BaseModel):
    action: str  # "APPROVE" or "REJECT"
    rejection_reason: Optional[str] = None


@router.get("/email-change-requests")
def get_carrier_email_change_requests(
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    db: Session = Depends(get_db)
):
    requests = db.query(models.PersonnelEmailChangeRequest).filter(
        models.PersonnelEmailChangeRequest.carrier_id == carrier.carrier_id
    ).order_by(models.PersonnelEmailChangeRequest.request_id.desc()).all()

    return [
        {
            "request_id": r.request_id,
            "personnel_id": r.personnel_id,
            "personnel_name": r.personnel.name if r.personnel else "Personnel",
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


@router.put("/email-change-requests/{request_id}/review")
def review_email_change_request(
    request_id: int,
    payload: EmailChangeReviewPayload,
    carrier: models.CarrierPartner = Depends(get_current_carrier),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    req_obj = db.query(models.PersonnelEmailChangeRequest).filter(
        models.PersonnelEmailChangeRequest.request_id == request_id,
        models.PersonnelEmailChangeRequest.carrier_id == carrier.carrier_id
    ).first()

    if not req_obj:
        raise HTTPException(status_code=404, detail="Email change request not found.")

    action = payload.action.upper()
    if action not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="Action must be either APPROVE or REJECT.")

    if action == "APPROVE":
        target_email = req_obj.requested_email.strip().lower()

        # Check if already taken
        existing_user = db.query(models.User).filter(
            models.User.email == target_email
        ).first()

        personnel = req_obj.personnel
        if existing_user and (not personnel or existing_user.user_id != personnel.user_id):
            raise HTTPException(status_code=400, detail="Target email is already associated with another active user account.")

        if personnel:
            personnel.email = target_email
            if personnel.user:
                personnel.user.email = target_email
                if personnel.user.username == req_obj.current_email:
                    personnel.user.username = target_email

        req_obj.status = "APPROVED"
        req_obj.reviewed_by_id = current_user.user_id
        req_obj.updated_at = datetime.utcnow()
        db.commit()

        return {
            "success": True,
            "message": f"Email change request approved. Personnel email updated to {target_email}.",
            "request_id": req_obj.request_id,
            "status": "APPROVED",
            "new_email": target_email
        }

    else:
        req_obj.status = "REJECTED"
        req_obj.rejection_reason = payload.rejection_reason or "Declined by Carrier Partner manager."
        req_obj.reviewed_by_id = current_user.user_id
        req_obj.updated_at = datetime.utcnow()
        db.commit()

        return {
            "success": True,
            "message": "Email change request declined.",
            "request_id": req_obj.request_id,
            "status": "REJECTED"
        }

