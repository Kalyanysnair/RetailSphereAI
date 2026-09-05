from typing import Optional, List
from datetime import datetime, timedelta
import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app import models
from app.database import get_db

router = APIRouter(prefix="/api/orders", tags=["fulfillment"])

def parse_order_num(order_id_str: str) -> int:
    clean_id = order_id_str.replace("RET-", "").replace("ORDER-", "").lstrip("0")
    if not clean_id or not clean_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid order ID format")
    return int(clean_id)


def resolve_valid_user_id(db: Session, user_id: Optional[int]) -> Optional[int]:
    if user_id:
        u = db.query(models.User.user_id).filter(models.User.user_id == user_id).first()
        if u:
            return user_id
    u_fallback = db.query(models.User.user_id).filter(models.User.role_id.in_([3, 2, 4])).first() or db.query(models.User.user_id).first()
    return u_fallback[0] if u_fallback else None


def generate_unique_tracking_number(db: Session) -> str:
    while True:
        rand_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        trk_num = f"TRK-{rand_code}"
        existing = db.query(models.OrderFulfillment).filter(models.OrderFulfillment.tracking_number == trk_num).first()
        if not existing:
            return trk_num


# Helper to record status history
def record_status_history(
    db: Session,
    order_id: int,
    previous_status: Optional[str],
    new_status: str,
    changed_by_id: Optional[int],
    changed_by_role: str = "Retail Staff",
    note: Optional[str] = None
):
    valid_user_id = resolve_valid_user_id(db, changed_by_id)
    history = models.OrderStatusHistory(
        order_id=order_id,
        previous_status=previous_status or "Order Placed",
        new_status=new_status,
        changed_by_id=valid_user_id,
        changed_by_role=changed_by_role,
        note=note
    )
    db.add(history)


def create_customer_notification(
    db: Session,
    customer_id: Optional[int],
    title: str,
    message: str
):
    if not customer_id:
        return
    cust = db.query(models.Customer).filter(models.Customer.customer_id == customer_id).first()
    if not cust or not cust.user_id:
        return

    notif = models.Notification(
        user_id=cust.user_id,
        title=title,
        message=message,
        is_read=False
    )
    db.add(notif)


# --- PAYLOAD SCHEMAS ---
class PackOrderPayload(BaseModel):
    staff_id: Optional[int] = None
    packing_notes: Optional[str] = "Packed securely with protective padding."


class DispatchOrderPayload(BaseModel):
    staff_id: Optional[int] = None
    carrier: Optional[str] = "Internal Fleet"
    tracking_number: Optional[str] = None
    expected_delivery_date: Optional[str] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    dispatch_note: Optional[str] = None


class DeliveryStatusPayload(BaseModel):
    staff_id: Optional[int] = None
    delivery_status: str
    notes: Optional[str] = None
    note: Optional[str] = None


# 1. GET /api/orders/fulfillment/summary
@router.get("/fulfillment/summary")
def get_fulfillment_summary(db: Session = Depends(get_db)):
    all_fulfillments = db.query(models.OrderFulfillment).all()
    all_orders = db.query(models.ReadymadeOrder).filter(
        ~models.ReadymadeOrder.order_status.in_(["Cancelled", "Returned"])
    ).all()

    total = len(all_orders)
    to_pack = 0
    packed = 0
    to_dispatch = 0
    dispatched = 0
    out_for_delivery = 0
    delivered = 0

    for o in all_orders:
        st = (o.order_status or "Order Placed").strip()
        if st in ["Order Placed", "Pending", "Processing", "Ready to Pack"]:
            to_pack += 1
        elif st in ["Packed", "PACKED"]:
            packed += 1
            to_dispatch += 1
        elif st in ["Dispatched", "DISPATCHED"]:
            dispatched += 1
        elif st in ["Out for Delivery", "OUT_FOR_DELIVERY"]:
            out_for_delivery += 1
        elif st in ["Delivered", "Completed"]:
            delivered += 1

    returns_count = db.query(models.OrderReturn).filter(models.OrderReturn.status != "Rejected").count()

    return {
        "to_pack": to_pack,
        "packed": packed,
        "to_dispatch": to_dispatch,
        "dispatched": dispatched,
        "out_for_delivery": out_for_delivery,
        "delivered": delivered,
        "returns": returns_count,
        "total_orders": total
    }


