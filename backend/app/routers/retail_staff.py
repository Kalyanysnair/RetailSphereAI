from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app import models
from app.database import get_db

router = APIRouter(prefix="/api/retail-staff", tags=["Retail Staff Operations"])

def notify_user(db: Session, user_id: int, title: str, message: str):
    notif = models.Notification(
        user_id=user_id,
        title=title,
        message=message,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)


# 1. GET /api/retail-staff/dashboard/summary
@router.get("/dashboard/summary")
def get_retail_staff_dashboard_summary(db: Session = Depends(get_db)):
    # Ready-made orders counts
    all_readymade = db.query(models.ReadymadeOrder).all()
    to_pack = 0
    ready_to_dispatch = 0
    out_for_delivery = 0
    new_orders = 0

    for o in all_readymade:
        st = (o.order_status or "").strip().lower()
        if st in ["order placed", "payment confirmed", "order confirmed", "pending"]:
            new_orders += 1
            to_pack += 1
        elif st == "processing":
            to_pack += 1
        elif st == "packed":
            ready_to_dispatch += 1
        elif st in ["out for delivery", "out_for_delivery"]:
            out_for_delivery += 1

    # Return requests count
    returns_count = db.query(models.OrderReturn).count()

    # Request Inbox counts
    customizations_query = db.query(models.CustomOrder)
    new_customizations = customizations_query.filter(
        or_(
            models.CustomOrder.review_status == "NEW",
            models.CustomOrder.review_status == "UNDER_REVIEW",
            models.CustomOrder.review_status.is_(None)
        )
    ).count()

    fabrication_query = db.query(models.FabricationRequest)
    new_fabrications = fabrication_query.filter(
        or_(
            models.FabricationRequest.review_status == "NEW",
            models.FabricationRequest.review_status == "UNDER_REVIEW",
            models.FabricationRequest.review_status.is_(None)
        )
    ).count()

    services_query = db.query(models.ServiceRequest)
    new_services = services_query.filter(
        or_(
            models.ServiceRequest.review_status == "NEW",
            models.ServiceRequest.review_status == "UNDER_REVIEW",
            models.ServiceRequest.review_status.is_(None)
        )
    ).count()

    pending_reviews = new_customizations + new_fabrications + new_services

    # Priority Items
    priority_items = []
    
    # Check urgent customizations
    high_customs = customizations_query.filter(
        or_(
            models.CustomOrder.priority.in_(["HIGH", "URGENT"]),
            models.CustomOrder.review_status == "MORE_INFO_REQUESTED"
        )
    ).limit(5).all()
    for c in high_customs:
        priority_items.append({
            "id": f"CUS-{c.custom_order_id:04d}",
            "type": "Customization",
            "customer_name": c.customer.user.full_name if c.customer and c.customer.user else "Customer",
            "title": f"Custom {c.furniture_type}",
            "status": c.review_status or "NEW",
            "priority": c.priority or "NORMAL",
            "action": "Needs Review" if c.review_status in ["NEW", "UNDER_REVIEW", None] else "Awaiting Customer Info"
        })

    # Check urgent fabrications
    high_fabs = fabrication_query.filter(
        or_(
            models.FabricationRequest.priority.in_(["HIGH", "URGENT"]),
            models.FabricationRequest.review_status == "MORE_INFO_REQUESTED"
        )
    ).limit(5).all()
    for f in high_fabs:
        priority_items.append({
            "id": f"FAB-{f.fabrication_id:04d}",
            "type": "Fabrication",
            "customer_name": f.customer.user.full_name if f.customer and f.customer.user else "Customer",
            "title": f"{f.service_type} ({f.dimensions})",
            "status": f.review_status or "NEW",
            "priority": f.priority or "NORMAL",
            "action": "Needs Technical Review"
        })

    # Check urgent readymade orders to pack
    urgent_orders = [o for o in all_readymade if (o.order_status or "").lower() in ["order placed", "processing"]][:5]
    for o in urgent_orders:
        priority_items.append({
            "id": f"ORD-{o.order_id:04d}",
            "type": "Retail Order",
            "customer_name": o.customer_name or "Valued Customer",
            "title": f"Order #{o.order_id}",
            "status": o.order_status or "Pending",
            "priority": "HIGH",
            "action": "Ready for Packing"
        })

    # Recent Activity (Mock dynamic log from latest events)
    recent_activity = []
    latest_orders = db.query(models.ReadymadeOrder).order_by(models.ReadymadeOrder.order_date.desc()).limit(3).all()
    for o in latest_orders:
        cust_n = o.customer_name or 'Customer'
        recent_activity.append({
            "time": o.order_date.isoformat() if o.order_date else None,
            "text": f"New Retail Order ORD-{o.order_id:04d} placed by {cust_n}",
            "category": "Retail Order"
        })

    latest_customs = db.query(models.CustomOrder).order_by(models.CustomOrder.order_date.desc()).limit(3).all()
    for c in latest_customs:
        cust_name = c.customer.user.full_name if c.customer and c.customer.user else "Customer"
        recent_activity.append({
            "time": c.order_date.isoformat() if c.order_date else None,
            "text": f"Customization request CUS-{c.custom_order_id:04d} ({c.furniture_type}) submitted by {cust_name}",
            "category": "Customization"
        })

    return {
        "today": {
            "new_orders": new_orders,
            "pending_reviews": pending_reviews,
            "to_pack": to_pack,
            "ready_to_dispatch": ready_to_dispatch,
            "out_for_delivery": out_for_delivery,
            "return_requests": returns_count
        },
        "inbox_counts": {
            "new_customizations": new_customizations,
            "new_fabrication": new_fabrications,
            "new_onsite_requests": new_services
        },
        "priority_items": priority_items[:10],
        "recent_activity": recent_activity[:10]
    }


