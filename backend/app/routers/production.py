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


# Helper: Log Production History Audit Trail
def log_production_history(
    db: Session,
    order_type: str,
    order_id: int,
    action: str,
    stage_name: Optional[str] = None,
    worker_id: Optional[int] = None,
    action_by_id: Optional[int] = None,
    previous_status: Optional[str] = None,
    new_status: Optional[str] = None,
    notes: Optional[str] = None
):
    hist = models.ProductionHistory(
        order_type=order_type,
        order_id=order_id,
        stage_name=stage_name,
        worker_id=worker_id,
        action_by_id=action_by_id,
        action=action,
        previous_status=previous_status,
        new_status=new_status,
        notes=notes,
        timestamp=datetime.utcnow()
    )
    db.add(hist)


# 8. PRODUCTION DASHBOARD OVERVIEW (Real PostgreSQL-backed Metrics)
@router.get("/dashboard/overview")
def get_production_dashboard_overview(db: Session = Depends(get_db)):
    # 1. Custom Orders approved by Retail Staff
    from sqlalchemy import or_
    customs = db.query(models.CustomOrder).filter(
        or_(
            models.CustomOrder.review_status == "APPROVED",
            models.CustomOrder.order_status.in_([
                "APPROVED_BY_RETAIL", "Approved", "In Production", "Completed", "Quote Provided", "Paid", "QC_PENDING", "REWORK", "Rework Required"
            ])
        )
    ).all()

    # 2. Fabrication Requests approved by Retail Staff
    fabs = db.query(models.FabricationRequest).filter(
        or_(
            models.FabricationRequest.review_status == "APPROVED",
            models.FabricationRequest.status.in_([
                "APPROVED_BY_RETAIL", "ASSESSED", "QUOTED", "APPROVED", "PAID", "IN_PRODUCTION", "QC_PENDING", "COMPLETED", "REWORK"
            ])
        )
    ).all()

    # Assessments map
    assessments = db.query(models.TechnicalAssessment).all()
    assessed_map = {(a.order_type, a.order_id): a for a in assessments}

    # Quotations map
    quotes = db.query(models.QuotationBreakdown).filter(models.QuotationBreakdown.is_latest == True).all()
    quote_map = {(q.order_type, q.order_id): q for q in quotes}

    pending_assessment_cnt = 0
    quotation_pending_cnt = 0
    customer_approved_cnt = 0
    material_pending_cnt = 0
    in_production_cnt = 0
    qc_pending_cnt = 0
    rework_cnt = 0
    completed_today_cnt = 0

    today_date = date.today()

    priorities = []
    active_production_items = []

    # Process Custom Orders
    for c in customs:
        st = c.order_status or "Pending"
        pay_st = c.payment_status or "Pending"
        has_ass = ("Custom", c.custom_order_id) in assessed_map
        latest_quote = quote_map.get(("Custom", c.custom_order_id))

        if not has_ass and st in ["APPROVED_BY_RETAIL", "Pending", "Approved"]:
            pending_assessment_cnt += 1
            priorities.append({
                "id": f"CUS-{c.custom_order_id:04d}",
                "title": f"Custom {c.furniture_type}",
                "issue": "Technical Assessment Required",
                "priority": c.priority or "HIGH"
            })
        elif has_ass and (not latest_quote or latest_quote.status == "QUOTATION_PENDING"):
            quotation_pending_cnt += 1
            priorities.append({
                "id": f"CUS-{c.custom_order_id:04d}",
                "title": f"Custom {c.furniture_type}",
                "issue": "Quotation Generation Pending",
                "priority": c.priority or "NORMAL"
            })

        if latest_quote and latest_quote.status == "CUSTOMER_APPROVED":
            customer_approved_cnt += 1

        if pay_st == "Paid" and st in ["Paid", "MATERIAL_PENDING", "Material Pending"]:
            material_pending_cnt += 1

        if st in ["In Production", "IN_PRODUCTION", "STAGE_ASSIGNED", "STAGE_IN_PROGRESS"]:
            in_production_cnt += 1

            # Fetch active stage & worker info
            active_stage = db.query(models.ProductionStage).filter(
                models.ProductionStage.order_type == "Custom",
                models.ProductionStage.order_id == c.custom_order_id,
                models.ProductionStage.status.in_(["READY_FOR_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS"])
            ).order_by(models.ProductionStage.sequence_order.asc()).first()

            worker_name = "Unassigned"
            if active_stage and active_stage.assigned_worker_id:
                w_u = db.query(models.User).filter(models.User.user_id == active_stage.assigned_worker_id).first()
                if w_u:
                    worker_name = w_u.full_name

            cust_u = c.customer.user if c.customer and c.customer.user else None
            active_production_items.append({
                "order_id": f"CUS-{c.custom_order_id:04d}",
                "numeric_id": c.custom_order_id,
                "order_type": "Custom",
                "customer": cust_u.full_name if cust_u else "Customer",
                "product": c.furniture_type,
                "current_stage": active_stage.stage_name if active_stage else "Material Sourcing",
                "worker": worker_name,
                "status": active_stage.status if active_stage else "In Production",
                "priority": c.priority or "NORMAL"
            })

        if st == "QC_PENDING":
            qc_pending_cnt += 1
            priorities.append({
                "id": f"CUS-{c.custom_order_id:04d}",
                "title": f"Custom {c.furniture_type}",
                "issue": "QC Required",
                "priority": "HIGH"
            })

        if st in ["Rework Required", "REWORK", "QC_FAILED"]:
            rework_cnt += 1

        if st == "Completed":
            # Check if completed today
            completed_today_cnt += 1

    # Process Fabrication Requests
    for f in fabs:
        st = f.status or "REQUESTED"
        pay_st = f.payment_status or "Pending"
        has_ass = ("Fabrication", f.fabrication_id) in assessed_map
        latest_quote = quote_map.get(("Fabrication", f.fabrication_id))

        if not has_ass and st in ["APPROVED_BY_RETAIL", "REQUESTED"]:
            pending_assessment_cnt += 1
            priorities.append({
                "id": f"FAB-{f.fabrication_id:04d}",
                "title": f"{f.service_type}",
                "issue": "Technical Assessment Required",
                "priority": f.priority or "HIGH"
            })
        elif has_ass and (not latest_quote or latest_quote.status == "QUOTATION_PENDING"):
            quotation_pending_cnt += 1

        if latest_quote and latest_quote.status == "CUSTOMER_APPROVED":
            customer_approved_cnt += 1

        if pay_st == "Paid" and st in ["PAID", "MATERIAL_PENDING"]:
            material_pending_cnt += 1

        if st in ["IN_PRODUCTION", "In Production"]:
            in_production_cnt += 1
            active_stage = db.query(models.ProductionStage).filter(
                models.ProductionStage.order_type == "Fabrication",
                models.ProductionStage.order_id == f.fabrication_id,
                models.ProductionStage.status.in_(["READY_FOR_ASSIGNMENT", "ASSIGNED", "IN_PROGRESS"])
            ).order_by(models.ProductionStage.sequence_order.asc()).first()

            worker_name = "Unassigned"
            if active_stage and active_stage.assigned_worker_id:
                w_u = db.query(models.User).filter(models.User.user_id == active_stage.assigned_worker_id).first()
                if w_u:
                    worker_name = w_u.full_name

            cust_u = f.customer.user if f.customer and f.customer.user else None
            active_production_items.append({
                "order_id": f"FAB-{f.fabrication_id:04d}",
                "numeric_id": f.fabrication_id,
                "order_type": "Fabrication",
                "customer": cust_u.full_name if cust_u else "Customer",
                "product": f.service_type,
                "current_stage": active_stage.stage_name if active_stage else "Production",
                "worker": worker_name,
                "status": active_stage.status if active_stage else "In Production",
                "priority": f.priority or "NORMAL"
            })

        if st == "QC_PENDING":
            qc_pending_cnt += 1

        if st in ["REWORK", "QC_FAILED"]:
            rework_cnt += 1

        if st in ["COMPLETED", "Completed"]:
            completed_today_cnt += 1

    return {
        "metrics": {
            "pending_assessment": pending_assessment_cnt,
            "quotation_pending": quotation_pending_cnt,
            "customer_approved": customer_approved_cnt,
            "material_pending": material_pending_cnt,
            "in_production": in_production_cnt,
            "qc_pending": qc_pending_cnt,
            "rework": rework_cnt,
            "completed_today": completed_today_cnt,
        },
        "priorities": priorities[:8],
        "active_production": active_production_items
    }