# 2. GET /api/orders/{order_id_str}/fulfillment-details
@router.get("/{order_id_str}/fulfillment-details")
def get_order_fulfillment_details(order_id_str: str, db: Session = Depends(get_db)):
    order_num = parse_order_num(order_id_str)
    ord_obj = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).first()
    if not ord_obj:
        raise HTTPException(status_code=404, detail="Ready-made order not found")

    fulfillment = db.query(models.OrderFulfillment).filter(models.OrderFulfillment.order_id == order_num).first()
    history = db.query(models.OrderStatusHistory).filter(models.OrderStatusHistory.order_id == order_num).order_by(models.OrderStatusHistory.changed_at.asc()).all()
    return_req = db.query(models.OrderReturn).filter(models.OrderReturn.order_id == order_num).first()
    cancellation = db.query(models.OrderCancellation).filter(models.OrderCancellation.order_id == order_num).first()

    history_list = []
    for h in history:
        history_list.append({
            "history_id": h.history_id,
            "previous_status": h.previous_status,
            "new_status": h.new_status,
            "changed_by_role": h.changed_by_role,
            "changed_at": h.changed_at.isoformat() if h.changed_at else None,
            "note": h.note
        })

    fulfillment_data = None
    if fulfillment:
        driver_name = None
        driver_phone = None
        if fulfillment.driver_user:
            driver_name = fulfillment.driver_user.full_name
            driver_phone = fulfillment.driver_user.phone
        elif fulfillment.driver_id:
            d_user = db.query(models.User).filter(models.User.user_id == fulfillment.driver_id).first()
            if d_user:
                driver_name = d_user.full_name
                driver_phone = d_user.phone

        fulfillment_data = {
            "fulfillment_id": fulfillment.fulfillment_id,
            "fulfillment_status": fulfillment.fulfillment_status,
            "packed_at": fulfillment.packed_at.isoformat() if fulfillment.packed_at else None,
            "packing_notes": fulfillment.packing_notes,
            "dispatched_at": fulfillment.dispatched_at.isoformat() if fulfillment.dispatched_at else None,
            "carrier": fulfillment.carrier,
            "tracking_number": fulfillment.tracking_number,
            "expected_delivery_date": fulfillment.expected_delivery_date,
            "delivery_status": fulfillment.delivery_status,
            "delivered_at": fulfillment.delivered_at.isoformat() if fulfillment.delivered_at else None,
            "delivery_notes": fulfillment.delivery_notes,
            "driver_name": driver_name,
            "driver_phone": driver_phone,
        }

    return_data = None
    if return_req:
        return_data = {
            "return_id": return_req.return_id,
            "reason": return_req.reason,
            "description": return_req.description,
            "photo_url": return_req.photo_url,
            "status": return_req.status,
            "requested_at": return_req.requested_at.isoformat() if return_req.requested_at else None,
            "pickup_date": return_req.pickup_date,
            "refund_status": return_req.refund_status,
            "refund_amount": float(return_req.refund_amount) if return_req.refund_amount else None,
            "notes": return_req.notes
        }

    cancellation_data = None
    if cancellation:
        cancellation_data = {
            "cancellation_id": cancellation.cancellation_id,
            "cancelled_by_role": cancellation.cancelled_by_role,
            "reason": cancellation.reason,
            "cancelled_at": cancellation.cancelled_at.isoformat() if cancellation.cancelled_at else None
        }

    return {
        "orderId": f"RET-{ord_obj.order_id:06d}",
        "order_status": ord_obj.order_status,
        "payment_status": ord_obj.payment_status,
        "total_amount": float(ord_obj.total_amount or 0),
        "delivery_address": ord_obj.delivery_address,
        "order_date": ord_obj.order_date.isoformat() if ord_obj.order_date else None,
        "fulfillment": fulfillment_data,
        "history": history_list,
        "return_request": return_data,
        "cancellation": cancellation_data
    }