# 2. GET /api/retail-staff/request-inbox
@router.get("/request-inbox")
def get_unified_request_inbox(
    category_filter: Optional[str] = "ALL",  # ALL, CUSTOMIZATION, FABRICATION, ON-SITE SERVICES
    status_filter: Optional[str] = "ALL",    # ALL, NEW, UNDER_REVIEW, MORE_INFO_REQUESTED, APPROVED, REJECTED
    db: Session = Depends(get_db)
):
    items = []

    # 1. Customization Requests
    if category_filter.upper() in ["ALL", "CUSTOMIZATION"]:
        q_cust = db.query(models.CustomOrder)
        if status_filter.upper() != "ALL":
            if status_filter.upper() == "MORE_INFORMATION":
                q_cust = q_cust.filter(models.CustomOrder.review_status == "MORE_INFO_REQUESTED")
            else:
                q_cust = q_cust.filter(models.CustomOrder.review_status == status_filter.upper())
        
        customs = q_cust.order_by(models.CustomOrder.order_date.desc()).all()
        for c in customs:
            cust_name = c.customer.user.full_name if c.customer and c.customer.user else "Customer"
            cust_email = c.customer.user.email if c.customer and c.customer.user else ""
            items.append({
                "request_id": f"CUS-{c.custom_order_id:04d}",
                "numeric_id": c.custom_order_id,
                "type": "CUSTOMIZATION",
                "customer_name": cust_name,
                "customer_email": cust_email,
                "title": f"Custom {c.furniture_type}",
                "material": c.material,
                "dimensions": c.dimensions,
                "color": c.color,
                "description": c.design_description,
                "reference_image": c.reference_image,
                "estimated_price": float(c.estimated_price) if c.estimated_price else None,
                "date": c.order_date.isoformat() if c.order_date else None,
                "review_status": c.review_status or "NEW",
                "order_status": c.order_status,
                "priority": c.priority or "NORMAL",
                "review_notes": c.review_notes
            })

    # 2. Fabrication Requests
    if category_filter.upper() in ["ALL", "FABRICATION"]:
        q_fab = db.query(models.FabricationRequest)
        if status_filter.upper() != "ALL":
            if status_filter.upper() == "MORE_INFORMATION":
                q_fab = q_fab.filter(models.FabricationRequest.review_status == "MORE_INFO_REQUESTED")
            else:
                q_fab = q_fab.filter(models.FabricationRequest.review_status == status_filter.upper())
        
        fabs = q_fab.order_by(models.FabricationRequest.created_at.desc()).all()
        for f in fabs:
            cust_name = f.customer.user.full_name if f.customer and f.customer.user else "Customer"
            cust_email = f.customer.user.email if f.customer and f.customer.user else ""
            items.append({
                "request_id": f"FAB-{f.fabrication_id:04d}",
                "numeric_id": f.fabrication_id,
                "type": "FABRICATION",
                "customer_name": cust_name,
                "customer_email": cust_email,
                "title": f"{f.service_type}",
                "material": f.material_source,
                "dimensions": f.dimensions,
                "quantity": f.quantity,
                "description": f.requirements,
                "reference_image": f.drawing_image,
                "estimated_price": float(f.estimated_price) if f.estimated_price else None,
                "date": f.created_at.isoformat() if f.created_at else None,
                "review_status": f.review_status or "NEW",
                "order_status": f.status,
                "priority": f.priority or "NORMAL",
                "review_notes": f.review_notes
            })

    # 3. On-Site Service Requests
    if category_filter.upper() in ["ALL", "ON-SITE SERVICES", "SERVICES"]:
        q_srv = db.query(models.ServiceRequest)
        if status_filter.upper() != "ALL":
            if status_filter.upper() == "MORE_INFORMATION":
                q_srv = q_srv.filter(models.ServiceRequest.review_status == "MORE_INFO_REQUESTED")
            else:
                q_srv = q_srv.filter(models.ServiceRequest.review_status == status_filter.upper())
        
        srvs = q_srv.order_by(models.ServiceRequest.created_at.desc()).all()
        for s in srvs:
            cust_name = s.customer.user.full_name if s.customer and s.customer.user else "Customer"
            cust_email = s.customer.user.email if s.customer and s.customer.user else ""
            items.append({
                "request_id": f"ONS-{s.service_id:04d}",
                "numeric_id": s.service_id,
                "type": "ON-SITE SERVICES",
                "customer_name": cust_name,
                "customer_email": cust_email,
                "title": f"Service: {s.service_category}",
                "description": s.description,
                "address": s.address,
                "city": s.city,
                "pincode": s.pincode,
                "preferred_date": s.preferred_date.isoformat() if s.preferred_date else None,
                "preferred_time": s.preferred_time,
                "date": s.created_at.isoformat() if s.created_at else None,
                "review_status": s.review_status or "NEW",
                "order_status": s.status,
                "priority": s.priority or "NORMAL",
                "review_notes": s.review_notes
            })

    # Sort all combined items by date descending
    items.sort(key=lambda x: x["date"] or "", reverse=True)
    return items


