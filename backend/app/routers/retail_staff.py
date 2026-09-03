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
    urgent_orders = [o for o in all_readymade if (o.order_status or "").lower() in ["order placed", "processing", "pending", "paid", "paid & placed"]]
    for o in urgent_orders:
        cust_name = o.customer_name
        if not cust_name and o.customer_id:
            c = db.query(models.Customer).filter(models.Customer.customer_id == o.customer_id).first()
            if c and c.user:
                cust_name = c.user.full_name
        priority_items.append({
            "id": f"RET-{o.order_id:06d}",
            "type": "Retail Order",
            "customer_name": cust_name or "Valued Customer",
            "title": f"Store Order #{o.order_id}",
            "status": o.order_status or "Order Placed",
            "priority": "HIGH",
            "action": "Ready for Packing"
        })

    # Recent Activity (Live log from real customer order events)
    recent_activity = []
    latest_orders = db.query(models.ReadymadeOrder).order_by(models.ReadymadeOrder.order_date.desc()).all()
    for o in latest_orders:
        cust_n = o.customer_name
        if not cust_n and o.customer_id:
            c = db.query(models.Customer).filter(models.Customer.customer_id == o.customer_id).first()
            if c and c.user:
                cust_n = c.user.full_name
        recent_activity.append({
            "time": o.order_date.isoformat() if o.order_date else None,
            "text": f"New Store Order RET-{o.order_id:06d} placed by {cust_n or 'Valued Customer'}",
            "category": "Retail Order"
        })

    latest_customs = db.query(models.CustomOrder).order_by(models.CustomOrder.order_date.desc()).all()
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
        "priority_items": priority_items,
        "recent_activity": recent_activity
    }