# 3. POST /api/orders/{order_id_str}/pack
@router.post("/{order_id_str}/pack")
def mark_order_packed(order_id_str: str, payload: PackOrderPayload, db: Session = Depends(get_db)):
    order_num = parse_order_num(order_id_str)
    ord_obj = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).first()
    if not ord_obj:
        raise HTTPException(status_code=404, detail="Order not found")

    if ord_obj.order_status in ["Cancelled", "Returned"]:
        raise HTTPException(status_code=400, detail=f"Cannot pack order in status '{ord_obj.order_status}'")

    prev_status = ord_obj.order_status
    ord_obj.order_status = "Packed"
    if hasattr(ord_obj, "completion_status"):
        ord_obj.completion_status = "Packed"

    fulfillment = db.query(models.OrderFulfillment).filter(models.OrderFulfillment.order_id == order_num).first()
    if not fulfillment:
        fulfillment = models.OrderFulfillment(order_id=order_num)
        db.add(fulfillment)

    valid_staff_id = resolve_valid_user_id(db, payload.staff_id)
    packed_now = datetime.utcnow()
    fulfillment.fulfillment_status = "Packed"
    fulfillment.packed_at = packed_now
    fulfillment.packed_by_id = valid_staff_id
    fulfillment.packing_notes = payload.packing_notes

    # Requirement 6 & 7: Calculate Expected Delivery Date = Packing Date + 1 Day
    exp_date = packed_now + timedelta(days=1)
    fulfillment.expected_delivery_date = exp_date.strftime("%d %B %Y")

    record_status_history(
        db,
        order_id=order_num,
        previous_status=prev_status,
        new_status="Packed",
        changed_by_id=valid_staff_id,
        changed_by_role="Retail Staff",
        note=payload.packing_notes or "Quality verified and securely packed for dispatch."
    )

    create_customer_notification(
        db,
        customer_id=ord_obj.customer_id,
        title=f"Order Packed — RET-{ord_obj.order_id:06d}",
        message=f"Your order RET-{ord_obj.order_id:06d} has passed quality check and is packed for dispatch. Expected delivery: {fulfillment.expected_delivery_date}."
    )

    db.commit()
    return {
        "message": f"Order RET-{ord_obj.order_id:06d} marked as Packed",
        "order_status": "Packed",
        "expected_delivery_date": fulfillment.expected_delivery_date
    }