# Payloads for Review Actions
class ReviewRequestPayload(BaseModel):
    staff_id: Optional[int] = 1
    review_status: str  # APPROVED, MORE_INFO_REQUESTED, REJECTED, UNDER_REVIEW
    review_notes: Optional[str] = None
    priority: Optional[str] = "NORMAL"


# 3. PUT /api/retail-staff/customizations/{custom_order_id}/review
@router.put("/customizations/{custom_order_id}/review")
def review_customization_request(custom_order_id: int, payload: ReviewRequestPayload, db: Session = Depends(get_db)):
    cust_order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == custom_order_id).first()
    if not cust_order:
        raise HTTPException(status_code=404, detail="Customization request not found")

    rev_st = payload.review_status.upper().strip()
    cust_order.review_status = rev_st
    cust_order.reviewed_by_id = payload.staff_id
    cust_order.reviewed_at = datetime.utcnow()
    if payload.review_notes:
        cust_order.review_notes = payload.review_notes
    if payload.priority:
        cust_order.priority = payload.priority.upper()

    user_to_notify = cust_order.customer.user_id if cust_order.customer else None

    if rev_st == "APPROVED":
        cust_order.order_status = "APPROVED_BY_RETAIL"
        if user_to_notify:
            notify_user(
                db,
                user_id=user_to_notify,
                title=f"Customization Approved — #CUS-{cust_order.custom_order_id:04d}",
                message=f"Your custom furniture request '{cust_order.furniture_type}' has been reviewed & approved by Retail Staff! It is now with Production Staff for technical quotation."
            )
    elif rev_st == "MORE_INFO_REQUESTED":
        if user_to_notify:
            notify_user(
                db,
                user_id=user_to_notify,
                title=f"Action Required — #CUS-{cust_order.custom_order_id:04d}",
                message=f"Retail Staff requested additional details on your request: {payload.review_notes or 'Please check details.'}"
            )
    elif rev_st == "REJECTED":
        cust_order.order_status = "REJECTED_BY_RETAIL"
        if user_to_notify:
            notify_user(
                db,
                user_id=user_to_notify,
                title=f"Request Declined — #CUS-{cust_order.custom_order_id:04d}",
                message=f"Your customization request was declined by Retail Staff. Reason: {payload.review_notes or 'Specs not feasible.'}"
            )

    db.commit()
    return {"message": f"Customization request #CUS-{custom_order_id:04d} review status updated to {rev_st}"}


