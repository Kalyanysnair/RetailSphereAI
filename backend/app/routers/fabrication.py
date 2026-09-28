from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
import random
import string
import time

from app.database import get_db
from app import models, auth
from app.utils.distance_calculator import compute_transportation_charge, HUB_ADDRESS

router = APIRouter(prefix="/api/fabrication", tags=["Fabrication Services"])

def generate_unique_tracking_number(db: Session) -> str:
    while True:
        rand_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        trk_num = f"TRK-{rand_code}"
        existing = db.query(models.OrderFulfillment).filter(models.OrderFulfillment.tracking_number == trk_num).first()
        if not existing:
            return trk_num


class TransportEstimatePayload(BaseModel):
    service_type: str  # FABRICATION_PICKUP or FABRICATION_RETURN
    address: str


class FabricationRequestCreatePayload(BaseModel):
    customer_id: Optional[int] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = "Customer"
    service_type: str  # Wood Cutting, Wood Shaping, Drilling, Edge Finishing, Surface Finishing, Custom Fabrication
    material_source: str = "Customer-Owned"  # Customer-Owned vs Company Material
    customer_material_id: Optional[int] = None
    dimensions: str
    quantity: int = 1
    drawing_image: Optional[str] = None
    requirements: Optional[str] = None
    deadline: Optional[str] = None
    # Transportation Options
    material_arrival_mode: Optional[str] = "CUSTOMER_BRINGS"  # CUSTOMER_BRINGS vs DOORSTEP_PICKUP
    material_pickup_address: Optional[str] = None
    return_delivery_mode: Optional[str] = "CUSTOMER_COLLECTS"  # CUSTOMER_COLLECTS vs DOORSTEP_DELIVERY
    return_delivery_address: Optional[str] = None


class FabricationStatusUpdatePayload(BaseModel):
    status: str  # REQUESTED, ASSESSED, QUOTED, APPROVED, PAID, IN_PRODUCTION, QC_PENDING, COMPLETED, CANCELLED
    estimated_price: Optional[float] = None
    remarks: Optional[str] = None


@router.post("/estimate-transport")
def estimate_transport_cost(payload: TransportEstimatePayload, db: Session = Depends(get_db)):
    addr = payload.address.strip() if payload.address else ""
    if not addr:
        raise HTTPException(status_code=400, detail="Address is required to estimate transportation.")
    
    st = payload.service_type.upper()
    if st not in ["FABRICATION_PICKUP", "FABRICATION_RETURN"]:
        st = "FABRICATION_PICKUP"
        
    origin = addr if st == "FABRICATION_PICKUP" else HUB_ADDRESS
    dest = HUB_ADDRESS if st == "FABRICATION_PICKUP" else addr
    
    result = compute_transportation_charge(db, origin, dest, st)
    return result