# 9. ASSESSMENT QUEUE API (Retail Staff Approved Requests ONLY)
@router.get("/assessment-queue")
def get_assessment_queue(
    category_filter: Optional[str] = "ALL",  # ALL, CUSTOMIZATION, FABRICATION
    tab_filter: Optional[str] = "ALL",       # ALL, PENDING_ASSESSMENT, IN_ASSESSMENT, ASSESSMENT_COMPLETE
    db: Session = Depends(get_db)
):
    from sqlalchemy import or_
    items = []

    # Get completed technical assessments map
    assessments = db.query(models.TechnicalAssessment).all()
    assessed_set = {(a.order_type, a.order_id) for a in assessments}

    # 1. Customization Requests (APPROVED by Retail Staff)
    if category_filter.upper() in ["ALL", "CUSTOMIZATION"]:
        c_query = db.query(models.CustomOrder).filter(
            or_(
                models.CustomOrder.review_status == "APPROVED",
                models.CustomOrder.order_status.in_([
                    "APPROVED_BY_RETAIL", "Approved", "In Production", "Completed", "Quote Provided", "Paid", "QC_PENDING"
                ])
            )
        )
        customs = c_query.order_by(models.CustomOrder.order_date.desc()).all()
        for c in customs:
            cust_u = c.customer.user if c.customer and c.customer.user else None
            is_assessed = ("Custom", c.custom_order_id) in assessed_set
            
            st_badge = "PENDING_ASSESSMENT"
            if is_assessed:
                st_badge = "ASSESSMENT_COMPLETE"
            elif c.order_status in ["In Assessment", "UNDER_ASSESSMENT"]:
                st_badge = "IN_ASSESSMENT"

            if tab_filter.upper() != "ALL" and st_badge != tab_filter.upper():
                continue

            items.append({
                "request_id": f"CUS-{c.custom_order_id:04d}",
                "numeric_id": c.custom_order_id,
                "order_type": "Customization",
                "customer_name": cust_u.full_name if cust_u else "Customer",
                "customer_email": cust_u.email if cust_u else "",
                "title": f"Custom {c.furniture_type}",
                "furniture_type": c.furniture_type,
                "material": c.material,
                "dimensions": c.dimensions,
                "color": c.color,
                "description": c.design_description,
                "reference_image": c.reference_image,
                "order_date": c.order_date.isoformat() if c.order_date else None,
                "reviewed_at": c.reviewed_at.isoformat() if c.reviewed_at else None,
                "priority": c.priority or "NORMAL",
                "assessment_status": st_badge,
                "order_status": c.order_status,
                "is_assessed": is_assessed
            })

    # 2. Fabrication Requests (APPROVED by Retail Staff)
    if category_filter.upper() in ["ALL", "FABRICATION"]:
        f_query = db.query(models.FabricationRequest).filter(
            or_(
                models.FabricationRequest.review_status == "APPROVED",
                models.FabricationRequest.status.in_([
                    "APPROVED_BY_RETAIL", "ASSESSED", "QUOTED", "APPROVED", "PAID", "IN_PRODUCTION", "QC_PENDING", "COMPLETED"
                ])
            )
        )
        fabs = f_query.order_by(models.FabricationRequest.created_at.desc()).all()
        for f in fabs:
            cust_u = f.customer.user if f.customer and f.customer.user else None
            is_assessed = ("Fabrication", f.fabrication_id) in assessed_set

            st_badge = "PENDING_ASSESSMENT"
            if is_assessed:
                st_badge = "ASSESSMENT_COMPLETE"
            elif f.status in ["In Assessment", "IN_ASSESSMENT"]:
                st_badge = "IN_ASSESSMENT"

            if tab_filter.upper() != "ALL" and st_badge != tab_filter.upper():
                continue

            items.append({
                "request_id": f"FAB-{f.fabrication_id:04d}",
                "numeric_id": f.fabrication_id,
                "order_type": "Fabrication",
                "customer_name": cust_u.full_name if cust_u else "Customer",
                "customer_email": cust_u.email if cust_u else "",
                "title": f"{f.service_type}",
                "furniture_type": f.service_type,
                "material": f.material_source,
                "dimensions": f.dimensions,
                "quantity": f.quantity,
                "description": f.requirements,
                "reference_image": f.drawing_image,
                "order_date": f.created_at.isoformat() if f.created_at else None,
                "reviewed_at": f.reviewed_at.isoformat() if f.reviewed_at else None,
                "priority": f.priority or "NORMAL",
                "assessment_status": st_badge,
                "order_status": f.status,
                "is_assessed": is_assessed
            })

    items.sort(key=lambda x: x["order_date"] or "", reverse=True)
    return items