# 4. POST /api/orders/{order_id_str}/dispatch
@router.post("/{order_id_str}/dispatch")
def mark_order_dispatched(order_id_str: str, payload: DispatchOrderPayload, db: Session = Depends(get_db)):
    order_num = parse_order_num(order_id_str)
    ord_obj = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).first()
    if not ord_obj:
        raise HTTPException(status_code=404, detail="Order not found")

    if ord_obj.order_status in ["Cancelled", "Returned"]:
        raise HTTPException(status_code=400, detail=f"Cannot dispatch order in status '{ord_obj.order_status}'")

    vehicle_obj = None
    target_driver_id = payload.driver_id
    if payload.vehicle_id:
        vehicle_obj = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == payload.vehicle_id).first()
        if not vehicle_obj:
            raise HTTPException(status_code=400, detail="Selected internal delivery vehicle not found.")
        if vehicle_obj.status != "AVAILABLE":
            raise HTTPException(status_code=400, detail=f"Vehicle '{vehicle_obj.registration_number}' is currently unavailable (Status: {vehicle_obj.status}).")
        
        target_driver_id = payload.driver_id or vehicle_obj.assigned_driver_id
        if not target_driver_id:
            raise HTTPException(status_code=400, detail=f"Vehicle '{vehicle_obj.registration_number}' has no assigned driver. Please assign a driver with Driver capability in Fleet Management first.")
        
        driver_obj = db.query(models.User).filter(models.User.user_id == target_driver_id).first()
        if not driver_obj:
            raise HTTPException(status_code=400, detail="Assigned driver user record not found.")
        if not driver_obj.status:
            raise HTTPException(status_code=400, detail=f"Assigned driver '{driver_obj.full_name}' account is currently inactive.")
        if not driver_obj.is_driver:
            raise HTTPException(status_code=400, detail=f"User '{driver_obj.full_name}' does not have Driver capability. Enable Driver capability for this user first.")

    prev_status = ord_obj.order_status
    ord_obj.order_status = "Dispatched"
    if hasattr(ord_obj, "completion_status"):
        ord_obj.completion_status = "Dispatched"

    fulfillment = db.query(models.OrderFulfillment).filter(models.OrderFulfillment.order_id == order_num).first()
    if not fulfillment:
        fulfillment = models.OrderFulfillment(order_id=order_num)
        db.add(fulfillment)

    fulfillment.fulfillment_status = "Dispatched"
    fulfillment.dispatched_at = datetime.utcnow()
    valid_staff_id = resolve_valid_user_id(db, payload.staff_id)
    fulfillment.dispatched_by_id = valid_staff_id
    if payload.carrier and payload.carrier.strip():
        fulfillment.carrier = payload.carrier.strip()
    
    # Requirement 2: Automatic Unique Tracking Number TRK-XXXXXXXX
    if payload.tracking_number and payload.tracking_number.strip() and not payload.tracking_number.startswith("TRK-0"):
        fulfillment.tracking_number = payload.tracking_number.strip()
    else:
        fulfillment.tracking_number = generate_unique_tracking_number(db)

    # Requirement 6: Expected Delivery Date
    if payload.expected_delivery_date and payload.expected_delivery_date.strip():
        fulfillment.expected_delivery_date = payload.expected_delivery_date.strip()
    elif not fulfillment.expected_delivery_date:
        exp = datetime.utcnow() + timedelta(days=1)
        fulfillment.expected_delivery_date = exp.strftime("%d %B %Y")

    fulfillment.delivery_status = "Dispatched"
    if payload.dispatch_note:
        fulfillment.delivery_notes = payload.dispatch_note
        fulfillment.dispatch_note = payload.dispatch_note

    if vehicle_obj:
        vehicle_obj.status = "ASSIGNED"
        fulfillment.vehicle_id = vehicle_obj.vehicle_id
        fulfillment.driver_id = target_driver_id
        fulfillment.dispatch_date = datetime.utcnow()

    record_status_history(
        db,
        order_id=order_num,
        previous_status=prev_status,
        new_status="Dispatched",
        changed_by_id=valid_staff_id,
        changed_by_role="Retail Staff",
        note=f"Dispatched via {fulfillment.carrier or 'Carrier'}. Tracking Number: {fulfillment.tracking_number}. Expected: {fulfillment.expected_delivery_date}."
    )

    # Requirement 11: Customer Notification with Tracking Number
    create_customer_notification(
        db,
        customer_id=ord_obj.customer_id,
        title=f"Order Dispatched — RET-{ord_obj.order_id:06d}",
        message=f"Your order RET-{ord_obj.order_id:06d} has been dispatched. Tracking Number: {fulfillment.tracking_number}. Expected delivery: {fulfillment.expected_delivery_date}."
    )

    db.commit()
    return {
        "message": f"Order RET-{ord_obj.order_id:06d} marked as Dispatched",
        "order_status": "Dispatched",
        "tracking_number": fulfillment.tracking_number,
        "expected_delivery_date": fulfillment.expected_delivery_date
    }