@router.get("/requests")
def get_fabrication_requests(
    customer_id: Optional[int] = None,
    customer_email: Optional[str] = None,
    all_requests: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    query = db.query(models.FabricationRequest)
    if customer_id:
        query = query.filter(models.FabricationRequest.customer_id == customer_id)
    elif customer_email and customer_email.strip():
        user = db.query(models.User).filter(models.User.email.ilike(customer_email.strip())).first()
        if user and user.customer_profile:
            query = query.filter(models.FabricationRequest.customer_id == user.customer_profile.customer_id)
    elif not all_requests:
        # PRODUCTION STAFF VIEW: ONLY show fabrication requests APPROVED by Retail Staff or active
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.FabricationRequest.review_status == "APPROVED",
                models.FabricationRequest.status.in_([
                    "APPROVED_BY_RETAIL", "ASSESSED", "QUOTED", "APPROVED", "PAID", "IN_PRODUCTION", "QC_PENDING", "COMPLETED"
                ])
            )
        )

    requests = query.order_by(models.FabricationRequest.created_at.desc()).all()
    res = []
    for f in requests:
        cust = f.customer
        cust_user = cust.user if cust else None

        # Gather any linked fulfillments
        fulfillments_data = []
        for ful in (f.fulfillments or []):
            fulfillments_data.append({
                "fulfillment_id": ful.fulfillment_id,
                "job_type": ful.job_type,
                "fulfillment_status": ful.fulfillment_status,
                "delivery_status": ful.delivery_status,
                "tracking_number": ful.tracking_number,
                "transportation_provider": ful.transportation_provider,
                "carrier": ful.carrier,
                "carrier_id": ful.carrier_id,
                "carrier_name": ful.carrier_partner.carrier_name if ful.carrier_partner else ful.carrier,
                "driver_name": ful.assigned_personnel.name if ful.assigned_personnel else (ful.driver_user.full_name if ful.driver_user else None),
                "pickup_address": ful.pickup_address,
                "destination_address": ful.destination_address,
                "distance_km": float(ful.distance_km) if ful.distance_km is not None else 0.0,
                "transportation_charge": float(ful.transportation_charge) if ful.transportation_charge is not None else 0.0,
                "expected_delivery_date": ful.expected_delivery_date,
                "dispatched_at": ful.dispatched_at.isoformat() if ful.dispatched_at else None,
                "delivered_at": ful.delivered_at.isoformat() if ful.delivered_at else None,
            })

        # Gather any linked production stages and active stage details
        prod_stages = db.query(models.ProductionStage).filter(
            models.ProductionStage.order_type == "Fabrication",
            models.ProductionStage.order_id == f.fabrication_id
        ).order_by(models.ProductionStage.sequence_order.asc()).all()

        stages_list = []
        active_stg_obj = None
        for st in prod_stages:
            st_meta = {}
            if st.remarks:
                try:
                    import json
                    parsed = json.loads(st.remarks)
                    if isinstance(parsed, dict):
                        st_meta = parsed
                except:
                    pass

            w_user = db.query(models.User).filter(models.User.user_id == st.assigned_worker_id).first() if st.assigned_worker_id else None
            st_dict = {
                "stage_id": st.stage_id,
                "stage_name": st.stage_name,
                "sequence_order": st.sequence_order,
                "status": "PAUSED" if st_meta.get("pause_reason") and (st.status or "").upper() in ["IN_PROGRESS", "PAUSED", "ON_HOLD"] else (st.status or "LOCKED").upper(),
                "progress_percentage": st.progress_percentage or 0,
                "assigned_worker_name": w_user.full_name if w_user else None,
                "required_skill": st.required_skill,
                "completed_sections": st_meta.get("completed_sections", []),
                "current_section": st_meta.get("current_section"),
                "pause_reason": st_meta.get("pause_reason"),
                "notes": st_meta.get("user_notes") or ""
            }
            stages_list.append(st_dict)
            if not active_stg_obj and st_dict["status"] in ["IN_PROGRESS", "PAUSED", "ASSIGNED"]:
                active_stg_obj = st_dict

        # Overall fabrication progress
        if stages_list:
            total_stg_pct = sum(s["progress_percentage"] for s in stages_list) // len(stages_list)
        else:
            total_stg_pct = 100 if f.status == "COMPLETED" else (40 if f.status in ["IN_PRODUCTION", "PAID"] else 15)

        res.append({
            "fabrication_id": f.fabrication_id,
            "customer_id": f.customer_id,
            "customer_name": cust_user.full_name if cust_user else "Customer",
            "customer_email": cust_user.email if cust_user else "",
            "customer_phone": cust_user.phone if cust_user else (cust.phone if cust else None),
            "service_type": f.service_type,
            "material_source": f.material_source,
            "customer_material_id": f.customer_material_id,
            "dimensions": f.dimensions,
            "quantity": f.quantity,
            "drawing_image": f.drawing_image,
            "requirements": f.requirements,
            "deadline": f.deadline.isoformat() if f.deadline else None,
            "estimated_price": float(f.estimated_price) if f.estimated_price else None,
            "status": f.status,
            "payment_status": f.payment_status or "Pending",
            "material_arrival_mode": f.material_arrival_mode or "CUSTOMER_BRINGS",
            "material_pickup_address": f.material_pickup_address,
            "material_pickup_distance_km": float(f.material_pickup_distance_km) if f.material_pickup_distance_km is not None else 0.0,
            "material_pickup_charge": float(f.material_pickup_charge) if f.material_pickup_charge is not None else 0.0,
            "return_delivery_mode": f.return_delivery_mode or "CUSTOMER_COLLECTS",
            "return_delivery_address": f.return_delivery_address,
            "return_delivery_distance_km": float(f.return_delivery_distance_km) if f.return_delivery_distance_km is not None else 0.0,
            "return_delivery_charge": float(f.return_delivery_charge) if f.return_delivery_charge is not None else 0.0,
            "fulfillments": fulfillments_data,
            "production_stages": stages_list,
            "active_stage": active_stg_obj,
            "overall_progress_percentage": total_stg_pct,
            "is_paused": bool(active_stg_obj and active_stg_obj.get("pause_reason")),
            "pause_reason": active_stg_obj.get("pause_reason") if active_stg_obj else None,
            "created_at": f.created_at.isoformat() if f.created_at else None
        })
    return res