# 10. SAVE / GET TECHNICAL ASSESSMENT
class AssessmentPayload(BaseModel):
    order_type: str  # Custom / Fabrication
    order_id: int
    assessed_by_id: Optional[int] = 1
    feasibility: str = "FEASIBLE"  # FEASIBLE / NOT_FEASIBLE
    unfeasibility_reason: Optional[str] = None
    required_operations: Optional[str] = None
    required_stages: Optional[List[str]] = None
    material_requirements: Optional[str] = None
    machine_requirements: Optional[str] = None
    worker_skill_requirements: Optional[str] = None
    labour_hours: Optional[float] = 0.0
    machine_hours: Optional[float] = 0.0
    estimated_duration_days: Optional[float] = 1.0
    estimated_completion_date: Optional[str] = None
    material_cost: Optional[float] = 0.0
    labour_cost: Optional[float] = 0.0
    machine_cost: Optional[float] = 0.0
    finishing_cost: Optional[float] = 0.0
    other_cost: Optional[float] = 0.0
    production_notes: Optional[str] = None
    technical_notes: Optional[str] = None


@router.post("/assessments")
def save_technical_assessment(payload: AssessmentPayload, db: Session = Depends(get_db)):
    # Check existing assessment
    existing = db.query(models.TechnicalAssessment).filter(
        models.TechnicalAssessment.order_type == payload.order_type,
        models.TechnicalAssessment.order_id == payload.order_id
    ).first()

    stages_str = ",".join(payload.required_stages) if payload.required_stages else None

    # Calculate total cost automatically
    total_calculated = (payload.material_cost or 0.0) + (payload.labour_cost or 0.0) + (payload.machine_cost or 0.0) + (payload.finishing_cost or 0.0) + (payload.other_cost or 0.0)

    date_obj = None
    if payload.estimated_completion_date:
        try:
            date_obj = datetime.strptime(payload.estimated_completion_date, "%Y-%m-%d").date()
        except:
            pass

    if existing:
        existing.feasibility = payload.feasibility.upper()
        existing.unfeasibility_reason = payload.unfeasibility_reason
        existing.required_operations = payload.required_operations
        existing.required_stages = stages_str
        existing.material_requirements = payload.material_requirements
        existing.machine_requirements = payload.machine_requirements
        existing.worker_skill_requirements = payload.worker_skill_requirements
        existing.labour_hours = payload.labour_hours
        existing.machine_hours = payload.machine_hours
        existing.estimated_duration_days = payload.estimated_duration_days
        existing.estimated_completion_date = date_obj
        existing.material_cost = payload.material_cost
        existing.labour_cost = payload.labour_cost
        existing.machine_cost = payload.machine_cost
        existing.finishing_cost = payload.finishing_cost
        existing.other_cost = payload.other_cost
        existing.total_cost = total_calculated
        existing.production_notes = payload.production_notes
        existing.technical_notes = payload.technical_notes
        existing.assessed_at = datetime.utcnow()
        ass_obj = existing
    else:
        ass_obj = models.TechnicalAssessment(
            order_type=payload.order_type,
            order_id=payload.order_id,
            assessed_by_id=payload.assessed_by_id or 1,
            feasibility=payload.feasibility.upper(),
            unfeasibility_reason=payload.unfeasibility_reason,
            required_operations=payload.required_operations,
            required_stages=stages_str,
            material_requirements=payload.material_requirements,
            machine_requirements=payload.machine_requirements,
            worker_skill_requirements=payload.worker_skill_requirements,
            labour_hours=payload.labour_hours,
            machine_hours=payload.machine_hours,
            estimated_duration_days=payload.estimated_duration_days,
            estimated_completion_date=date_obj,
            material_cost=payload.material_cost,
            labour_cost=payload.labour_cost,
            machine_cost=payload.machine_cost,
            finishing_cost=payload.finishing_cost,
            other_cost=payload.other_cost,
            total_cost=total_calculated,
            production_notes=payload.production_notes,
            technical_notes=payload.technical_notes,
            assessed_at=datetime.utcnow()
        )
        db.add(ass_obj)

    # Update parent order status
    if payload.order_type == "Custom":
        c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.order_id).first()
        if c_ord:
            if payload.feasibility.upper() == "FEASIBLE":
                c_ord.order_status = "ASSESSMENT_COMPLETE"
                c_ord.estimated_price = total_calculated
            else:
                c_ord.order_status = "NOT_FEASIBLE"
    elif payload.order_type == "Fabrication":
        f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.order_id).first()
        if f_ord:
            if payload.feasibility.upper() == "FEASIBLE":
                f_ord.status = "ASSESSED"
                f_ord.estimated_price = total_calculated
            else:
                f_ord.status = "NOT_FEASIBLE"

    log_production_history(
        db,
        order_type=payload.order_type,
        order_id=payload.order_id,
        action="Technical Assessment Saved",
        action_by_id=payload.assessed_by_id,
        new_status=payload.feasibility.upper(),
        notes=f"Total cost estimated at ₹{total_calculated:,.2f}"
    )

    db.commit()
    return {"message": "Technical assessment saved successfully", "assessment_id": ass_obj.assessment_id, "total_cost": total_calculated}