# 5. POST /api/orders/{order_id_str}/delivery-status
@router.post("/{order_id_str}/delivery-status")
def update_delivery_status(order_id_str: str, payload: DeliveryStatusPayload, db: Session = Depends(get_db)):
    order_num = parse_order_num(order_id_str)
    ord_obj = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).first()
    if not ord_obj:
        raise HTTPException(status_code=404, detail="Order not found")

    new_st = payload.delivery_status.strip()
    prev_status = ord_obj.order_status

    ord_obj.order_status = new_st
    if hasattr(ord_obj, "completion_status"):
        ord_obj.completion_status = new_st

    fulfillment = db.query(models.OrderFulfillment).filter(models.OrderFulfillment.order_id == order_num).first()
    if not fulfillment:
        fulfillment = models.OrderFulfillment(order_id=order_num)
        db.add(fulfillment)

    fulfillment.delivery_status = new_st
    fulfillment.fulfillment_status = new_st
    eff_note = payload.notes or payload.note
    if eff_note:
        fulfillment.delivery_notes = eff_note

    if new_st.lower() == "delivered":
        fulfillment.delivered_at = datetime.utcnow()
        # Release vehicle automatically upon order delivery completion
        if fulfillment.vehicle_id:
            vehicle_obj = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == fulfillment.vehicle_id).first()
            if vehicle_obj and vehicle_obj.status == "ASSIGNED":
                vehicle_obj.status = "AVAILABLE"

    valid_staff_id = resolve_valid_user_id(db, payload.staff_id)
    record_status_history(
        db,
        order_id=order_num,
        previous_status=prev_status,
        new_status=new_st,
        changed_by_id=valid_staff_id,
        changed_by_role="Retail Staff",
        note=eff_note or f"Delivery status updated to '{new_st}'."
    )

    create_customer_notification(
        db,
        customer_id=ord_obj.customer_id,
        title=f"Order Update — RET-{ord_obj.order_id:06d}",
        message=f"Your order RET-{ord_obj.order_id:06d} status updated: {new_st}."
    )

    db.commit()
    return {"message": f"Order RET-{ord_obj.order_id:06d} delivery status updated to {new_st}", "order_status": new_st}


# 6. GET /api/orders/{order_id_str}/history
@router.get("/{order_id_str}/history")
def get_order_history(order_id_str: str, db: Session = Depends(get_db)):
    order_num = parse_order_num(order_id_str)
    history = db.query(models.OrderStatusHistory).filter(models.OrderStatusHistory.order_id == order_num).order_by(models.OrderStatusHistory.changed_at.asc()).all()

    res = []
    for h in history:
        res.append({
            "history_id": h.history_id,
            "previous_status": h.previous_status,
            "new_status": h.new_status,
            "changed_by_role": h.changed_by_role,
            "changed_at": h.changed_at.isoformat() if h.changed_at else None,
            "note": h.note
        })
    return res


# Payloads for messaging
class PostOrderMessagePayload(BaseModel):
    sender_id: Optional[int] = None
    sender_role: str # "Customer" or "Retail Staff"
    sender_name: str
    message: str


# 7. GET & POST /api/orders/{order_id_str}/messages
@router.get("/{order_id_str}/messages")
def get_order_messages(order_id_str: str, db: Session = Depends(get_db)):
    order_num = parse_order_num(order_id_str)
    msgs = db.query(models.OrderMessage).filter(models.OrderMessage.order_id == order_num).order_by(models.OrderMessage.created_at.asc()).all()

    res = []
    for m in msgs:
        res.append({
            "message_id": m.message_id,
            "sender_id": m.sender_id,
            "sender_role": m.sender_role,
            "sender_name": m.sender_name,
            "message": m.message,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "read_at": m.read_at.isoformat() if m.read_at else None
        })
    return res


