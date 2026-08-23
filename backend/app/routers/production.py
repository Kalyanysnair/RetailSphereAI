from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import string
import secrets
import time
import re

from app.database import get_db
from app import models, auth
from app.email_utils import send_staff_credentials_email, mask_email

def generate_strong_password(length: int = 12) -> str:
    specials = "@#$%&*"
    chars = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(specials),
    ]
    all_allowed = string.ascii_letters + string.digits + specials
    for _ in range(length - len(chars)):
        chars.append(secrets.choice(all_allowed))
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)

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
    completion_status: Optional[str] = None
    estimated_price: Optional[float] = None
    remarks: Optional[str] = None

class WorkerCreatePayload(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    specialization: Optional[str] = "Woodwork & Carpentry"

class WorkerUpdatePayload(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    specialization: Optional[str] = "Woodwork & Carpentry"

class WorkerStatusPayload(BaseModel):
    status: bool

class TaskAssignPayload(BaseModel):
    custom_order_id: int
    worker_id: int
    department: Optional[str] = None  # "Woodwork & Carpentry", "Upholstery", "Assembly"
    task_description: Optional[str] = None

class ProgressUpdatePayload(BaseModel):
    custom_order_id: int
    stage: str
    progress_percentage: int
    remarks: Optional[str] = None
    department: Optional[str] = None
    worker_id: Optional[int] = None

# 1. Fetch Custom Orders for Production Staff / Worker Portal
@router.get("/custom-orders")
def get_custom_orders(
    status_filter: Optional[str] = None,
    worker_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    customer_email: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.CustomOrder)
    if status_filter and status_filter.strip() and status_filter != "All":
        query = query.filter(models.CustomOrder.order_status == status_filter.strip())

    if worker_id:
        assigned_order_ids = [
            a.custom_order_id for a in db.query(models.WorkerAssignment.custom_order_id)
            .filter(models.WorkerAssignment.worker_id == worker_id).all()
        ]
        query = query.filter(models.CustomOrder.custom_order_id.in_(assigned_order_ids))

    if customer_id:
        c_rows = db.query(models.Customer).filter(
            (models.Customer.customer_id == customer_id) | (models.Customer.user_id == customer_id)
        ).all()
        c_ids = [c.customer_id for c in c_rows]
        if c_ids:
            query = query.filter(models.CustomOrder.customer_id.in_(c_ids))
        else:
            query = query.filter(models.CustomOrder.customer_id == customer_id)
    elif customer_email and customer_email.strip():
        user = db.query(models.User).filter(models.User.email.ilike(customer_email.strip())).first()
        if user and user.customer_profile:
            query = query.filter(models.CustomOrder.customer_id == user.customer_profile.customer_id)
    else:
        # PRODUCTION STAFF VIEW: ONLY show requests that have been APPROVED by Retail Staff
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.CustomOrder.review_status == "APPROVED",
                models.CustomOrder.order_status.in_([
                    "APPROVED_BY_RETAIL", "Approved", "In Production", "Completed", "Quote Provided", "Paid", "QC_PENDING"
                ])
            )
        )

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
                    "worker_email": w_user.email,
                    "worker_phone": getattr(w_user, "phone", "") or "",
                    "specialization": getattr(w_user, "specialization", "Woodwork & Carpentry") or "Woodwork & Carpentry",
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
    if payload.customer_email and payload.customer_email.strip():
        clean_email = payload.customer_email.strip()
        user = db.query(models.User).filter(models.User.email.ilike(clean_email)).first()
        if not user:
            user = models.User(
                email=clean_email,
                full_name=payload.customer_name.strip() if payload.customer_name else "Valued Customer",
                role_id=1,
                status=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        customer = db.query(models.Customer).filter(models.Customer.user_id == user.user_id).first()
        if not customer:
            customer = models.Customer(
                user_id=user.user_id,
                address="Not Provided",
                city="Kottayam",
                state="Kerala",
                pincode="686631"
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

    if not customer and payload.customer_id:
        customer = db.query(models.Customer).filter(
            (models.Customer.customer_id == payload.customer_id) | (models.Customer.user_id == payload.customer_id)
        ).first()

    cust_id = customer.customer_id if customer else None

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

    staff_user = db.query(models.User).first()
    updater_id = user.user_id if user else (staff_user.user_id if staff_user else None)

    prog = models.ProductionProgress(
        custom_order_id=new_order.custom_order_id,
        updated_by=updater_id,
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

    staff_user = db.query(models.User).filter(models.User.user_id == order.production_staff_id).first() if order.production_staff_id else None
    if not staff_user:
        staff_user = db.query(models.User).first()
    
    staff_id = staff_user.user_id if staff_user else None

    # Add initial progress entry on approval
    if payload.order_status == "Approved":
        if staff_id:
            init_progress = models.ProductionProgress(
                custom_order_id=order.custom_order_id,
                updated_by=staff_id,
                stage="Material Sourcing",
                progress_percentage=10,
                remarks=payload.remarks or "Order approved by production team. Commencing material allocation."
            )
            db.add(init_progress)
    elif payload.order_status == "Rejected":
        if staff_id:
            rej_progress = models.ProductionProgress(
                custom_order_id=order.custom_order_id,
                updated_by=staff_id,
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

    # Record in tbl_payment
    new_payment = models.Payment(
        order_type="Custom",
        order_id=order.custom_order_id,
        amount=order.estimated_price or 0,
        payment_method="Razorpay",
        transaction_id=f"PAY-CUST-{order.custom_order_id}-{int(time.time())}",
        payment_status="Paid"
    )
    db.add(new_payment)

    db.commit()
    db.refresh(order)
    return {"message": f"Payment completed for Custom Order #{order_id}", "order_id": order_id, "payment_status": "Paid"}


def normalize_phone(phone_str: str) -> str:
    """Extracts last 10 digits from any phone string (+91 9446758046, 09446758046, 9446758046)."""
    if not phone_str:
        return ""
    digits = re.sub(r'\D', '', str(phone_str))
    if len(digits) >= 10:
        return digits[-10:]
    return digits

# 3. Add Worker
@router.post("/workers", status_code=status.HTTP_201_CREATED)
def create_worker(payload: WorkerCreatePayload, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
    if not role:
        role = models.Role(role_name="Worker")
        db.add(role)
        db.commit()
        db.refresh(role)

    email_clean = payload.email.strip().lower()
    full_name_clean = payload.full_name.strip()

    if not email_clean or "@" not in email_clean or "." not in email_clean.split("@")[-1]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email address.")

    # Check if email already exists in DB (reject duplicates)
    existing_email = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A worker/account with this email already exists.")

    # Process and check phone number with country code normalization
    if payload.phone and payload.phone.strip():
        raw_phone = payload.phone.strip()
        last_10 = normalize_phone(raw_phone)
        if len(last_10) == 10:
            phone_clean = f"+91{last_10}"
        else:
            phone_clean = raw_phone

        # Check duplicate phone by comparing normalized 10 digits against all users
        all_users = db.query(models.User).all()
        for u in all_users:
            if u.phone:
                u_10 = normalize_phone(u.phone)
                if u_10 and u_10 == last_10:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A worker/account with this phone number already exists."
                    )
    else:
        # Auto-generate unique timestamp-based phone number if omitted
        phone_clean = f"+919{int(time.time() * 1000) % 1000000009:09d}"

    generated_password = generate_strong_password(12)
    hashed_pwd = auth.get_password_hash(generated_password)

    worker_user = models.User(
        role_id=role.role_id,
        full_name=full_name_clean,
        email=email_clean,
        phone=phone_clean,
        password=hashed_pwd,
        status=True,
        must_change_password=True,
        specialization=payload.specialization or "Woodwork & Carpentry"
    )
    
    try:
        db.add(worker_user)
        db.commit()
        db.refresh(worker_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database constraint error: A worker with this email or phone already exists."
        )

    # Send login credentials email to worker via SMTP immediately (recipient is dynamic)
    email_sent = False
    email_error = None

    masked_to = mask_email(worker_user.email)
    print("[WORKER EMAIL TRACE]")
    print(f"Worker Name: {worker_user.full_name}")
    print(f"Recipient from request: {masked_to}")

    try:
        email_sent = send_staff_credentials_email(
            to_email=worker_user.email,
            staff_name=worker_user.full_name,
            role_name=f"Workshop Worker ({payload.specialization or 'Woodwork & Carpentry'})",
            username=worker_user.email,
            password=generated_password
        )
        if email_sent:
            print(f"[WORKER EMAIL TRACE] SMTP RCPT TO: {masked_to}")
            print(f"[WORKER CREATION SUCCESS] Dispatched password email via SMTP to {masked_to}")
    except Exception as email_err:
        email_sent = False
        email_error = str(email_err)
        print(f"[WORKER CREATION EMAIL ERROR] SMTP exception sending credentials email to {masked_to}: {email_err}")

    return {
        "success": True,
        "message": f"Worker account created and login credentials sent to {worker_user.email}.",
        "worker_id": worker_user.user_id,
        "full_name": worker_user.full_name,
        "email": worker_user.email,
        "specialization": payload.specialization,
        "status": worker_user.status,
        "email_sent": email_sent,
        "email_error": email_error
    }

# 3b. Resend Worker Credentials
@router.post("/workers/{worker_id}/resend-credentials")
def resend_worker_credentials(worker_id: int, db: Session = Depends(get_db)):
    worker_user = db.query(models.User).filter(models.User.user_id == worker_id).first()
    if not worker_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    generated_password = generate_strong_password(12)
    worker_user.password = auth.get_password_hash(generated_password)
    worker_user.must_change_password = True
    db.commit()
    db.refresh(worker_user)

    email_sent = False
    email_error = None
    masked_to = mask_email(worker_user.email)
    print(f"[RESEND WORKER CREDENTIALS] Recipient: {masked_to}")

    try:
        email_sent = send_staff_credentials_email(
            to_email=worker_user.email,
            staff_name=worker_user.full_name,
            role_name="Workshop Worker",
            username=worker_user.email,
            password=generated_password
        )
    except Exception as email_err:
        email_sent = False
        email_error = str(email_err)

    if not email_sent:
        return {
            "success": True,
            "message": f"Worker credentials updated, but email could not be delivered to {worker_user.email}.",
            "email": worker_user.email,
            "email_sent": False,
            "email_error": email_error
        }

    return {
        "success": True,
        "message": f"New temporary login credentials sent to worker email {worker_user.email}.",
        "email": worker_user.email,
        "email_sent": True
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
        "specialization": w.specialization or "Woodwork & Carpentry",
        "status": w.status
    } for w in workers]

# 4b. Delete Worker
@router.delete("/workers/{worker_id}")
def delete_worker(worker_id: int, db: Session = Depends(get_db)):
    db.query(models.WorkerAssignment).filter(models.WorkerAssignment.worker_id == worker_id).delete(synchronize_session=False)
    db.query(models.Customer).filter(models.Customer.user_id == worker_id).delete(synchronize_session=False)
    worker = db.query(models.User).filter(models.User.user_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    db.delete(worker)
    db.commit()
    return {"message": f"Worker #{worker_id} removed successfully"}

# 4c. Update Worker Details
@router.put("/workers/{worker_id}")
def update_worker(worker_id: int, payload: WorkerUpdatePayload, db: Session = Depends(get_db)):
    worker = db.query(models.User).filter(models.User.user_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    
    if payload.email.strip().lower() != worker.email.lower():
        existing = db.query(models.User).filter(models.User.email == payload.email.strip()).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email address is already registered.")
    
    worker.full_name = payload.full_name.strip()
    worker.email = payload.email.strip()
    if payload.phone and payload.phone.strip():
        raw_phone = payload.phone.strip()
        last_10 = normalize_phone(raw_phone)
        if len(last_10) == 10:
            phone_clean = f"+91{last_10}"
        else:
            phone_clean = raw_phone

        all_users = db.query(models.User).filter(models.User.user_id != worker_id).all()
        for u in all_users:
            if u.phone:
                u_10 = normalize_phone(u.phone)
                if u_10 and u_10 == last_10:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A worker/account with this phone number already exists."
                    )
        worker.phone = phone_clean
    if payload.specialization:
        worker.specialization = payload.specialization.strip()
    
    db.commit()
    db.refresh(worker)
    return {
        "worker_id": worker.user_id,
        "full_name": worker.full_name,
        "email": worker.email,
        "phone": worker.phone,
        "specialization": worker.specialization or "Woodwork & Carpentry",
        "status": worker.status
    }

# 4d. Toggle Worker Status (Active / Inactive)
@router.put("/workers/{worker_id}/status")
def toggle_worker_status(worker_id: int, payload: WorkerStatusPayload, db: Session = Depends(get_db)):
    worker = db.query(models.User).filter(models.User.user_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
    
    worker.status = payload.status
    db.commit()
    db.refresh(worker)
    return {
        "worker_id": worker.user_id,
        "full_name": worker.full_name,
        "status": worker.status
    }

# 5. Assign Task to Worker
@router.post("/assign-worker")
def assign_worker_task(payload: TaskAssignPayload, db: Session = Depends(get_db)):
    order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.custom_order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom order not found")

    worker = db.query(models.User).filter(models.User.user_id == payload.worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")

    dept_label = payload.department.strip() if payload.department and payload.department.strip() else getattr(worker, "specialization", "Woodwork & Carpentry")
    
    # Check if assignment already exists for this order & worker or department
    existing = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.custom_order_id == payload.custom_order_id,
        models.WorkerAssignment.worker_id == payload.worker_id
    ).first()

    if existing:
        existing.task_status = f"{dept_label}: Assigned"
        assignment = existing
    else:
        assignment = models.WorkerAssignment(
            custom_order_id=payload.custom_order_id,
            worker_id=payload.worker_id,
            assigned_date=date.today(),
            task_status=f"{dept_label}: Assigned"
        )
        db.add(assignment)
    
    # Auto-update order status to In Production if currently Approved
    if order.order_status == "Approved":
        order.order_status = "In Production"

    db.commit()
    db.refresh(assignment)

    return {"message": f"Worker {worker.full_name} assigned to Order #{payload.custom_order_id} ({dept_label})"}

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

    # Update worker assignment task status for the specific department
    if payload.department or payload.worker_id:
        query_asgn = db.query(models.WorkerAssignment).filter(models.WorkerAssignment.custom_order_id == payload.custom_order_id)
        if payload.worker_id:
            query_asgn = query_asgn.filter(models.WorkerAssignment.worker_id == payload.worker_id)
        asgns = query_asgn.all()
        for asgn in asgns:
            dept_name = payload.department or "Production"
            if payload.progress_percentage >= 100 or "Complete" in payload.stage or "Done" in payload.stage:
                asgn.task_status = f"{dept_name}: Completed"
            else:
                asgn.task_status = f"{dept_name}: In Progress"

    if payload.progress_percentage >= 100 or payload.stage == "Ready for Dispatch" or "Assembly Complete" in payload.stage:
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