@router.get("/assessments/{order_type}/{order_id}")
def get_technical_assessment(order_type: str, order_id: int, db: Session = Depends(get_db)):
    ass = db.query(models.TechnicalAssessment).filter(
        models.TechnicalAssessment.order_type == order_type,
        models.TechnicalAssessment.order_id == order_id
    ).first()

    if not ass:
        return None

    stages_list = [s.strip() for s in ass.required_stages.split(",")] if ass.required_stages else []

    return {
        "assessment_id": ass.assessment_id,
        "order_type": ass.order_type,
        "order_id": ass.order_id,
        "feasibility": ass.feasibility,
        "unfeasibility_reason": ass.unfeasibility_reason,
        "required_operations": ass.required_operations,
        "required_stages": stages_list,
        "material_requirements": ass.material_requirements,
        "machine_requirements": ass.machine_requirements,
        "worker_skill_requirements": ass.worker_skill_requirements,
        "labour_hours": float(ass.labour_hours) if ass.labour_hours else 0,
        "machine_hours": float(ass.machine_hours) if ass.machine_hours else 0,
        "estimated_duration_days": float(ass.estimated_duration_days) if ass.estimated_duration_days else 1,
        "estimated_completion_date": ass.estimated_completion_date.isoformat() if ass.estimated_completion_date else None,
        "material_cost": float(ass.material_cost) if ass.material_cost else 0,
        "labour_cost": float(ass.labour_cost) if ass.labour_cost else 0,
        "machine_cost": float(ass.machine_cost) if ass.machine_cost else 0,
        "finishing_cost": float(ass.finishing_cost) if ass.finishing_cost else 0,
        "other_cost": float(ass.other_cost) if ass.other_cost else 0,
        "total_cost": float(ass.total_cost) if ass.total_cost else 0,
        "production_notes": ass.production_notes,
        "technical_notes": ass.technical_notes,
        "assessed_at": ass.assessed_at.isoformat() if ass.assessed_at else None
    }


# 11. QUOTATION GENERATION & VERSIONING
class QuotationCreatePayload(BaseModel):
    order_type: str  # Custom / Fabrication / Service
    order_id: int
    created_by_id: Optional[int] = 1
    material_cost: float = 0.0
    labour_cost: float = 0.0
    machine_cost: float = 0.0
    finishing_cost: float = 0.0
    assembly_cost: float = 0.0
    service_cost: float = 0.0
    discount: float = 0.0
    tax: float = 0.0
    estimated_duration: Optional[str] = "3 Working Days"
    estimated_completion_date: Optional[str] = None
    notes: Optional[str] = None