@router.post("/{order_id_str}/messages")
def post_order_message(order_id_str: str, payload: PostOrderMessagePayload, db: Session = Depends(get_db)):
    order_num = parse_order_num(order_id_str)
    ord_obj = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).first()
    if not ord_obj:
        raise HTTPException(status_code=404, detail="Order not found")

    new_msg = models.OrderMessage(
        order_id=order_num,
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
        "message": "Message sent successfully",
        "message_id": new_msg.message_id,
        "created_at": new_msg.created_at.isoformat()
    }


# Payloads for Cancellation & Return
class CancelOrderPayload(BaseModel):
    user_id: Optional[int] = None
    role: str = "Customer" # "Customer" or "Retail Staff"
    reason: str = "Customer requested cancellation"

class ReturnRequestPayload(BaseModel):
    customer_id: int
    reason: str # Damaged, Wrong Item, Missing Item, Defective, Other
    description: Optional[str] = None
    photo_url: Optional[str] = None

class ReturnStatusPayload(BaseModel):
    staff_id: Optional[int] = None
    status: str # Return Requested, Under Review, Approved, Rejected, Return Pickup, Returned, Refund Processing, Refunded
    pickup_date: Optional[str] = None
    refund_status: Optional[str] = "Pending"
    refund_amount: Optional[float] = None
    notes: Optional[str] = None


# 8. POST /api/orders/{order_id_str}/cancel
@router.post("/{order_id_str}/cancel")
def cancel_order_workflow(order_id_str: str, payload: CancelOrderPayload, db: Session = Depends(get_db)):
    order_num = parse_order_num(order_id_str)
    ord_obj = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).first()
    if not ord_obj:
        raise HTTPException(status_code=404, detail="Order not found")

    current_st = (ord_obj.order_status or "").strip()
    if current_st in ["Dispatched", "Out for Delivery", "Delivered"]:
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be cancelled after dispatch. Current status: '{current_st}'. Please request a return instead."
        )

    prev_st = ord_obj.order_status
    ord_obj.order_status = "Cancelled"
    ord_obj.payment_status = "Cancelled"
    if hasattr(ord_obj, "completion_status"):
        ord_obj.completion_status = "Cancelled"

    existing_canc = db.query(models.OrderCancellation).filter(models.OrderCancellation.order_id == order_num).first()
    if not existing_canc:
        canc = models.OrderCancellation(
            order_id=order_num,
            cancelled_by_id=payload.user_id,
            cancelled_by_role=payload.role,
            reason=payload.reason,
            cancelled_at=datetime.utcnow()
        )
        db.add(canc)

    record_status_history(
        db,
        order_id=order_num,
        previous_status=prev_st,
        new_status="Cancelled",
        changed_by_id=payload.user_id,
        changed_by_role=payload.role,
        note=f"Order cancelled by {payload.role}. Reason: {payload.reason}"
    )

    create_customer_notification(
        db,
        customer_id=ord_obj.customer_id,
        title=f"Order Cancelled — RET-{ord_obj.order_id:06d}",
        message=f"Your order RET-{ord_obj.order_id:06d} has been cancelled. Reason: {payload.reason}"
    )

    db.commit()
    return {"message": f"Order RET-{ord_obj.order_id:06d} cancelled successfully", "order_status": "Cancelled"}