@router.post("/requests", status_code=status.HTTP_201_CREATED)
def create_fabrication_request(payload: FabricationRequestCreatePayload, db: Session = Depends(get_db)):
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

    deadline_obj = None
    if payload.deadline:
        try:
            deadline_obj = datetime.strptime(payload.deadline, "%Y-%m-%d").date()
        except:
            pass

    # Process Transportation distance & charges
    pickup_dist = 0.0
    pickup_charge = 0.0
    arr_mode = payload.material_arrival_mode or "CUSTOMER_BRINGS"
    if arr_mode in ["DOORSTEP_PICKUP", "RETAILSPHERE_PICKUP"] and payload.material_pickup_address and payload.material_pickup_address.strip():
        calc = compute_transportation_charge(db, payload.material_pickup_address.strip(), HUB_ADDRESS, "FABRICATION_PICKUP")
        pickup_dist = calc["distance_km"]
        pickup_charge = calc["calculated_charge"]

    return_dist = 0.0
    return_charge = 0.0
    ret_mode = payload.return_delivery_mode or "CUSTOMER_COLLECTS"
    if ret_mode in ["DOORSTEP_DELIVERY", "RETAILSPHERE_DELIVERY"] and payload.return_delivery_address and payload.return_delivery_address.strip():
        calc = compute_transportation_charge(db, HUB_ADDRESS, payload.return_delivery_address.strip(), "FABRICATION_RETURN")
        return_dist = calc["distance_km"]
        return_charge = calc["calculated_charge"]

    new_fab = models.FabricationRequest(
        customer_id=cust_id,
        service_type=payload.service_type,
        material_source=payload.material_source,
        customer_material_id=payload.customer_material_id,
        dimensions=payload.dimensions,
        quantity=payload.quantity,
        drawing_image=payload.drawing_image,
        requirements=payload.requirements,
        deadline=deadline_obj,
        material_arrival_mode=arr_mode,
        material_pickup_address=payload.material_pickup_address.strip() if payload.material_pickup_address else None,
        material_pickup_distance_km=pickup_dist,
        material_pickup_charge=pickup_charge,
        return_delivery_mode=ret_mode,
        return_delivery_address=payload.return_delivery_address.strip() if payload.return_delivery_address else None,
        return_delivery_distance_km=return_dist,
        return_delivery_charge=return_charge,
        status="REQUESTED",
        payment_status="Pending",
        created_at=datetime.utcnow()
    )
    db.add(new_fab)
    db.commit()
    db.refresh(new_fab)

    return {
        "message": "Fabrication request submitted successfully",
        "fabrication_id": new_fab.fabrication_id,
        "status": new_fab.status,
        "material_pickup_charge": pickup_charge,
        "return_delivery_charge": return_charge
    }


@router.put("/requests/{fabrication_id}/status")
def update_fabrication_status(fabrication_id: int, payload: FabricationStatusUpdatePayload, db: Session = Depends(get_db)):
    fab = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == fabrication_id).first()
    if not fab:
        raise HTTPException(status_code=404, detail="Fabrication request not found")

    fab.status = payload.status
    if payload.estimated_price is not None:
        fab.estimated_price = payload.estimated_price

    db.commit()
    db.refresh(fab)
    return {"message": f"Fabrication request #{fabrication_id} status updated to {payload.status}", "fabrication_id": fabrication_id}