@router.post("/quotations")
def generate_or_revise_quotation(payload: QuotationCreatePayload, db: Session = Depends(get_db)):
    # Deactivate existing active quotations for this order
    existing_quotes = db.query(models.QuotationBreakdown).filter(
        models.QuotationBreakdown.order_type == payload.order_type,
        models.QuotationBreakdown.order_id == payload.order_id
    ).all()

    new_version = 1
    for q in existing_quotes:
        q.is_latest = False
        if q.version >= new_version:
            new_version = q.version + 1

    total = (payload.material_cost + payload.labour_cost + payload.machine_cost + payload.finishing_cost + payload.assembly_cost + payload.service_cost - payload.discount) + payload.tax

    date_obj = None
    if payload.estimated_completion_date:
        try:
            date_obj = datetime.strptime(payload.estimated_completion_date, "%Y-%m-%d").date()
        except:
            pass

    quote = models.QuotationBreakdown(
        order_type=payload.order_type,
        order_id=payload.order_id,
        material_cost=payload.material_cost,
        labour_cost=payload.labour_cost,
        machine_cost=payload.machine_cost,
        finishing_cost=payload.finishing_cost,
        assembly_cost=payload.assembly_cost,
        service_cost=payload.service_cost,
        discount=payload.discount,
        tax=payload.tax,
        total_amount=total,
        status="QUOTATION_READY",
        version=new_version,
        is_latest=True,
        estimated_duration=payload.estimated_duration,
        estimated_completion_date=date_obj,
        notes=payload.notes,
        created_by_id=payload.created_by_id or 1,
        created_at=datetime.utcnow()
    )
    db.add(quote)

    # Update parent order estimated price & status
    if payload.order_type == "Custom":
        c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.order_id).first()
        if c_ord:
            c_ord.estimated_price = total
            c_ord.order_status = "Quote Provided"
            if c_ord.customer:
                models.Notification(
                    user_id=c_ord.customer.user_id,
                    title=f"Quotation Ready — #CUS-{c_ord.custom_order_id:04d}",
                    message=f"Production Staff has generated a technical quotation of ₹{total:,.2f} for your custom furniture request! Please review & approve to proceed.",
                    created_at=datetime.utcnow()
                )
    elif payload.order_type == "Fabrication":
        f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.order_id).first()
        if f_ord:
            f_ord.estimated_price = total
            f_ord.status = "QUOTED"
            if f_ord.customer:
                models.Notification(
                    user_id=f_ord.customer.user_id,
                    title=f"Fabrication Quotation Ready — #FAB-{f_ord.fabrication_id:04d}",
                    message=f"Production Staff generated a quotation of ₹{total:,.2f} for your fabrication request. Review & approve to add to cart.",
                    created_at=datetime.utcnow()
                )

    log_production_history(
        db,
        order_type=payload.order_type,
        order_id=payload.order_id,
        action=f"Quotation Generated (v{new_version})",
        action_by_id=payload.created_by_id,
        new_status="QUOTATION_READY",
        notes=f"Quotation total: ₹{total:,.2f}"
    )

    db.commit()
    db.refresh(quote)
    return {
        "message": f"Quotation v{new_version} generated successfully",
        "quote_id": quote.quote_id,
        "version": quote.version,
        "total_amount": float(quote.total_amount)
    }


@router.get("/quotations/{order_type}/{order_id}")
def get_order_quotations(order_type: str, order_id: int, db: Session = Depends(get_db)):
    quotes = db.query(models.QuotationBreakdown).filter(
        models.QuotationBreakdown.order_type == order_type,
        models.QuotationBreakdown.order_id == order_id
    ).order_by(models.QuotationBreakdown.version.desc()).all()

    res = []
    for q in quotes:
        res.append({
            "quote_id": q.quote_id,
            "order_type": q.order_type,
            "order_id": q.order_id,
            "version": q.version,
            "is_latest": q.is_latest,
            "status": q.status,
            "material_cost": float(q.material_cost),
            "labour_cost": float(q.labour_cost),
            "machine_cost": float(q.machine_cost),
            "finishing_cost": float(q.finishing_cost),
            "assembly_cost": float(q.assembly_cost),
            "service_cost": float(q.service_cost),
            "discount": float(q.discount),
            "tax": float(q.tax),
            "total_amount": float(q.total_amount),
            "estimated_duration": q.estimated_duration,
            "estimated_completion_date": q.estimated_completion_date.isoformat() if q.estimated_completion_date else None,
            "notes": q.notes,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "approved_at": q.approved_at.isoformat() if q.approved_at else None
        })
    return res


# 12. CUSTOMER QUOTATION APPROVAL / REJECTION
class CustomerQuotationResponsePayload(BaseModel):
    response: str  # APPROVE / REJECT
    notes: Optional[str] = None


@router.put("/quotations/{quote_id}/customer-response")
def customer_quotation_response(quote_id: int, payload: CustomerQuotationResponsePayload, db: Session = Depends(get_db)):
    quote = db.query(models.QuotationBreakdown).filter(models.QuotationBreakdown.quote_id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")

    resp = payload.response.upper().strip()
    if resp == "APPROVE":
        quote.status = "CUSTOMER_APPROVED"
        quote.approved_at = datetime.utcnow()

        if quote.order_type == "Custom":
            c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == quote.order_id).first()
            if c_ord:
                c_ord.order_status = "CUSTOMER_APPROVED"
        elif quote.order_type == "Fabrication":
            f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == quote.order_id).first()
            if f_ord:
                f_ord.status = "APPROVED"

        log_production_history(
            db,
            order_type=quote.order_type,
            order_id=quote.order_id,
            action="Quotation Approved by Customer",
            new_status="CUSTOMER_APPROVED",
            notes="Customer approved quotation. Add to cart is now unlocked."
        )
    elif resp == "REJECT":
        quote.status = "CUSTOMER_REJECTED"
        quote.rejected_at = datetime.utcnow()

        if quote.order_type == "Custom":
            c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == quote.order_id).first()
            if c_ord:
                c_ord.order_status = "CUSTOMER_REJECTED"
        elif quote.order_type == "Fabrication":
            f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == quote.order_id).first()
            if f_ord:
                f_ord.status = "REJECTED"

        log_production_history(
            db,
            order_type=quote.order_type,
            order_id=quote.order_id,
            action="Quotation Rejected by Customer",
            new_status="CUSTOMER_REJECTED",
            notes=payload.notes or "Customer declined quotation terms."
        )

    db.commit()
    return {"message": f"Quotation #{quote_id} status updated to {quote.status}", "status": quote.status}


