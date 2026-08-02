from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from app.database import get_db
from app import models

router = APIRouter(prefix="/api/production", tags=["Production Management"])

class CustomOrderCreatePayload(BaseModel):
    customer_id: Optional[int] = 1
    customer_name: Optional[str] = "Customer"
    customer_email: Optional[str] = "customer@example.com"
    customer_phone: Optional[str] = ""
    furniture_type: str
    material: str
    dimensions: str
    color: str
    design_description: Optional[str] = None
    reference_image: Optional[str] = None

class OrderStatusUpdatePayload(BaseModel):
    order_status: str  # "Approved", "Rejected", "In Production", "Completed"
    estimated_price: Optional[float] = None
    remarks: Optional[str] = None

class WorkerCreatePayload(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    specialization: Optional[str] = "Artisan / Craftsman"

class TaskAssignPayload(BaseModel):
    custom_order_id: int
    worker_id: int
    task_description: Optional[str] = None

class ProgressUpdatePayload(BaseModel):
    custom_order_id: int
    stage: str  # "Material Sourcing", "Cutting & Joinery", "Assembly & Upholstery", "Quality Control & Finishing", "Ready for Dispatch"
    progress_percentage: int
    remarks: Optional[str] = None

# 1. Fetch All Custom Orders for Production Staff
@router.get("/custom-orders")
def get_custom_orders(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.CustomOrder)
    if status_filter and status_filter.strip() and status_filter != "All":
        query = query.filter(models.CustomOrder.order_status == status_filter.strip())
    orders = query.order_by(models.CustomOrder.order_date.desc()).all()

    result = []
    for ord_obj in orders:
        cust = ord_obj.customer
        cust_user = cust.user if cust else None
        
        # Get assigned workers
        assignments = db.query(models.WorkerAssignment).filter(models.WorkerAssignment.custom_order_id == ord_obj.custom_order_id).all()
        assigned_workers = []
        for asgn in assignments:
            w_user = db.query(models.User).filter(models.User.user_id == asgn.worker_id).first()
            if w_user:
                assigned_workers.append({
                    "assignment_id": asgn.assignment_id,
                    "worker_id": w_user.user_id,
                    "worker_name": w_user.full_name,
                    "task_status": asgn.task_status
                })

        # Get latest progress
        latest_progress = db.query(models.ProductionProgress).filter(
            models.ProductionProgress.custom_order_id == ord_obj.custom_order_id
        ).order_by(models.ProductionProgress.updated_at.desc()).first()

        result.append({
            "custom_order_id": ord_obj.custom_order_id,
            "customer_id": ord_obj.customer_id,
            "customer_name": cust_user.full_name if cust_user else "Customer",
            "customer_email": cust_user.email if cust_user else "",
            "customer_phone": cust_user.phone if cust_user else "",
            "furniture_type": ord_obj.furniture_type,
            "material": ord_obj.material,
            "dimensions": ord_obj.dimensions,
            "color": ord_obj.color,
            "design_description": ord_obj.design_description,
            "reference_image": ord_obj.reference_image,
            "estimated_price": float(ord_obj.estimated_price) if ord_obj.estimated_price else None,
            "order_status": ord_obj.order_status,
            "is_locked": True if (ord_obj.order_status in ["Approved", "In Production", "Completed"] or (ord_obj.estimated_price and float(ord_obj.estimated_price) > 0) or getattr(ord_obj, "is_locked", False)) else False,
            "order_date": ord_obj.order_date.isoformat() if ord_obj.order_date else None,
            "assigned_workers": assigned_workers,
            "current_stage": latest_progress.stage if latest_progress else "Pending Approval",
            "progress_percentage": latest_progress.progress_percentage if latest_progress else 0,
            "latest_remarks": latest_progress.remarks if latest_progress else None,
        })
    return result

# 1b. Create New Custom Order in DB
@router.post("/custom-orders")
def create_custom_order(payload: CustomOrderCreatePayload, db: Session = Depends(get_db)):
    customer = None
    if payload.customer_email:
        user = db.query(models.User).filter(models.User.email == payload.customer_email.strip()).first()
        if user:
            customer = db.query(models.Customer).filter(models.Customer.user_id == user.user_id).first()
    
    if not customer:
        customer = db.query(models.Customer).first()

    cust_id = customer.customer_id if customer else 1

    new_order = models.CustomOrder(
        customer_id=cust_id,
        furniture_type=payload.furniture_type,
        material=payload.material,
        dimensions=payload.dimensions,
        color=payload.color,
        design_description=payload.design_description,
        reference_image=payload.reference_image,
        order_status="Pending",
        order_date=datetime.utcnow()
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    prog = models.ProductionProgress(
        custom_order_id=new_order.custom_order_id,
        updated_by=1,
        stage="Pending Approval",
        progress_percentage=0,
        remarks="Custom request received."
    )
    db.add(prog)
    db.commit()

    return {
        "custom_order_id": new_order.custom_order_id,
        "customer_id": new_order.customer_id,
        "customer_name": payload.customer_name or "Customer",
        "customer_email": payload.customer_email or "",
        "customer_phone": payload.customer_phone or "",
        "furniture_type": new_order.furniture_type,
        "material": new_order.material,
        "dimensions": new_order.dimensions,
        "color": new_order.color,
        "design_description": new_order.design_description,
        "reference_image": new_order.reference_image,
        "estimated_price": None,
        "order_status": new_order.order_status,
        "order_date": new_order.order_date.isoformat() if new_order.order_date else None,
        "assigned_workers": [],
        "current_stage": "Pending Approval",
        "progress_percentage": 0,
        "latest_remarks": "Custom request received."
    }

# 2. Approve or Reject Custom Order
@router.put("/custom-orders/{order_id}/status")
def update_custom_order_status(order_id: int, payload: OrderStatusUpdatePayload, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    order.order_status = payload.order_status
    if payload.estimated_price is not None:
        order.estimated_price = payload.estimated_price

    # Add initial progress entry on approval
    if payload.order_status == "Approved":
        init_progress = models.ProductionProgress(
            custom_order_id=order.custom_order_id,
            updated_by=order.production_staff_id or 1,
            stage="Material Sourcing",
            progress_percentage=10,
            remarks=payload.remarks or "Order approved by production team. Commencing material allocation."
        )
        db.add(init_progress)
    elif payload.order_status == "Rejected":
        rej_progress = models.ProductionProgress(
            custom_order_id=order.custom_order_id,
            updated_by=order.production_staff_id or 1,
            stage="Rejected",
            progress_percentage=0,
            remarks=payload.remarks or "Customization specs cannot be fulfilled at this time."
        )
        db.add(rej_progress)

    db.commit()
    db.refresh(order)
    return {"message": f"Order #{order_id} status updated to {payload.order_status}", "order_id": order_id}

# 2b. Lock Custom Order Specifications
@router.put("/custom-orders/{order_id}/lock")
def lock_custom_order_specs(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    order.is_locked = True
    if order.order_status in ["Pending", "Pending Approval"]:
        order.order_status = "Approved"

    db.commit()
    db.refresh(order)
    return {"message": f"Order #{order_id} specifications locked permanently", "is_locked": True}

# 2c. Cancel Custom Order
@router.put("/custom-orders/{order_id}/cancel")
def cancel_custom_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    order.order_status = "Cancelled"
    db.commit()
    db.refresh(order)
    return {"message": f"Order #{order_id} has been cancelled successfully", "order_id": order_id}

# 2d. Record Payment for Custom Order
@router.put("/custom-orders/{order_id}/pay")
def pay_custom_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    order.payment_status = "Paid"
    order.order_status = "Paid"
    order.is_locked = True
    db.commit()
    db.refresh(order)
    return {"message": f"Payment completed for Custom Order #{order_id}", "order_id": order_id, "payment_status": "Paid"}

# 3. Add Worker
@router.post("/workers", status_code=status.HTTP_201_CREATED)
def create_worker(payload: WorkerCreatePayload, db: Session = Depends(get_db)):
    role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
    if not role:
        role = models.Role(role_name="Worker")
        db.add(role)
        db.commit()
        db.refresh(role)

    # Check existing email
    existing = db.query(models.User).filter(models.User.email == payload.email.strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Worker email already registered.")

    phone = payload.phone.strip() if (payload.phone and payload.phone.strip()) else f"+91{datetime.now().strftime('%M%S%f')[:10]}"
    
    worker_user = models.User(
        role_id=role.role_id,
        full_name=payload.full_name.strip(),
        email=payload.email.strip(),
        phone=phone,
        password="worker_temp_pass",
        status=True
    )
    db.add(worker_user)
    db.commit()
    db.refresh(worker_user)

    return {
        "worker_id": worker_user.user_id,
        "full_name": worker_user.full_name,
        "email": worker_user.email,
        "specialization": payload.specialization
    }

# 4. List Workers
@router.get("/workers")
def list_workers(db: Session = Depends(get_db)):
    worker_role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
    if not worker_role:
        return []

    workers = db.query(models.User).filter(models.User.role_id == worker_role.role_id).all()
    return [{
        "worker_id": w.user_id,
        "full_name": w.full_name,
        "email": w.email,
        "phone": w.phone,
        "status": w.status
    } for w in workers]

# 5. Assign Task to Worker
@router.post("/assign-worker")
def assign_worker_task(payload: TaskAssignPayload, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.custom_order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    worker = db.query(models.User).filter(models.User.user_id == payload.worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    assignment = models.WorkerAssignment(
        custom_order_id=payload.custom_order_id,
        worker_id=payload.worker_id,
        assigned_date=date.today(),
        task_status="Assigned"
    )
    db.add(assignment)
    
    # Auto-update order status to In Production if currently Approved
    if order.order_status == "Approved":
        order.order_status = "In Production"

    db.commit()
    db.refresh(assignment)

    return {"message": f"Worker {worker.full_name} assigned to Order #{payload.custom_order_id}"}

# 6. Update Production Progress Stage
@router.post("/update-progress")
def update_production_progress(payload: ProgressUpdatePayload, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.custom_order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    progress = models.ProductionProgress(
        custom_order_id=payload.custom_order_id,
        updated_by=order.production_staff_id or 1,
        stage=payload.stage,
        progress_percentage=payload.progress_percentage,
        remarks=payload.remarks
    )
    db.add(progress)

    if payload.progress_percentage >= 100 or payload.stage == "Ready for Dispatch":
        order.order_status = "Completed"
    elif order.order_status in ["Pending", "Approved"]:
        order.order_status = "In Production"

    db.commit()
    db.refresh(progress)

    return {"message": f"Progress updated for Order #{payload.custom_order_id}: {payload.stage} ({payload.progress_percentage}%)"}

# 7. Customer/Staff Order Tracking Timeline
@router.get("/custom-orders/{order_id}/tracking")
def get_order_tracking(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    progress_history = db.query(models.ProductionProgress).filter(
        models.ProductionProgress.custom_order_id == order_id
    ).order_by(models.ProductionProgress.updated_at.asc()).all()

    assignments = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.custom_order_id == order_id
    ).all()

    workers_info = []
    for asgn in assignments:
        w_user = db.query(models.User).filter(models.User.user_id == asgn.worker_id).first()
        if w_user:
            workers_info.append({
                "worker_name": w_user.full_name,
                "assigned_date": asgn.assigned_date.isoformat() if asgn.assigned_date else None,
                "task_status": asgn.task_status
            })

    timeline = []
    for prg in progress_history:
        timeline.append({
            "progress_id": prg.progress_id,
            "stage": prg.stage,
            "progress_percentage": prg.progress_percentage,
            "remarks": prg.remarks,
            "updated_at": prg.updated_at.isoformat() if prg.updated_at else None
        })

    return {
        "custom_order_id": order.custom_order_id,
        "furniture_type": order.furniture_type,
        "material": order.material,
        "dimensions": order.dimensions,
        "color": order.color,
        "order_status": order.order_status,
        "estimated_price": float(order.estimated_price) if order.estimated_price else None,
        "assigned_workers": workers_info,
        "timeline": timeline
    }