# 2. GET /api/retail-staff/request-inbox
@router.get("/request-inbox")
def get_unified_request_inbox(
    category_filter: Optional[str] = "ALL",  # ALL, CUSTOMIZATION, FABRICATION, ON-SITE SERVICES
    status_filter: Optional[str] = "ALL",    # ALL, NEW, UNDER_REVIEW, MORE_INFO_REQUESTED, APPROVED, REJECTED
    staff_id: Optional[int] = None,          # Filter by specific assigned Retail Staff member
    unassigned_only: Optional[bool] = False, # Filter unassigned requests
    db: Session = Depends(get_db)
):
    items = []

    def get_staff_name(u_id):
        if not u_id:
            return "Unassigned"
        st = db.query(models.User).filter(models.User.user_id == u_id).first()
        return st.full_name if st else "Unassigned"

    # 1. Customization Requests
    if category_filter.upper() in ["ALL", "CUSTOMIZATION"]:
        q_cust = db.query(models.CustomOrder)
        if status_filter.upper() != "ALL":
            if status_filter.upper() == "MORE_INFORMATION":
                q_cust = q_cust.filter(models.CustomOrder.review_status == "MORE_INFO_REQUESTED")
            else:
                q_cust = q_cust.filter(models.CustomOrder.review_status == status_filter.upper())
        
        # Return all customization requests matching status filter

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
                "review_notes": c.review_notes,
                "reviewed_by_id": c.reviewed_by_id,
                "reviewed_by_name": get_staff_name(c.reviewed_by_id)
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
                "review_notes": f.review_notes,
                "reviewed_by_id": f.reviewed_by_id,
                "reviewed_by_name": get_staff_name(f.reviewed_by_id)
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
                "review_notes": s.review_notes,
                "reviewed_by_id": s.reviewed_by_id,
                "reviewed_by_name": get_staff_name(s.reviewed_by_id)
            })

    # 4. Ready-Made Store Orders
    if category_filter.upper() in ["ALL", "RETAIL_ORDERS", "STORE_PURCHASES", "READYMADE"]:
        q_ord = db.query(models.ReadymadeOrder)
        ords = q_ord.order_by(models.ReadymadeOrder.order_date.desc()).all()
        for o in ords:
            cust_name = o.customer_name
            cust_email = o.customer_email
            if (not cust_name or not cust_email) and o.customer_id:
                c = db.query(models.Customer).filter(models.Customer.customer_id == o.customer_id).first()
                if c and c.user:
                    cust_name = cust_name or c.user.full_name
                    cust_email = cust_email or c.user.email

            first_item = o.items[0] if o.items else None
            title_str = first_item.product_name if first_item else f"Store Order #{o.order_id}"
            img_url = first_item.image_url if first_item else None

            items.append({
                "request_id": f"RET-{o.order_id:06d}",
                "numeric_id": o.order_id,
                "type": "RETAIL_ORDER",
                "customer_name": cust_name or "Valued Customer",
                "customer_email": cust_email or "customer@retailsphere.com",
                "title": title_str,
                "material": "Store Inventory Item",
                "dimensions": f"{len(o.items)} Item(s)",
                "quantity": sum(i.quantity for i in o.items) if o.items else 1,
                "description": f"Paid & Placed Retail Store Purchase. Payment ID: {o.payment_id or 'N/A'}",
                "reference_image": img_url,
                "estimated_price": float(o.total_amount) if o.total_amount else None,
                "date": o.order_date.isoformat() if o.order_date else None,
                "review_status": "APPROVED" if o.payment_status == "Paid" else "NEW",
                "order_status": o.order_status or "Order Placed",
                "priority": "HIGH" if o.order_status in ["Order Placed", "Pending"] else "NORMAL",
                "review_notes": f"Payment Status: {o.payment_status}",
                "reviewed_by_id": o.retail_staff_id,
                "reviewed_by_name": get_staff_name(o.retail_staff_id)
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


# 7. GET /api/retail-staff/workload-recommendations
@router.get("/workload-recommendations")
def get_retail_staff_workload_recommendations(db: Session = Depends(get_db)):
    retail_role = db.query(models.Role).filter(models.Role.role_name == "Retail Staff").first()
    if not retail_role:
        return []

    staff_users = db.query(models.User).filter(models.User.role_id == retail_role.role_id, models.User.status == True).all()

    workloads = []
    min_load = 999999
    best_staff_id = None

    for staff in staff_users:
        custom_cnt = db.query(models.CustomOrder).filter(
            models.CustomOrder.reviewed_by_id == staff.user_id,
            or_(
                models.CustomOrder.review_status.in_(["NEW", "UNDER_REVIEW", "MORE_INFO_REQUESTED"]),
                models.CustomOrder.review_status.is_(None)
            )
        ).count()

        fab_cnt = db.query(models.FabricationRequest).filter(
            models.FabricationRequest.reviewed_by_id == staff.user_id,
            or_(
                models.FabricationRequest.review_status.in_(["NEW", "UNDER_REVIEW", "MORE_INFO_REQUESTED"]),
                models.FabricationRequest.review_status.is_(None)
            )
        ).count()

        srv_cnt = db.query(models.ServiceRequest).filter(
            models.ServiceRequest.reviewed_by_id == staff.user_id,
            or_(
                models.ServiceRequest.review_status.in_(["NEW", "UNDER_REVIEW", "MORE_INFO_REQUESTED"]),
                models.ServiceRequest.review_status.is_(None)
            )
        ).count()

        total_active = custom_cnt + fab_cnt + srv_cnt
        if total_active < min_load:
            min_load = total_active
            best_staff_id = staff.user_id

        workloads.append({
            "staff_id": staff.user_id,
            "full_name": staff.full_name,
            "email": staff.email,
            "phone": staff.phone,
            "active_request_count": total_active,
            "assigned_customizations": custom_cnt,
            "assigned_fabrications": fab_cnt,
            "assigned_services": srv_cnt,
            "is_recommended": False
        })

    for w in workloads:
        if w["staff_id"] == best_staff_id:
            w["is_recommended"] = True
            w["recommendation_reason"] = f"Lowest active request workload ({w['active_request_count']} active items)"

    return workloads


# 8. POST /api/retail-staff/assign-request
class RequestAssignPayload(BaseModel):
    request_type: str  # CUSTOMIZATION, FABRICATION, ON-SITE SERVICES
    request_id: int
    staff_id: int

@router.post("/assign-request")
def assign_request_to_retail_staff(payload: RequestAssignPayload, db: Session = Depends(get_db)):
    staff = db.query(models.User).filter(models.User.user_id == payload.staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Retail staff member not found")

    req_type = payload.request_type.upper().strip()
    if req_type == "CUSTOMIZATION":
        item = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.request_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Custom order not found")
        item.reviewed_by_id = payload.staff_id
        if not item.review_status or item.review_status == "NEW":
            item.review_status = "UNDER_REVIEW"
    elif req_type == "FABRICATION":
        item = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.request_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Fabrication request not found")
        item.reviewed_by_id = payload.staff_id
        if not item.review_status or item.review_status == "NEW":
            item.review_status = "UNDER_REVIEW"
    elif req_type in ["ON-SITE SERVICES", "SERVICES"]:
        item = db.query(models.ServiceRequest).filter(models.ServiceRequest.service_id == payload.request_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Service request not found")
        item.reviewed_by_id = payload.staff_id
        if not item.review_status or item.review_status == "NEW":
            item.review_status = "UNDER_REVIEW"
    else:
        raise HTTPException(status_code=400, detail="Invalid request type")

    # Add audit entry in ProductionHistory
    history_entry = models.ProductionHistory(
        order_type=req_type,
        order_id=payload.request_id,
        action_by_id=payload.staff_id,
        action="RETAIL_STAFF_ASSIGNED",
        new_status="UNDER_REVIEW",
        notes=f"Request assigned to Retail Staff member {staff.full_name} ({staff.email})",
        timestamp=datetime.utcnow()
    )
    db.add(history_entry)
    db.commit()

    return {
        "message": f"Request {payload.request_type} #{payload.request_id} assigned to Retail Staff {staff.full_name}",
        "assigned_staff_id": staff.user_id,
        "assigned_staff_name": staff.full_name
    }