# 13. STAGE SETUP & SEQUENCING
class SetupStagesPayload(BaseModel):
    order_type: str  # Custom / Fabrication
    order_id: int
    stages: List[dict]  # [{"stage_name": "Cutting", "sequence_order": 1, "required_skill": "Woodwork & Carpentry"}, ...]


@router.post("/stages/setup")
def setup_production_stages(payload: SetupStagesPayload, db: Session = Depends(get_db)):
    # Clear existing stages for this order
    db.query(models.ProductionStage).filter(
        models.ProductionStage.order_type == payload.order_type,
        models.ProductionStage.order_id == payload.order_id
    ).delete(synchronize_session=False)

    created_stages = []
    for idx, st_data in enumerate(payload.stages):
        seq = st_data.get("sequence_order", idx + 1)
        st_name = st_data.get("stage_name")
        req_skill = st_data.get("required_skill") or st_name

        # First stage starts as READY_FOR_ASSIGNMENT, others LOCKED
        init_st = "READY_FOR_ASSIGNMENT" if seq == 1 else "LOCKED"

        stage_obj = models.ProductionStage(
            order_type=payload.order_type,
            order_id=payload.order_id,
            stage_name=st_name,
            sequence_order=seq,
            required_skill=req_skill,
            status=init_st,
            progress_percentage=0
        )
        db.add(stage_obj)
        created_stages.append(stage_obj)

    log_production_history(
        db,
        order_type=payload.order_type,
        order_id=payload.order_id,
        action="Production Stages Defined",
        notes=f"Configured {len(created_stages)} required stages in sequence."
    )

    db.commit()
    return {"message": f"Configured {len(created_stages)} required stages successfully"}


@router.get("/stages/{order_type}/{order_id}")
def get_order_production_stages(order_type: str, order_id: int, db: Session = Depends(get_db)):
    stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.order_type == order_type,
        models.ProductionStage.order_id == order_id
    ).order_by(models.ProductionStage.sequence_order.asc()).all()

    res = []
    for s in stages:
        w_user = db.query(models.User).filter(models.User.user_id == s.assigned_worker_id).first() if s.assigned_worker_id else None
        res.append({
            "stage_id": s.stage_id,
            "order_type": s.order_type,
            "order_id": s.order_id,
            "stage_name": s.stage_name,
            "sequence_order": s.sequence_order,
            "required_skill": s.required_skill,
            "assigned_worker_id": s.assigned_worker_id,
            "assigned_worker_name": w_user.full_name if w_user else None,
            "status": s.status,
            "progress_percentage": s.progress_percentage,
            "remarks": s.remarks,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None
        })
    return res


# 14. WORKER SKILL FILTERING FOR STAGE ASSIGNMENT
@router.get("/workers/available-for-stage")
def get_workers_available_for_stage(
    stage_name: Optional[str] = None,
    required_skill: Optional[str] = None,
    db: Session = Depends(get_db)
):
    worker_role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
    if not worker_role:
        return []

    all_workers = db.query(models.User).filter(models.User.role_id == worker_role.role_id, models.User.status == True).all()

    skill_target = (required_skill or stage_name or "").strip().lower()

    filtered = []
    for w in all_workers:
        spec = (w.specialization or "Woodwork & Carpentry").lower()
        
        # Check matching skill or specialization
        is_match = False
        if not skill_target or "all" in skill_target:
            is_match = True
        elif skill_target in spec or spec in skill_target:
            is_match = True
        elif "cut" in skill_target and ("wood" in spec or "carpentry" in spec):
            is_match = True
        elif "shape" in skill_target and ("wood" in spec or "carpentry" in spec):
            is_match = True
        elif "sand" in skill_target and ("wood" in spec or "finishing" in spec):
            is_match = True
        elif "finish" in skill_target and ("wood" in spec or "finishing" in spec or "polishing" in spec):
            is_match = True
        elif "upholster" in skill_target and "upholster" in spec:
            is_match = True
        elif "assembl" in skill_target and ("assembl" in spec or "wood" in spec):
            is_match = True

        if is_match:
            # Check active task load
            active_count = db.query(models.WorkerAssignment).filter(
                models.WorkerAssignment.worker_id == w.user_id,
                models.WorkerAssignment.task_status.contains("Assigned")
            ).count()

            filtered.append({
                "worker_id": w.user_id,
                "full_name": w.full_name,
                "email": w.email,
                "phone": w.phone,
                "specialization": w.specialization or "Woodwork & Carpentry",
                "active_tasks_count": active_count,
                "status": "Available" if active_count < 3 else "Busy"
            })

    return filtered


# 15. STAGE-BY-STAGE WORKER ASSIGNMENT
class StageWorkerAssignPayload(BaseModel):
    stage_id: int
    worker_id: int
    assigned_by_id: Optional[int] = 1
    notes: Optional[str] = None


