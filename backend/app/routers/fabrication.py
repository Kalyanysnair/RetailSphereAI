from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import time

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/fabrication", tags=["Fabrication Services"])

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

class FabricationStatusUpdatePayload(BaseModel):
    status: str  # REQUESTED, ASSESSED, QUOTED, APPROVED, PAID, IN_PRODUCTION, QC_PENDING, COMPLETED, CANCELLED
    estimated_price: Optional[float] = None
    remarks: Optional[str] = None

@router.get("/requests")
def get_fabrication_requests(
    customer_id: Optional[int] = None,
    customer_email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.FabricationRequest)
    if customer_id:
        query = query.filter(models.FabricationRequest.customer_id == customer_id)
    elif customer_email and customer_email.strip():
        user = db.query(models.User).filter(models.User.email.ilike(customer_email.strip())).first()
        if user and user.customer_profile:
            query = query.filter(models.FabricationRequest.customer_id == user.customer_profile.customer_id)
    else:
        # PRODUCTION STAFF VIEW: ONLY show fabrication requests APPROVED by Retail Staff
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
        res.append({
            "fabrication_id": f.fabrication_id,
            "customer_id": f.customer_id,
            "customer_name": cust_user.full_name if cust_user else "Customer",
            "customer_email": cust_user.email if cust_user else "",
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
        "status": new_fab.status
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

    # Record or update payment details
    pmt = db.query(models.Payment).filter(
        models.Payment.order_type == "Fabrication",
        models.Payment.order_id == fab.fabrication_id
    ).first()

    if not pmt:
        pmt = models.Payment(
            order_type="Fabrication",
            order_id=fab.fabrication_id,
            amount=fab.estimated_price or 0,
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
        pmt.amount = fab.estimated_price or 0
        pmt.payment_date = datetime.utcnow()

    db.commit()
    return {
        "message": f"Payment recorded for Fabrication Request #{fabrication_id}",
        "status": "PAID",
        "razorpay_payment_id": rzp_id,
        "transaction_id": rzp_id
    }