# 9. POST /api/orders/{order_id_str}/return
@router.post("/{order_id_str}/return")
def request_order_return(order_id_str: str, payload: ReturnRequestPayload, db: Session = Depends(get_db)):
    order_num = parse_order_num(order_id_str)
    ord_obj = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).first()
    if not ord_obj:
        raise HTTPException(status_code=404, detail="Order not found")

    current_st = (ord_obj.order_status or "").strip().lower()
    if current_st not in ["delivered", "completed"]:
        raise HTTPException(status_code=400, detail="Return can only be requested for Delivered orders.")

    existing_ret = db.query(models.OrderReturn).filter(models.OrderReturn.order_id == order_num).first()
    if existing_ret:
        raise HTTPException(status_code=400, detail="A return request already exists for this order.")

    ret_obj = models.OrderReturn(
        order_id=order_num,
        customer_id=payload.customer_id,
        reason=payload.reason,
        description=payload.description,
        photo_url=payload.photo_url,
        status="Return Requested",
        requested_at=datetime.utcnow(),
        refund_status="Pending",
        refund_amount=ord_obj.total_amount
    )
    db.add(ret_obj)

    prev_st = ord_obj.order_status
    ord_obj.order_status = "Return Requested"
    if hasattr(ord_obj, "completion_status"):
        ord_obj.completion_status = "Return Requested"

    record_status_history(
        db,
        order_id=order_num,
        previous_status=prev_st,
        new_status="Return Requested",
        changed_by_role="Customer",
        note=f"Customer requested return. Reason: {payload.reason}"
    )

    create_customer_notification(
        db,
        customer_id=payload.customer_id,
        title=f"Return Requested — RET-{ord_obj.order_id:06d}",
        message=f"We have received your return request for RET-{ord_obj.order_id:06d}. Our staff will review it shortly."
    )

    db.commit()
    return {"message": "Return request submitted successfully", "return_id": ret_obj.return_id}


# 10. GET /api/orders/returns/all & PUT /api/orders/returns/{return_id}/status
@router.get("/returns/all")
def get_all_return_requests(db: Session = Depends(get_db)):
    returns = db.query(models.OrderReturn).order_by(models.OrderReturn.requested_at.desc()).all()
    res = []
    for r in returns:
        ord_obj = r.order
        res.append({
            "return_id": r.return_id,
            "order_id": r.order_id,
            "order_number": f"RET-{r.order_id:06d}",
            "customer_id": r.customer_id,
            "customer_name": ord_obj.customer_name if ord_obj else "Valued Customer",
            "customer_email": ord_obj.customer_email if ord_obj else "",
            "reason": r.reason,
            "description": r.description,
            "photo_url": r.photo_url,
            "status": r.status,
            "requested_at": r.requested_at.isoformat() if r.requested_at else None,
            "pickup_date": r.pickup_date,
            "refund_status": r.refund_status,
            "refund_amount": float(r.refund_amount) if r.refund_amount else 0,
            "notes": r.notes
        })
    return res


@router.put("/returns/{return_id}/status")
def update_return_status(return_id: int, payload: ReturnStatusPayload, db: Session = Depends(get_db)):
    ret_obj = db.query(models.OrderReturn).filter(models.OrderReturn.return_id == return_id).first()
    if not ret_obj:
        raise HTTPException(status_code=404, detail="Return request not found")

    prev_status = ret_obj.status
    ret_obj.status = payload.status
    ret_obj.reviewed_at = datetime.utcnow()
    if payload.staff_id:
        ret_obj.reviewed_by_id = payload.staff_id
    if payload.pickup_date:
        ret_obj.pickup_date = payload.pickup_date
    if payload.refund_status:
        ret_obj.refund_status = payload.refund_status
    if payload.refund_amount is not None:
        ret_obj.refund_amount = payload.refund_amount
    if payload.notes:
        ret_obj.notes = payload.notes

    # Update associated readymade order status
    ord_obj = ret_obj.order
    if ord_obj:
        ord_obj.order_status = payload.status
        record_status_history(
            db,
            order_id=ord_obj.order_id,
            previous_status=prev_status,
            new_status=payload.status,
            changed_by_id=payload.staff_id,
            changed_by_role="Retail Staff",
            note=payload.notes or f"Return request status updated to '{payload.status}'"
        )
        create_customer_notification(
            db,
            customer_id=ord_obj.customer_id,
            title=f"Return Status Update — RET-{ord_obj.order_id:06d}",
            message=f"Your return request for order RET-{ord_obj.order_id:06d} status: {payload.status}."
        )

    db.commit()
    return {"message": f"Return request #{return_id} updated to {payload.status}", "status": payload.status}