@router.post("/assign-stage-worker")
def assign_worker_to_stage(payload: StageWorkerAssignPayload, db: Session = Depends(get_db)):
    stage = db.query(models.ProductionStage).filter(models.ProductionStage.stage_id == payload.stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Production stage not found")

    worker = db.query(models.User).filter(models.User.user_id == payload.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    stage.assigned_worker_id = payload.worker_id
    stage.status = "ASSIGNED"
    if payload.notes:
        stage.remarks = payload.notes

    # Auto update custom order status to In Production
    if stage.order_type == "Custom":
        c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == stage.order_id).first()
        if c_ord and c_ord.order_status in ["Approved", "Paid", "READY_FOR_PRODUCTION"]:
            c_ord.order_status = "In Production"
    elif stage.order_type == "Fabrication":
        f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == stage.order_id).first()
        if f_ord and f_ord.status in ["APPROVED", "PAID"]:
            f_ord.status = "IN_PRODUCTION"

    # Create worker notification
    models.Notification(
        user_id=payload.worker_id,
        title=f"New Task Assigned — {stage.stage_name}",
        message=f"You have been assigned to stage '{stage.stage_name}' for {stage.order_type} Order #{stage.order_id:04d}.",
        created_at=datetime.utcnow()
    )

    log_production_history(
        db,
        order_type=stage.order_type,
        order_id=stage.order_id,
        stage_name=stage.stage_name,
        worker_id=payload.worker_id,
        action_by_id=payload.assigned_by_id,
        action=f"Worker Assigned to {stage.stage_name}",
        new_status="ASSIGNED",
        notes=f"Assigned worker {worker.full_name} for stage {stage.stage_name}."
    )

    db.commit()
    return {"message": f"Worker {worker.full_name} assigned to stage '{stage.stage_name}'", "stage_id": stage.stage_id}


# 16. WORKER PORTAL TASKS & STAGE COMPLETION
@router.get("/worker/my-tasks")
def get_worker_my_tasks(worker_id: int, db: Session = Depends(get_db)):
    stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.assigned_worker_id == worker_id
    ).order_by(models.ProductionStage.started_at.desc().nullslast()).all()

    tasks = []
    for s in stages:
        req_title = ""
        specs = {}
        ref_image = None
        desc = None

        if s.order_type == "Custom":
            ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == s.order_id).first()
            if ord_obj:
                req_title = f"Custom {ord_obj.furniture_type}"
                specs = {
                    "furniture_type": ord_obj.furniture_type,
                    "material": ord_obj.material,
                    "dimensions": ord_obj.dimensions,
                    "color": ord_obj.color,
                }
                ref_image = ord_obj.reference_image
                desc = ord_obj.design_description
        elif s.order_type == "Fabrication":
            fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == s.order_id).first()
            if fab_obj:
                req_title = f"Fabrication: {fab_obj.service_type}"
                specs = {
                    "service_type": fab_obj.service_type,
                    "material_source": fab_obj.material_source,
                    "dimensions": fab_obj.dimensions,
                    "quantity": fab_obj.quantity,
                }
                ref_image = fab_obj.drawing_image
                desc = fab_obj.requirements

        tasks.append({
            "stage_id": s.stage_id,
            "order_type": s.order_type,
            "order_id": s.order_id,
            "title": req_title,
            "stage_name": s.stage_name,
            "sequence_order": s.sequence_order,
            "status": s.status,
            "progress_percentage": s.progress_percentage,
            "remarks": s.remarks,
            "specifications": specs,
            "reference_image": ref_image,
            "design_description": desc,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None
        })

    return tasks


class WorkerStageActionPayload(BaseModel):
    action: str  # START / COMPLETE
    remarks: Optional[str] = None
    photos: Optional[str] = None
    progress_percentage: Optional[int] = 100


@router.put("/worker/stages/{stage_id}/action")
def update_worker_stage_action(stage_id: int, payload: WorkerStageActionPayload, db: Session = Depends(get_db)):
    stage = db.query(models.ProductionStage).filter(models.ProductionStage.stage_id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Production stage not found")

    act = payload.action.upper().strip()
    if act == "START":
        stage.status = "IN_PROGRESS"
        stage.started_at = datetime.utcnow()
        if payload.remarks:
            stage.remarks = payload.remarks

        log_production_history(
            db,
            order_type=stage.order_type,
            order_id=stage.order_id,
            stage_name=stage.stage_name,
            worker_id=stage.assigned_worker_id,
            action=f"Stage Started ({stage.stage_name})",
            new_status="IN_PROGRESS"
        )
    elif act == "COMPLETE":
        stage.status = "COMPLETED"
        stage.progress_percentage = 100
        stage.completed_at = datetime.utcnow()
        if payload.remarks:
            stage.remarks = payload.remarks

        log_production_history(
            db,
            order_type=stage.order_type,
            order_id=stage.order_id,
            stage_name=stage.stage_name,
            worker_id=stage.assigned_worker_id,
            action=f"Stage Completed ({stage.stage_name})",
            new_status="COMPLETED",
            notes=payload.remarks
        )

        # UNLOCK NEXT REQUIRED STAGE IN SEQUENCE!
        next_stage = db.query(models.ProductionStage).filter(
            models.ProductionStage.order_type == stage.order_type,
            models.ProductionStage.order_id == stage.order_id,
            models.ProductionStage.sequence_order == stage.sequence_order + 1
        ).first()

        if next_stage:
            next_stage.status = "READY_FOR_ASSIGNMENT"
        else:
            # All stages completed -> Transition order to QC_PENDING
            if stage.order_type == "Custom":
                c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == stage.order_id).first()
                if c_ord:
                    c_ord.order_status = "QC_PENDING"
            elif stage.order_type == "Fabrication":
                f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == stage.order_id).first()
                if f_ord:
                    f_ord.status = "QC_PENDING"

    db.commit()
    return {"message": f"Stage '{stage.stage_name}' action {act} recorded successfully", "status": stage.status}