# 4. PUT /api/retail-staff/fabrication/{fabrication_id}/review
@router.put("/fabrication/{fabrication_id}/review")
def review_fabrication_request(fabrication_id: int, payload: ReviewRequestPayload, db: Session = Depends(get_db)):
    fab_req = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == fabrication_id).first()
    if not fab_req:
        raise HTTPException(status_code=404, detail="Fabrication request not found")

    rev_st = payload.review_status.upper().strip()
    fab_req.review_status = rev_st
    fab_req.reviewed_by_id = payload.staff_id
    fab_req.reviewed_at = datetime.utcnow()
    if payload.review_notes:
        fab_req.review_notes = payload.review_notes
    if payload.priority:
        fab_req.priority = payload.priority.upper()

    user_to_notify = fab_req.customer.user_id if fab_req.customer else None

    if rev_st == "APPROVED":
        fab_req.status = "APPROVED_BY_RETAIL"
        if user_to_notify:
            notify_user(
                db,
                user_id=user_to_notify,
                title=f"Fabrication Request Approved — #FAB-{fab_req.fabrication_id:04d}",
                message=f"Your fabrication request '{fab_req.service_type}' was approved by Retail Staff and sent to Production for material & cutting assessment."
            )
    elif rev_st == "MORE_INFO_REQUESTED":
        if user_to_notify:
            notify_user(
                db,
                user_id=user_to_notify,
                title=f"Action Required — #FAB-{fab_req.fabrication_id:04d}",
                message=f"Retail Staff requested additional fabrication requirements: {payload.review_notes or 'Please check requirements.'}"
            )
    elif rev_st == "REJECTED":
        fab_req.status = "REJECTED_BY_RETAIL"
        if user_to_notify:
            notify_user(
                db,
                user_id=user_to_notify,
                title=f"Fabrication Declined — #FAB-{fab_req.fabrication_id:04d}",
                message=f"Your fabrication request was declined by Retail Staff. Reason: {payload.review_notes or 'Service unavailable.'}"
            )

    db.commit()
    return {"message": f"Fabrication request #FAB-{fabrication_id:04d} review status updated to {rev_st}"}


# 5. PUT /api/retail-staff/services/{service_id}/review
@router.put("/services/{service_id}/review")
def review_service_request(service_id: int, payload: ReviewRequestPayload, db: Session = Depends(get_db)):
    srv_req = db.query(models.ServiceRequest).filter(models.ServiceRequest.service_id == service_id).first()
    if not srv_req:
        raise HTTPException(status_code=404, detail="Service request not found")

    rev_st = payload.review_status.upper().strip()
    srv_req.review_status = rev_st
    srv_req.reviewed_by_id = payload.staff_id
    srv_req.reviewed_at = datetime.utcnow()
    if payload.review_notes:
        srv_req.review_notes = payload.review_notes
    if payload.priority:
        srv_req.priority = payload.priority.upper()

    user_to_notify = srv_req.customer.user_id if srv_req.customer else None

    if rev_st == "APPROVED":
        srv_req.status = "APPROVED_BY_RETAIL"
        if user_to_notify:
            notify_user(
                db,
                user_id=user_to_notify,
                title=f"Service Booking Approved — #ONS-{srv_req.service_id:04d}",
                message=f"Your on-site service booking for '{srv_req.service_category}' has been approved by Retail Staff. An artisan will be assigned shortly."
            )

    db.commit()
    return {"message": f"Service booking #ONS-{service_id:04d} review status updated to {rev_st}"}


# Payloads for Universal Request Messaging
class PostRequestMessagePayload(BaseModel):
    sender_id: Optional[int] = None
    sender_role: str  # Customer, Retail Staff, Production Staff
    sender_name: str
    message: str


# 6. GET & POST Universal Request Messaging
@router.get("/messages/{request_type}/{request_id}")
def get_request_messages(request_type: str, request_id: int, db: Session = Depends(get_db)):
    msgs = db.query(models.RequestMessage).filter(
        models.RequestMessage.request_type == request_type.lower(),
        models.RequestMessage.request_id == request_id
    ).order_by(models.RequestMessage.created_at.asc()).all()

    res = []
    for m in msgs:
        res.append({
            "message_id": m.message_id,
            "request_type": m.request_type,
            "request_id": m.request_id,
            "sender_id": m.sender_id,
            "sender_role": m.sender_role,
            "sender_name": m.sender_name,
            "message": m.message,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })
    return res


@router.post("/messages/{request_type}/{request_id}")
def post_request_message(request_type: str, request_id: int, payload: PostRequestMessagePayload, db: Session = Depends(get_db)):
    new_msg = models.RequestMessage(
        request_type=request_type.lower(),
        request_id=request_id,
        sender_id=payload.sender_id,
        sender_role=payload.sender_role,
        sender_name=payload.sender_name,
        message=payload.message.strip(),
        created_at=datetime.utcnow()
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    return {
        "message": "Request message sent successfully",
        "message_id": new_msg.message_id,
        "created_at": new_msg.created_at.isoformat()
    }