@router.put("/requests/{fabrication_id}/pay")
def pay_fabrication_request(fabrication_id: int, db: Session = Depends(get_db)):
    fab = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == fabrication_id).first()
    if not fab:
        raise HTTPException(status_code=404, detail="Fabrication request not found")

    rzp_id = f"pay_Rzp{int(time.time())}{fabrication_id:02d}"

    fab.payment_status = "Paid"
    fab.status = "PAID"

    # Total payable includes base quote + any transportation charges
    fab_total = float(fab.estimated_price or 0.0)
    if fab.material_arrival_mode in ["DOORSTEP_PICKUP", "RETAILSPHERE_PICKUP"]:
        fab_total += float(fab.material_pickup_charge or 0.0)
    if fab.return_delivery_mode in ["DOORSTEP_DELIVERY", "RETAILSPHERE_DELIVERY"]:
        fab_total += float(fab.return_delivery_charge or 0.0)

    # Record or update payment details
    pmt = db.query(models.Payment).filter(
        models.Payment.order_type == "Fabrication",
        models.Payment.order_id == fab.fabrication_id
    ).first()

    if not pmt:
        pmt = models.Payment(
            order_type="Fabrication",
            order_id=fab.fabrication_id,
            amount=fab_total,
            payment_method="Razorpay",
            transaction_id=rzp_id,
            payment_status="Paid",
            payment_date=datetime.utcnow()
        )
        db.add(pmt)
    else:
        pmt.payment_status = "Paid"
        pmt.payment_method = "Razorpay"
        pmt.transaction_id = rzp_id
        pmt.amount = fab_total
        pmt.payment_date = datetime.utcnow()

    # --- FULFILLMENT CREATION FOR REQUIRED TRANSPORTATION ---
    # 1. Fabrication Pickup Fulfillment
    if fab.material_arrival_mode in ["DOORSTEP_PICKUP", "RETAILSPHERE_PICKUP"]:
        existing_pickup = db.query(models.OrderFulfillment).filter(
            models.OrderFulfillment.fabrication_id == fab.fabrication_id,
            models.OrderFulfillment.job_type == "FABRICATION_PICKUP"
        ).first()

        if not existing_pickup:
            cust_addr = fab.material_pickup_address or (
                f"{fab.customer.address}, {fab.customer.city} - {fab.customer.pincode}" if fab.customer and fab.customer.address else "Customer Location"
            )
            dist = float(fab.material_pickup_distance_km) if fab.material_pickup_distance_km else 10.0
            charge = float(fab.material_pickup_charge) if fab.material_pickup_charge else 120.0

            pickup_fulfillment = models.OrderFulfillment(
                fabrication_id=fab.fabrication_id,
                job_type="FABRICATION_PICKUP",
                fulfillment_status="Pending",
                delivery_status="Pending",
                pickup_address=cust_addr,
                destination_address=HUB_ADDRESS,
                distance_km=dist,
                transportation_charge=charge,
                tracking_number=generate_unique_tracking_number(db),
                expected_delivery_date=(datetime.utcnow() + timedelta(days=1)).strftime("%d %B %Y")
            )
            db.add(pickup_fulfillment)

    # 2. Fabrication Return Delivery Fulfillment
    if fab.return_delivery_mode in ["DOORSTEP_DELIVERY", "RETAILSPHERE_DELIVERY"]:
        existing_return = db.query(models.OrderFulfillment).filter(
            models.OrderFulfillment.fabrication_id == fab.fabrication_id,
            models.OrderFulfillment.job_type == "FABRICATION_RETURN"
        ).first()

        if not existing_return:
            cust_addr = fab.return_delivery_address or (
                f"{fab.customer.address}, {fab.customer.city} - {fab.customer.pincode}" if fab.customer and fab.customer.address else "Customer Delivery Address"
            )
            dist = float(fab.return_delivery_distance_km) if fab.return_delivery_distance_km else 10.0
            charge = float(fab.return_delivery_charge) if fab.return_delivery_charge else 120.0

            return_fulfillment = models.OrderFulfillment(
                fabrication_id=fab.fabrication_id,
                job_type="FABRICATION_RETURN",
                fulfillment_status="Pending",
                delivery_status="Pending",
                pickup_address=HUB_ADDRESS,
                destination_address=cust_addr,
                distance_km=dist,
                transportation_charge=charge,
                tracking_number=generate_unique_tracking_number(db),
                expected_delivery_date=(datetime.utcnow() + timedelta(days=3)).strftime("%d %B %Y")
            )
            db.add(return_fulfillment)

    db.commit()
    return {
        "message": f"Payment recorded for Fabrication Request #{fabrication_id}",
        "status": "PAID",
        "razorpay_payment_id": rzp_id,
        "transaction_id": rzp_id
    }