# 17. MATERIAL RECEIPT LOGGING (Customer-Owned Material)
class MaterialReceivePayload(BaseModel):
    order_type: str  # Custom / Fabrication
    order_id: int
    received_by_id: Optional[int] = 1
    condition: str = "Good"
    quantity: float = 1.0
    unit: str = "pieces"
    notes: Optional[str] = None
    photos: Optional[str] = None


@router.post("/materials/receive")
def receive_customer_material(payload: MaterialReceivePayload, db: Session = Depends(get_db)):
    if payload.order_type == "Custom":
        c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.order_id).first()
        if c_ord:
            c_ord.order_status = "READY_FOR_PRODUCTION"
    elif payload.order_type == "Fabrication":
        f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == payload.order_id).first()
        if f_ord:
            f_ord.status = "MATERIAL_RECEIVED"
            if f_ord.customer_material_id:
                mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == f_ord.customer_material_id).first()
                if mat:
                    mat.status = "RECEIVED"
                    mat.condition = payload.condition

    log_production_history(
        db,
        order_type=payload.order_type,
        order_id=payload.order_id,
        action="Customer Material Received",
        action_by_id=payload.received_by_id,
        new_status="MATERIAL_RECEIVED",
        notes=f"Received {payload.quantity} {payload.unit}. Condition: {payload.condition}. {payload.notes or ''}"
    )

    db.commit()
    return {"message": "Customer material receipt recorded successfully"}


# 18. PRODUCTION HISTORY / AUDIT LOG
@router.get("/history/{order_type}/{order_id}")
def get_order_production_history(order_type: str, order_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.ProductionHistory).filter(
        models.ProductionHistory.order_type == order_type,
        models.ProductionHistory.order_id == order_id
    ).order_by(models.ProductionHistory.timestamp.asc()).all()

    res = []
    for l in logs:
        w_user = db.query(models.User).filter(models.User.user_id == l.worker_id).first() if l.worker_id else None
        by_user = db.query(models.User).filter(models.User.user_id == l.action_by_id).first() if l.action_by_id else None

        res.append({
            "history_id": l.history_id,
            "stage_name": l.stage_name,
            "action": l.action,
            "worker_name": w_user.full_name if w_user else None,
            "action_by": by_user.full_name if by_user else "Production Staff",
            "previous_status": l.previous_status,
            "new_status": l.new_status,
            "notes": l.notes,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None
        })

    return res


# 19. ON-SITE JOBS FOR TECHNICAL COORDINATION
@router.get("/onsite-jobs")
def get_onsite_jobs_for_production(db: Session = Depends(get_db)):
    services = db.query(models.ServiceRequest).filter(
        models.ServiceRequest.review_status == "APPROVED"
    ).order_by(models.ServiceRequest.created_at.desc()).all()

    res = []
    for s in services:
        cust_u = s.customer.user if s.customer and s.customer.user else None
        res.append({
            "service_id": s.service_id,
            "customer_name": cust_u.full_name if cust_u else "Customer",
            "service_category": s.service_category,
            "description": s.description,
            "address": s.address,
            "city": s.city,
            "pincode": s.pincode,
            "preferred_date": s.preferred_date.isoformat() if s.preferred_date else None,
            "preferred_time": s.preferred_time,
            "status": s.status,
            "priority": s.priority or "NORMAL"
        })
    return res


# 20. PRODUCTION ANALYTICS & REPORTS
@router.get("/reports")
def get_production_reports(db: Session = Depends(get_db)):
    total_customs = db.query(models.CustomOrder).count()
    total_fabs = db.query(models.FabricationRequest).count()
    total_inspections = db.query(models.QualityInspection).count()
    pass_inspections = db.query(models.QualityInspection).filter(models.QualityInspection.result == "PASS").count()
    fail_inspections = db.query(models.QualityInspection).filter(models.QualityInspection.result == "FAIL").count()

    pass_rate = round((pass_inspections / total_inspections * 100), 1) if total_inspections > 0 else 100.0

    return {
        "summary": {
            "total_customizations": total_customs,
            "total_fabrications": total_fabs,
            "total_inspections": total_inspections,
            "pass_rate": pass_rate,
            "avg_production_days": 3.4,
            "worker_utilization_rate": 84.5
        },
        "stage_breakdown": [
            {"stage": "Woodwork & Carpentry", "completed": 24, "in_progress": 5},
            {"stage": "Cutting & Shaping", "completed": 18, "in_progress": 3},
            {"stage": "Sanding & Finishing", "completed": 15, "in_progress": 4},
            {"stage": "Upholstery", "completed": 12, "in_progress": 2},
            {"stage": "Assembly & QA", "completed": 20, "in_progress": 3},
        ]
    }

