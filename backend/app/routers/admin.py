from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session, joinedload, defer
from sqlalchemy import func, text
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Union, List
from datetime import datetime, date, timedelta
import string
import secrets
import random
import time
from app.database import get_db
from app import models, schemas, auth

# High-performance in-memory caches for BI summary and revenue analytics (120s TTL)
_dashboard_summary_cache = {
    "data": None,
    "timestamp": 0
}
_revenue_analytics_cache = {}
_bottlenecks_cache = {
    "data": None,
    "timestamp": 0
}
_admin_users_cache = {
    "data": None,
    "timestamp": 0
}

router = APIRouter(prefix="/api/admin", tags=["Admin Management"])

class SendCouponEmailRequest(BaseModel):
    email: str
    coupon_code: str
    discount_percent: int

class SendBulkCouponEmailRequest(BaseModel):
    emails: List[str]
    coupon_code: str
    discount_percent: int
    audience_title: Optional[str] = "Exclusive First Customers Discount"

@router.post("/send-coupon-email", status_code=status.HTTP_200_OK)
def send_coupon_email_endpoint(payload: SendCouponEmailRequest, background_tasks: BackgroundTasks):
    from app.email_utils import send_coupon_discount_email
    email_clean = payload.email.strip()
    if not email_clean:
        raise HTTPException(status_code=400, detail="Target email address is required.")
    
    background_tasks.add_task(
        send_coupon_discount_email,
        to_email=email_clean,
        coupon_code=payload.coupon_code.strip(),
        discount_percent=payload.discount_percent
    )
    return {"message": f"Coupon email dispatch scheduled for {email_clean}."}

@router.post("/send-bulk-coupon-emails", status_code=status.HTTP_200_OK)
def send_bulk_coupon_emails_endpoint(payload: SendBulkCouponEmailRequest, background_tasks: BackgroundTasks):
    from app.email_utils import send_coupon_discount_email
    valid_emails = [e.strip() for e in payload.emails if e and e.strip()]
    if not valid_emails:
        raise HTTPException(status_code=400, detail="No valid target email addresses provided.")
    
    for email in valid_emails:
        background_tasks.add_task(
            send_coupon_discount_email,
            to_email=email,
            coupon_code=payload.coupon_code.strip(),
            discount_percent=payload.discount_percent
        )
    return {"message": f"Bulk coupon email dispatch scheduled for {len(valid_emails)} customers."}

@router.get("/first-n-customers")
def get_first_n_customers(audience: str = "all", limit: int = 10, db: Session = Depends(get_db)):
    cust_role = db.query(models.Role).filter(models.Role.role_name == "Customer").first()
    query = db.query(models.User)
    if cust_role:
        query = query.filter(models.User.role_id == cust_role.role_id)
    
    users = query.order_by(models.User.user_id.asc()).all()
    
    filtered_customers = []
    for u in users:
        cust_type = "Customer"
        if audience == "retail":
            cust_type = "Retail Customer"
        elif audience == "production":
            cust_type = "Production Customer"
            
        filtered_customers.append({
            "user_id": u.user_id,
            "email": u.email,
            "name": u.full_name,
            "type": cust_type
        })
        if len(filtered_customers) >= limit:
            break
            
    return filtered_customers[:limit]

def generate_strong_password(length: int = 14) -> str:
    specials = "@#$%&*!"
    chars = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(string.digits),
        secrets.choice(specials),
        secrets.choice(specials),
    ]
    all_allowed = string.ascii_letters + string.digits + specials
    for _ in range(max(0, length - len(chars))):
        chars.append(secrets.choice(all_allowed))
    secrets.SystemRandom().shuffle(chars)
    return "".join(chars)

class StaffCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role_name: str  # "Retail Staff", "Production Staff", or "Artisan Worker"
    password: Optional[str] = None
    skill_name: Optional[str] = "Woodwork & Carpentry"
    proficiency_level: Optional[str] = "Expert"

    @field_validator('full_name')
    @classmethod
    def check_staff_name(cls, v: str) -> str:
        return schemas.validate_name_str(v)

    @field_validator('phone')
    @classmethod
    def check_staff_phone(cls, v: Optional[str]) -> Optional[str]:
        return schemas.validate_phone_str(v, required=False)

@router.post("/create-staff", status_code=status.HTTP_201_CREATED)
def create_staff(payload: StaffCreateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    role_clean = payload.role_name.strip()
    valid_roles = ["Retail Staff", "Production Staff", "Artisan Worker", "Worker"]
    if role_clean not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'Retail Staff', 'Production Staff', or 'Artisan Worker'"
        )

    email_clean = payload.email.strip()
    phone_clean = payload.phone.strip() if (payload.phone and payload.phone.strip()) else None

    # 1. Check if email already exists
    existing_email = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{email_clean}' already exists."
        )

    # 2. Check if phone already exists
    if phone_clean:
        existing_phone = db.query(models.User).filter(models.User.phone == phone_clean).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An account with phone number '{phone_clean}' already exists."
            )
    else:
        phone_clean = f"+91{random.randint(7000000000, 9999999999)}"

    # Get or create Role (Map Artisan Worker / Worker to Worker role)
    db_role_name = "Worker" if role_clean in ["Artisan Worker", "Worker"] else role_clean
    role = db.query(models.Role).filter(models.Role.role_name == db_role_name).first()
    if not role:
        role = models.Role(role_name=db_role_name)
        db.add(role)
        db.commit()
        db.refresh(role)

    # Generate strong secure password if not provided
    generated_password = payload.password.strip() if (payload.password and len(payload.password.strip()) >= 6) else generate_strong_password(12)
    hashed_pwd = auth.get_password_hash(generated_password)

    try:
        new_staff = models.User(
            role_id=role.role_id,
            full_name=payload.full_name.strip(),
            email=email_clean,
            phone=phone_clean,
            password=hashed_pwd,
            status=True
        )
        db.add(new_staff)
        db.commit()
        db.refresh(new_staff)

        # If creating a Worker/Artisan Worker, initialize availability and skill records
        if db_role_name == "Worker":
            avail = models.WorkerAvailability(
                worker_id=new_staff.user_id,
                status="AVAILABLE",
                active_jobs_count=0,
                rating_score=4.8
            )
            db.add(avail)
            skill = models.WorkerSkill(
                worker_id=new_staff.user_id,
                skill_name=payload.skill_name or "Woodwork & Carpentry",
                proficiency_level=payload.proficiency_level or "Expert"
            )
            db.add(skill)
            db.commit()

        log_audit_event(
            db,
            action=f"CREATE_{db_role_name.upper().replace(' ', '_')}",
            entity_type="User",
            entity_id=str(new_staff.user_id),
            details=f"Created {role_clean} account for {new_staff.full_name} ({new_staff.email})."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not create account: {str(e)}"
        )

    # Dispatch welcome email asynchronously via BackgroundTasks (instant response to frontend)
    background_tasks.add_task(
        send_staff_credentials_email,
        to_email=new_staff.email,
        staff_name=new_staff.full_name,
        role_name=role_clean,
        username=new_staff.email,
        password=generated_password
    )

    return {
        "message": f"Successfully created {role_clean} account for {new_staff.full_name}.",
        "user_id": new_staff.user_id,
        "full_name": new_staff.full_name,
        "email": new_staff.email,
        "role_name": role_clean,
        "generated_password": generated_password
    }

@router.get("/staff")
def list_staff(db: Session = Depends(get_db)):
    staff_roles = db.query(models.Role).filter(
        models.Role.role_name.in_(["Retail Staff", "Production Staff", "Worker", "Artisan Worker"])
    ).all()
    staff_role_ids = [r.role_id for r in staff_roles]
    
    users = db.query(models.User).filter(
        models.User.role_id.in_(staff_role_ids),
        models.User.email != "admin@retailsphere.com",
        models.User.full_name != "admin",
        ~models.User.email.ilike("%@example.com"),
        ~models.User.email.ilike("test_%"),
        ~models.User.full_name.ilike("%test%")
    ).order_by(models.User.user_id.asc()).all()
    
    result = []
    for u in users:
        raw_role = u.role.role_name if u.role else "Retail Staff"
        role_name = "Artisan Worker" if raw_role in ["Worker", "Artisan Worker"] else raw_role
        
        # Workload & availability calculations
        active_requests_count = 0
        active_jobs_count = 0
        active_tasks_count = 0
        completed_tasks_count = 0
        avail_status = "AVAILABLE"

        if raw_role == "Retail Staff":
            active_requests_count = (
                db.query(models.CustomOrder).filter(models.CustomOrder.reviewed_by_id == u.user_id, models.CustomOrder.review_status.in_(["NEW", "UNDER_REVIEW", "MORE_INFO_REQUESTED"])).count() +
                db.query(models.FabricationRequest).filter(models.FabricationRequest.reviewed_by_id == u.user_id, models.FabricationRequest.review_status.in_(["NEW", "UNDER_REVIEW", "MORE_INFO_REQUESTED"])).count() +
                db.query(models.ServiceRequest).filter(models.ServiceRequest.reviewed_by_id == u.user_id, models.ServiceRequest.review_status.in_(["NEW", "UNDER_REVIEW", "MORE_INFO_REQUESTED"])).count()
            )
        elif raw_role == "Production Staff":
            active_jobs_count = db.query(models.CustomOrder).filter(
                models.CustomOrder.production_staff_id == u.user_id,
                models.CustomOrder.order_status.in_(["Approved", "In Production", "QC_Pending"])
            ).count()
        elif raw_role in ["Worker", "Artisan Worker"]:
            active_tasks_count = db.query(models.ProductionStage).filter(
                models.ProductionStage.assigned_worker_id == u.user_id,
                models.ProductionStage.status.in_(["ASSIGNED", "IN_PROGRESS"])
            ).count()
            completed_tasks_count = db.query(models.ProductionStage).filter(
                models.ProductionStage.assigned_worker_id == u.user_id,
                models.ProductionStage.status == "COMPLETED"
            ).count()

            avail_row = db.query(models.WorkerAvailability).filter(models.WorkerAvailability.worker_id == u.user_id).first()
            if avail_row:
                avail_status = avail_row.status

            on_leave = db.query(models.WorkerLeave).filter(models.WorkerLeave.worker_id == u.user_id, models.WorkerLeave.status == "Approved").first()
            if on_leave:
                avail_status = "ON_LEAVE"

        result.append({
            "id": f"st-{u.user_id}",
            "user_id": u.user_id,
            "name": u.full_name,
            "email": u.email,
            "phone": u.phone or "+91 98765 43210",
            "role": role_name,
            "raw_role": raw_role,
            "skill": u.specialization or ("Woodwork & Carpentry" if role_name == "Artisan Worker" else None),
            "is_driver": bool(u.is_driver),
            "status": "Active" if u.status else "Inactive",
            "availability_status": avail_status,
            "active_requests_count": active_requests_count,
            "active_jobs_count": active_jobs_count,
            "active_tasks_count": active_tasks_count,
            "completed_tasks_count": completed_tasks_count,
            "dateAdded": u.created_at.strftime("%Y-%m-%d") if u.created_at else "Recent"
        })
    return result

class UserCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role_name: str  # "Customer", "Retail Staff", "Production Staff", "Worker", "Admin"
    is_driver: Optional[bool] = False
    password: Optional[str] = None
    status: Optional[bool] = True

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role_name: Optional[str] = None
    is_driver: Optional[bool] = None
    status: Optional[bool] = None

@router.get("/users")
def list_all_users(db: Session = Depends(get_db)):
    now_ts = time.time()
    if _admin_users_cache["data"] and (now_ts - _admin_users_cache["timestamp"] < 30.0):
        return _admin_users_cache["data"]

    admin_role = db.query(models.Role).filter(models.Role.role_name == "Admin").first()
    admin_role_id = admin_role.role_id if admin_role else None
    
    query = (
        db.query(models.User)
        .options(
            joinedload(models.User.role),
            joinedload(models.User.customer_profile)
        )
        .filter(
            models.User.email != "admin@retailsphere.com",
            models.User.full_name != "admin",
            ~models.User.email.ilike("%@example.com"),
            ~models.User.email.ilike("test_%"),
            ~models.User.full_name.ilike("%test%")
        )
    )
    if admin_role_id:
        query = query.filter(models.User.role_id != admin_role_id)
        
    users = query.order_by(models.User.user_id.asc()).all()
    
    result = []
    for u in users:
        role_name = u.role.role_name if u.role else "Customer"
        cust_addr = ""
        cust_dict = None
        if u.customer_profile:
            parts = [p for p in [u.customer_profile.address, u.customer_profile.city, u.customer_profile.state] if p and p.strip()]
            cust_addr = ", ".join(parts)
            if u.customer_profile.pincode and u.customer_profile.pincode.strip():
                cust_addr += f" - {u.customer_profile.pincode.strip()}"
            cust_dict = {
                "address": u.customer_profile.address or "",
                "city": u.customer_profile.city or "",
                "state": u.customer_profile.state or "",
                "pincode": u.customer_profile.pincode or ""
            }

        result.append({
            "id": f"usr-{u.user_id}",
            "user_id": u.user_id,
            "full_name": u.full_name,
            "name": u.full_name,
            "email": u.email,
            "phone": u.phone or "",
            "address": cust_addr,
            "customer": cust_dict,
            "role_name": role_name,
            "role": role_name,
            "is_driver": bool(u.is_driver),
            "status": u.status,
            "status_text": "Active" if u.status else "Inactive",
            "created_at": u.created_at.strftime("%Y-%m-%d") if u.created_at else "Recent",
            "dateAdded": u.created_at.strftime("%Y-%m-%d") if u.created_at else "Recent"
        })

    _admin_users_cache["data"] = result
    _admin_users_cache["timestamp"] = now_ts
    return result

@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user_admin(payload: UserCreateRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip()
    role_clean = payload.role_name.strip()
    phone_clean = payload.phone.strip() if (payload.phone and payload.phone.strip()) else None

    existing_user = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{email_clean}' already exists."
        )

    if not phone_clean:
        phone_clean = f"+91{random.randint(7000000000, 9999999999)}"

    db_role_name = "Worker" if role_clean in ["Artisan Worker", "Worker"] else role_clean
    role = db.query(models.Role).filter(models.Role.role_name == db_role_name).first()
    if not role:
        role = models.Role(role_name=db_role_name)
        db.add(role)
        db.commit()
        db.refresh(role)

    generated_password = payload.password.strip() if (payload.password and len(payload.password.strip()) >= 6) else generate_strong_password(12)
    hashed_pwd = auth.get_password_hash(generated_password)

    new_user = models.User(
        role_id=role.role_id,
        full_name=payload.full_name.strip(),
        email=email_clean,
        phone=phone_clean,
        password=hashed_pwd,
        is_driver=bool(payload.is_driver),
        status=payload.status if payload.status is not None else True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    _admin_users_cache["timestamp"] = 0.0

    if role_clean == "Customer":
        cust_profile = models.Customer(
            user_id=new_user.user_id,
            first_name=payload.full_name.split()[0],
            last_name=" ".join(payload.full_name.split()[1:]) if len(payload.full_name.split()) > 1 else "",
            phone=phone_clean
        )
        db.add(cust_profile)
        db.commit()

    return {
        "message": f"Successfully created {role_clean} account for {new_user.full_name}.",
        "user_id": new_user.user_id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "phone": new_user.phone,
        "role_name": role_clean,
        "role": role_clean,
        "is_driver": new_user.is_driver,
        "status": new_user.status,
        "generated_password": generated_password
    }

@router.put("/users/{user_id}")
def update_user_admin(user_id: int, payload: UserUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    if payload.full_name is not None and payload.full_name.strip():
        user.full_name = payload.full_name.strip()

    if payload.email is not None and payload.email.strip():
        new_email = payload.email.strip()
        existing = db.query(models.User).filter(models.User.email == new_email, models.User.user_id != user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email address '{new_email}' is already registered to another user account."
            )
        user.email = new_email

    if payload.phone is not None:
        user.phone = payload.phone.strip()

    if payload.status is not None:
        user.status = payload.status

    if payload.is_driver is not None:
        user.is_driver = bool(payload.is_driver)

    if payload.role_name is not None and payload.role_name.strip():
        role_clean = payload.role_name.strip()
        db_role_name = "Worker" if role_clean in ["Artisan Worker", "Worker"] else role_clean
        role = db.query(models.Role).filter(models.Role.role_name == db_role_name).first()
        if not role:
            role = models.Role(role_name=db_role_name)
            db.add(role)
            db.commit()
            db.refresh(role)
        user.role_id = role.role_id

    db.commit()
    db.refresh(user)
    _admin_users_cache["timestamp"] = 0.0

    return {
        "message": f"Updated user #{user_id} ({user.full_name}) successfully.",
        "user_id": user.user_id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.role_name if user.role else "Customer",
        "is_driver": bool(user.is_driver),
        "status": user.status
    }

@router.put("/users/{user_id}/status")
def toggle_user_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    user.status = not user.status
    db.commit()
    db.refresh(user)
    _admin_users_cache["timestamp"] = 0.0

    return {
        "message": f"User status set to {'Active' if user.status else 'Inactive'}.",
        "user_id": user.user_id,
        "status": user.status,
        "status_text": "Active" if user.status else "Inactive"
    }

@router.delete("/users/{user_id}")
def delete_user_by_id(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found in database."
        )
    
    # Clean up linked records
    db.query(models.Customer).filter(models.Customer.user_id == user_id).delete(synchronize_session=False)
    db.query(models.Notification).filter(models.Notification.user_id == user_id).delete(synchronize_session=False)
    
    user_email = user.email
    db.delete(user)
    db.commit()
    _admin_users_cache["timestamp"] = 0.0
    return {"message": f"Successfully deleted user account '{user_email}' (ID: {user_id}) from database."}

@router.delete("/users/by-email/{email}")
def delete_user_by_email(email: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email.strip()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{email}' not found in database."
        )
    
    user_id = user.user_id
    db.query(models.Customer).filter(models.Customer.user_id == user_id).delete(synchronize_session=False)
    db.query(models.Notification).filter(models.Notification.user_id == user_id).delete(synchronize_session=False)
    
    db.delete(user)
    db.commit()
    return {"message": f"Successfully deleted user account '{email}' (ID: {user_id}) from database."}


# ----------------------------------------------------
# DB LIVE INVENTORY ENDPOINTS
# ----------------------------------------------------

class ProductCreatePayload(BaseModel):
    name: str
    category: str
    subcategory: Optional[str] = None
    material: str
    price: float
    stock_count: int
    image_url: Optional[str] = None
    color: Optional[str] = "Natural"
    available_colors: Optional[str] = None

class StockUpdatePayload(BaseModel):
    stock_count: Optional[int] = None
    name: Optional[str] = None
    price: Optional[float] = None
    material: Optional[str] = None
    color: Optional[str] = None
    available_colors: Optional[str] = None
    subcategory: Optional[str] = None

# Cache for admin inventory / product catalog (TTL: 30 seconds)
_admin_inventory_cache = {"data": None, "timestamp": 0.0}

@router.get("/inventory")
def list_inventory(db: Session = Depends(get_db)):
    now_ts = time.time()
    if _admin_inventory_cache["data"] and (now_ts - _admin_inventory_cache["timestamp"] < 30.0):
        return _admin_inventory_cache["data"]
    products = (
        db.query(models.Product)
        .options(
            joinedload(models.Product.category),
            joinedload(models.Product.subcategory),
            joinedload(models.Product.images)
        )
        .all()
    )

    # Pre-aggregate review ratings and review counts in 1 single database query
    review_rows = (
        db.query(
            models.Review.product_id,
            func.count(models.Review.review_id),
            func.avg(models.Review.rating)
        )
        .group_by(models.Review.product_id)
        .all()
    )
    review_stats = {r[0]: (r[1], r[2]) for r in review_rows}

    res = []
    for p in products:
        qty = p.stock_quantity or 0
        if qty == 0:
            st = "Out of Stock"
        elif qty < 5:
            st = "Low Stock"
        else:
            st = "In Stock"
            
        first_img = p.image
        if not first_img and p.images:
            first_img = p.images[0].image_url

        # Parse available_colors string into list
        colors_list = []
        if getattr(p, "available_colors", None) and p.available_colors.strip():
            colors_list = [c.strip() for c in p.available_colors.split(",") if c.strip()]
        elif p.color and p.color.strip():
            colors_list = [p.color.strip()]

        stat = review_stats.get(p.product_id, (0, 0))

        res.append({
            "id": f"inv-{p.product_id}",
            "product_id": p.product_id,
            "name": p.product_name,
            "category": p.category.category_name if p.category else "Furniture",
            "subcategory": p.subcategory.subcategory_name if p.subcategory else "",
            "material": p.material or "Standard",
            "color": p.color or "Natural",
            "available_colors": colors_list,
            "price": float(p.price or 0),
            "stockCount": qty,
            "status": st,
            "rating": round(float(stat[1] or 0), 1),
            "review_count": int(stat[0] or 0),
            "image_url": first_img or "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"
        })

    _admin_inventory_cache["data"] = res
    _admin_inventory_cache["timestamp"] = now_ts
    return res

@router.post("/inventory", status_code=status.HTTP_201_CREATED)
def add_inventory_product(payload: ProductCreatePayload, db: Session = Depends(get_db)):
    _admin_inventory_cache["timestamp"] = 0.0
    cat_name = payload.category.strip()
    category = db.query(models.Category).filter(models.Category.category_name == cat_name).first()
    if not category:
        category = models.Category(category_name=cat_name)
        db.add(category)
        db.commit()
        db.refresh(category)

    subcat_name = payload.subcategory.strip() if payload.subcategory and payload.subcategory.strip() else f"{cat_name} General"
    subcat = db.query(models.Subcategory).filter(
        models.Subcategory.category_id == category.category_id,
        models.Subcategory.subcategory_name == subcat_name
    ).first()
    if not subcat:
        subcat = models.Subcategory(category_id=category.category_id, subcategory_name=subcat_name)
        db.add(subcat)
        db.commit()
        db.refresh(subcat)

    supplier = db.query(models.Supplier).first()
    if not supplier:
        supplier = models.Supplier(supplier_name="Primary Supplier", contact_person="Supply Manager", phone="+91 9876543210", email="supplier@retailsphere.com", address="Furniture Industrial Zone")
        db.add(supplier)
        db.commit()
        db.refresh(supplier)

    admin_user = db.query(models.User).filter(models.User.email == "admin@retailsphere.com").first()
    added_by_id = admin_user.user_id if admin_user else 1

    img_val = payload.image_url.strip() if payload.image_url else None
    color_val = payload.color.strip() if payload.color else "Natural"
    avail_colors = payload.available_colors.strip() if payload.available_colors else None

    new_prod = models.Product(
        category_id=category.category_id,
        subcategory_id=subcat.subcategory_id,
        supplier_id=supplier.supplier_id,
        added_by=added_by_id,
        product_name=payload.name.strip(),
        material=payload.material.strip(),
        color=color_val,
        available_colors=avail_colors,
        dimensions="Standard",
        price=payload.price,
        stock_quantity=payload.stock_count,
        image=img_val,
        status="Approved",
        availability_status="Available" if payload.stock_count > 0 else "Out of Stock"
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)

    if img_val:
        prod_img = models.ProductImage(product_id=new_prod.product_id, image_url=img_val)
        db.add(prod_img)
        db.commit()

    qty = new_prod.stock_quantity or 0
    if qty == 0:
        st = "Out of Stock"
    elif qty < 5:
        st = "Low Stock"
    else:
        st = "In Stock"

    colors_list = [c.strip() for c in avail_colors.split(",") if c.strip()] if avail_colors else [color_val]

    return {
        "id": f"inv-{new_prod.product_id}",
        "product_id": new_prod.product_id,
        "name": new_prod.product_name,
        "category": cat_name,
        "material": new_prod.material,
        "color": new_prod.color,
        "available_colors": colors_list,
        "price": float(new_prod.price),
        "stockCount": qty,
        "status": st,
        "image_url": img_val or "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"
    }

@router.patch("/inventory/{product_id}")
def update_product_stock(product_id: int, payload: StockUpdatePayload, db: Session = Depends(get_db)):
    _admin_inventory_cache["timestamp"] = 0.0
    prod = db.query(models.Product).filter(models.Product.product_id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.stock_count is not None:
        prod.stock_quantity = payload.stock_count
    if payload.name:
        prod.product_name = payload.name.strip()
    if payload.price is not None:
        prod.price = payload.price
    if payload.material:
        prod.material = payload.material.strip()
    if payload.color:
        prod.color = payload.color.strip()
    if payload.available_colors is not None:
        prod.available_colors = payload.available_colors.strip()
    db.commit()
    return {"message": "Product updated", "stock_count": prod.stock_quantity}


class QueryCreateRequest(BaseModel):
    staff_name: str
    staff_email: str
    category: str = "Email Change Request"
    subject: str
    message: str

class QueryRespondRequest(BaseModel):
    admin_response: str
    status: str = "Approved"

@router.get("/queries")
def get_staff_queries(db: Session = Depends(get_db)):
    queries = db.query(models.StaffQuery).order_by(models.StaffQuery.query_id.desc()).all()
    res = []
    for q in queries:
        res.append({
            "id": f"query-{q.query_id}",
            "query_id": q.query_id,
            "staffName": q.staff_name,
            "staffEmail": q.staff_email,
            "category": q.category,
            "subject": q.subject,
            "message": q.message,
            "status": q.status,
            "adminResponse": q.admin_response,
            "createdAt": q.created_at.strftime("%Y-%m-%d %H:%M") if q.created_at else "",
            "updatedAt": q.updated_at.strftime("%Y-%m-%d %H:%M") if q.updated_at else ""
        })
    return res

@router.post("/queries", status_code=status.HTTP_201_CREATED)
def create_staff_query(payload: QueryCreateRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.staff_email).first()
    user_id = user.user_id if user else None

    new_query = models.StaffQuery(
        user_id=user_id,
        staff_name=payload.staff_name,
        staff_email=payload.staff_email,
        category=payload.category,
        subject=payload.subject,
        message=payload.message,
        status="Pending"
    )
    db.add(new_query)
    db.commit()
    db.refresh(new_query)

    return {
        "id": f"query-{new_query.query_id}",
        "query_id": new_query.query_id,
        "staffName": new_query.staff_name,
        "staffEmail": new_query.staff_email,
        "category": new_query.category,
        "subject": new_query.subject,
        "message": new_query.message,
        "status": new_query.status,
        "createdAt": new_query.created_at.strftime("%Y-%m-%d %H:%M") if new_query.created_at else ""
    }

@router.put("/queries/{query_id}/respond")
def respond_staff_query(query_id: int, payload: QueryRespondRequest, db: Session = Depends(get_db)):
    q = db.query(models.StaffQuery).filter(models.StaffQuery.query_id == query_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Query not found")
    
    q.admin_response = payload.admin_response
    q.status = payload.status
    q.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Response recorded successfully", "status": q.status}

@router.get("/notifications")
def get_user_notifications(db: Session = Depends(get_db)):
    notifs = db.query(models.Notification).order_by(models.Notification.notification_id.desc()).all()
    res = []
    for n in notifs:
        res.append({
            "id": f"notif-{n.notification_id}",
            "notification_id": n.notification_id,
            "title": n.title,
            "message": n.message,
            "time": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else "",
            "unread": not n.is_read
        })
    return res

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    clean_id_str = str(notification_id).replace("notif-", "").strip()
    try:
        clean_id = int(clean_id_str)
    except (ValueError, TypeError):
        return {"status": "error", "message": f"Invalid notification ID: {notification_id}"}
    notif = db.query(models.Notification).filter(models.Notification.notification_id == clean_id).first()
    if notif:
        notif.is_read = True
        db.commit()
        return {"status": "success", "message": f"Notification {clean_id} marked as read"}
    return {"status": "not_found", "message": "Notification not found"}

@router.put("/notifications/mark-all-read")
def mark_all_notifications_read(db: Session = Depends(get_db)):
    db.query(models.Notification).filter(models.Notification.is_read == False).update({models.Notification.is_read: True})
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}



class SupplierCreateRequest(BaseModel):
    supplier_name: str
    contact_person: str
    phone: str
    email: Optional[str] = None
    address: str
    gst_number: Optional[str] = None


@router.get("/suppliers")
def get_suppliers(db: Session = Depends(get_db)):
    # Ensure exact 2 suppliers exist in DB: ARUN RAJ and Rahul Dev
    arun = db.query(models.Supplier).filter(models.Supplier.supplier_name == "ARUN RAJ").first()
    rahul = db.query(models.Supplier).filter(models.Supplier.supplier_name == "Rahul Dev").first()

    if not arun:
        arun = models.Supplier(
            supplier_name="ARUN RAJ",
            contact_person="ARUN RAJ",
            phone="9778237180",
            email=None,
            address="Furniture Logistics Hub, Sector 4",
            gst_number="29ARUN97782Z1",
            status=True
        )
        db.add(arun)
        db.commit()
        db.refresh(arun)
    else:
        arun.phone = "9778237180"
        arun.contact_person = "ARUN RAJ"
        db.commit()

    if not rahul:
        rahul = models.Supplier(
            supplier_name="Rahul Dev",
            contact_person="Rahul Dev",
            phone="7736783189",
            email=None,
            address="Timber & Crafts Hub, Sector 9",
            gst_number="29RAHUL7736Z2",
            status=True
        )
        db.add(rahul)
        db.commit()
        db.refresh(rahul)
    else:
        rahul.phone = "7736783189"
        rahul.contact_person = "Rahul Dev"
        db.commit()

    # Assign products among the 13: 6 to ARUN RAJ, 7 to Rahul Dev
    products = db.query(models.Product).order_by(models.Product.product_id.asc()).all()
    if products:
        for idx, p in enumerate(products):
            if idx < 6:
                p.supplier_id = arun.supplier_id
            else:
                p.supplier_id = rahul.supplier_id
        db.commit()

    suppliers = [arun, rahul]
    res = []
    for s in suppliers:
        assigned_prods = db.query(models.Product).filter(models.Product.supplier_id == s.supplier_id).all()
        products_list = []
        for p in assigned_prods:
            first_img = p.image
            if not first_img and p.images:
                first_img = p.images[0].image_url
            products_list.append({
                "product_id": p.product_id,
                "sku": f"SKU-RS-{p.product_id}",
                "name": p.product_name,
                "category": p.category.category_name if p.category else "Furniture",
                "material": p.material or "Standard",
                "price": float(p.price or 0),
                "quantity": p.stock_quantity or 0,
                "image_url": first_img or "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"
            })

        res.append({
            "id": f"sup-{s.supplier_id}",
            "supplier_id": s.supplier_id,
            "supplier_name": s.supplier_name,
            "contact_person": s.contact_person,
            "phone": s.phone,
            "address": s.address,
            "assigned_products_count": len(assigned_prods),
            "assigned_products": products_list,
            "status": "Active" if s.status else "Inactive"
        })

    return res


@router.post("/suppliers", status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierCreateRequest, db: Session = Depends(get_db)):
    new_sup = models.Supplier(
        supplier_name=payload.supplier_name.strip(),
        contact_person=payload.contact_person.strip(),
        phone=payload.phone.strip(),
        email=payload.email.strip() if payload.email else None,
        address=payload.address.strip(),
        gst_number=payload.gst_number.strip() if payload.gst_number else None,
        status=True
    )
    db.add(new_sup)
    db.commit()
    db.refresh(new_sup)

    return {
        "id": f"sup-{new_sup.supplier_id}",
        "supplier_id": new_sup.supplier_id,
        "supplier_name": new_sup.supplier_name,
        "contact_person": new_sup.contact_person,
        "phone": new_sup.phone,
        "email": new_sup.email,
        "address": new_sup.address,
        "gst_number": new_sup.gst_number,
        "status": "Active"
    }


class ReadymadeOrderItemSchema(BaseModel):
    id: Optional[str] = None
    name: str
    price: float
    quantity: int
    imageUrl: Optional[str] = None

class CreateReadymadeOrderPayload(BaseModel):
    customerId: Optional[Union[int, str]] = None
    customerName: str
    email: str
    itemsCount: int
    totalAmount: float
    orderStatus: str = "Order Placed"
    paymentStatus: str = "Paid"
    paymentId: Optional[str] = None
    items: list[ReadymadeOrderItemSchema]

@router.get("/orders")
def get_readymade_orders(db: Session = Depends(get_db)):
    db_orders = (
        db.query(models.ReadymadeOrder)
        .options(
            joinedload(models.ReadymadeOrder.customer).joinedload(models.Customer.user),
            joinedload(models.ReadymadeOrder.items),
            joinedload(models.ReadymadeOrder.fulfillment).joinedload(models.OrderFulfillment.driver_user),
            joinedload(models.ReadymadeOrder.fulfillment).joinedload(models.OrderFulfillment.assigned_personnel),
        )
        .order_by(models.ReadymadeOrder.order_id.desc())
        .all()
    )

    # Collect all product_ids across all items to fetch in 1 single query
    prod_ids = set()
    for r in db_orders:
        for item in r.items:
            if item.product_id:
                prod_ids.add(item.product_id)

    prod_map = {
        p.product_id: p for p in db.query(models.Product).filter(models.Product.product_id.in_(list(prod_ids))).all()
    } if prod_ids else {}

    res = []
    for r in db_orders:
        cust_name = r.customer_name
        cust_email = r.customer_email
        if r.customer and r.customer.user:
            cust_name = cust_name or r.customer.user.full_name
            cust_email = cust_email or r.customer.user.email

        if (cust_email and ("@example.com" in cust_email.lower() or cust_email.lower().startswith("test_"))) or (cust_name and "test" in cust_name.lower()):
            continue

        items_list = []
        for i in r.items:
            img = i.image_url
            sku_code = "SKU-RS-STORE"
            if i.product_id and i.product_id in prod_map:
                p = prod_map[i.product_id]
                sku_code = f"SKU-RS-{p.product_id:03d}"
                if not img and p.image:
                    img = p.image
            if not img:
                img = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80"
            
            items_list.append({
                "id": str(i.item_id),
                "productCode": sku_code,
                "sku": sku_code,
                "name": i.product_name or "Store Furniture Item",
                "price": float(i.unit_price or 0),
                "quantity": i.quantity or 1,
                "imageUrl": img
            })
        
        user_id = r.customer.user_id if r.customer else None

        fulfillment_info = None
        carrier_name = None
        expected_date = None
        tracking_num = None
        if r.fulfillment:
            carrier_name = r.fulfillment.carrier
            expected_date = r.fulfillment.expected_delivery_date
            tracking_num = r.fulfillment.tracking_number
            driver_name = None
            if r.fulfillment.driver_user:
                driver_name = r.fulfillment.driver_user.full_name
            elif r.fulfillment.assigned_personnel:
                driver_name = r.fulfillment.assigned_personnel.name

            fulfillment_info = {
                "fulfillment_id": r.fulfillment.fulfillment_id,
                "fulfillment_status": r.fulfillment.fulfillment_status,
                "carrier": carrier_name,
                "carrier_id": r.fulfillment.carrier_id,
                "tracking_number": tracking_num,
                "expected_delivery_date": expected_date,
                "dispatched_at": r.fulfillment.dispatched_at.isoformat() if r.fulfillment.dispatched_at else None,
                "delivered_at": r.fulfillment.delivered_at.isoformat() if r.fulfillment.delivered_at else None,
                "delivery_status": r.fulfillment.delivery_status,
                "driver_name": driver_name,
            }

        effective_order_status = r.order_status or "Order Placed"
        if r.fulfillment:
            if r.fulfillment.delivery_status in ["Delivered", "Completed"] or r.fulfillment.fulfillment_status in ["Delivered", "Completed"]:
                effective_order_status = "Delivered"
            elif r.fulfillment.delivery_status in ["Out for Delivery", "OUT_FOR_DELIVERY"] or r.fulfillment.fulfillment_status in ["Out for Delivery", "OUT_FOR_DELIVERY"]:
                effective_order_status = "Out for Delivery"
            elif r.fulfillment.fulfillment_status in ["Dispatched", "DISPATCHED", "In Transit"]:
                effective_order_status = "Dispatched"
            elif r.fulfillment.fulfillment_status in ["Packed", "PACKED"] and effective_order_status not in ["Dispatched", "Delivered", "Out for Delivery"]:
                effective_order_status = "Packed"

        res.append({
            "orderId": f"RET-{r.order_id:06d}",
            "customerId": r.customer_id,
            "customer_id": r.customer_id,
            "userId": user_id,
            "user_id": user_id,
            "customerName": cust_name or "Valued Customer",
            "customer_name": cust_name or "Valued Customer",
            "email": cust_email or (r.customer.user.email if r.customer and r.customer.user else "customer@retailsphere.ai"),
            "customerEmail": cust_email or (r.customer.user.email if r.customer and r.customer.user else "customer@retailsphere.ai"),
            "customer_email": cust_email or (r.customer.user.email if r.customer and r.customer.user else "customer@retailsphere.ai"),
            "customerPhone": (r.customer.user.phone if r.customer and r.customer.user else "") or "",
            "customer_phone": (r.customer.user.phone if r.customer and r.customer.user else "") or "",
            "itemsCount": sum(i.quantity for i in r.items) if r.items else 1,
            "totalAmount": float(r.total_amount or 0),
            "orderStatus": effective_order_status,
            "completionStatus": getattr(r, "completion_status", None) or effective_order_status,
            "paymentStatus": r.payment_status or "Paid",
            "paymentId": r.payment_id,
            "orderDate": r.order_date.strftime("%b %d, %Y") if r.order_date else "Recent",
            "createdAt": int(r.order_date.timestamp() * 1000) if r.order_date else 0,
            "carrier": carrier_name,
            "expectedDeliveryDate": expected_date,
            "trackingNumber": tracking_num,
            "fulfillment": fulfillment_info,
            "items": items_list
        })
    return res


@router.post("/orders", status_code=status.HTTP_201_CREATED)
def create_readymade_order(payload: CreateReadymadeOrderPayload, db: Session = Depends(get_db)):
    import time
    customer = None
    if payload.email:
        u = db.query(models.User).filter(models.User.email.ilike(payload.email.strip())).first()
        if u:
            customer = db.query(models.Customer).filter(models.Customer.user_id == u.user_id).first()

    if not customer and payload.customerId:
        clean_c_id = str(payload.customerId).replace('cust-', '').replace('user-', '')
        if clean_c_id.isdigit():
            c_int = int(clean_c_id)
            customer = db.query(models.Customer).filter(
                (models.Customer.customer_id == c_int) | (models.Customer.user_id == c_int)
            ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid customer profile not found for the current user. Order cannot be placed."
        )

    cust_id = customer.customer_id

    from app.utils.address_validator import is_valid_customer_address, get_formatted_customer_address
    user_obj = customer.user if customer else None
    if not user_obj and payload.email:
        user_obj = db.query(models.User).filter(models.User.email.ilike(payload.email.strip())).first()

    is_addr_valid, addr_err = is_valid_customer_address(customer, user_obj)
    if not is_addr_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incomplete delivery destination: {addr_err} Please update and save your delivery address in your Profile before placing an order."
        )

    delivery_addr = get_formatted_customer_address(customer, user_obj)

    # Pre-validate stock availability for all items in payload
    validated_items = []
    if payload.items:
        for item in payload.items:
            item_price = float(item.price or 0)
            item_qty = int(item.quantity or 1)
            if item_qty <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid quantity ({item_qty}) requested for '{item.name}'."
                )

            prod_id = None
            raw_id_str = str(item.id).replace('inv-', '').replace('rec-', '').replace('item-', '')
            if raw_id_str.isdigit():
                prod_id = int(raw_id_str)

            product = None
            if prod_id:
                product = db.query(models.Product).filter(models.Product.product_id == prod_id).with_for_update().first()
            if not product and item.name:
                product = db.query(models.Product).filter(models.Product.product_name.ilike(item.name.strip())).with_for_update().first()

            if product:
                avail_stock = product.stock_quantity if product.stock_quantity is not None else 0
                if avail_stock < item_qty:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock for '{product.product_name}'. Available: {avail_stock}, requested: {item_qty}."
                    )
                validated_items.append({
                    "item": item,
                    "product": product,
                    "prod_id": product.product_id,
                    "item_price": item_price,
                    "item_qty": item_qty,
                    "item_total": item_price * item_qty
                })
            else:
                validated_items.append({
                    "item": item,
                    "product": None,
                    "prod_id": prod_id,
                    "item_price": item_price,
                    "item_qty": item_qty,
                    "item_total": item_price * item_qty
                })

    try:
        order_total = float(payload.totalAmount) if (payload.totalAmount and payload.totalAmount > 0) else (
            sum(v["item_total"] for v in validated_items) if validated_items else 0.0
        )

        new_order = models.ReadymadeOrder(
            customer_id=cust_id,
            customer_name=payload.customerName.strip(),
            customer_email=payload.email.strip(),
            total_amount=order_total,
            payment_status=payload.paymentStatus.strip() or "Paid",
            payment_id=payload.paymentId.strip() if payload.paymentId else None,
            order_status="Order Placed",
            delivery_address=delivery_addr
        )
        db.add(new_order)
        db.flush()

        if validated_items:
            for v_item in validated_items:
                item = v_item["item"]
                product = v_item["product"]
                prod_id = v_item["prod_id"]
                item_price = v_item["item_price"]
                item_qty = v_item["item_qty"]

                # Decrement stock and update availability
                if product:
                    product.stock_quantity = max(0, (product.stock_quantity or 0) - item_qty)
                    product.availability_status = "Available" if product.stock_quantity > 0 else "Out of Stock"
                    db.add(product)

                db_item = models.ReadymadeOrderItem(
                    order_id=new_order.order_id,
                    product_id=prod_id,
                    product_name=item.name.strip(),
                    image_url=item.imageUrl,
                    quantity=item_qty,
                    unit_price=item_price
                )
                db.add(db_item)

        new_payment = models.Payment(
            order_type="Readymade",
            order_id=new_order.order_id,
            amount=order_total,
            payment_method="Razorpay",
            transaction_id=payload.paymentId or f"PAY-RET-{new_order.order_id}-{int(time.time())}",
            payment_status=payload.paymentStatus.strip() or "Paid"
        )
        db.add(new_payment)

        # Single Atomic Commit for entire checkout
        db.commit()
        db.refresh(new_order)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order creation failed: {str(e)}"
        )

    return {
        "message": "Order placed and stored successfully in database",
        "orderId": f"RET-{new_order.order_id:06d}",
        "order_id": new_order.order_id,
        "itemsCount": sum(i.quantity for i in new_order.items) if new_order.items else (payload.itemsCount or 1),
        "totalAmount": float(new_order.total_amount or 0)
    }


@router.put("/orders/{order_id_str}/cancel")
def cancel_readymade_order(order_id_str: str, db: Session = Depends(get_db)):
    clean_id = order_id_str.replace("RET-", "").lstrip("0")
    if not clean_id or not clean_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid order ID format")
    
    order_num = int(clean_id)
    ord_record = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).first()
    if not ord_record:
        raise HTTPException(status_code=404, detail="Readymade order not found")
    
    ord_record.order_status = "Cancelled"
    ord_record.payment_status = "Cancelled"

    # Also update tbl_payment if payment record exists
    pmt = db.query(models.Payment).filter(
        models.Payment.order_type == "Readymade",
        models.Payment.order_id == order_num
    ).first()
    if pmt:
        pmt.payment_status = "Cancelled"

    db.commit()
    db.refresh(ord_record)
    return {"message": f"Order {order_id_str} cancelled successfully", "orderStatus": "Cancelled"}


class OrderCompletionStatusPayload(BaseModel):
    completion_status: str
    order_status: Optional[str] = None
    payment_status: Optional[str] = None


@router.put("/orders/{order_id_str}/completion-status")
def update_readymade_completion_status(
    order_id_str: str,
    payload: OrderCompletionStatusPayload,
    db: Session = Depends(get_db)
):
    clean_id = order_id_str.replace("RET-", "").lstrip("0")
    if not clean_id or not clean_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid order ID format")
    
    order_num = int(clean_id)
    ord_record = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).first()
    if not ord_record:
        raise HTTPException(status_code=404, detail="Readymade order not found")
    
    if hasattr(ord_record, "completion_status"):
        ord_record.completion_status = payload.completion_status
    if payload.order_status:
        ord_record.order_status = payload.order_status
    if payload.payment_status:
        ord_record.payment_status = payload.payment_status

    db.commit()
    db.refresh(ord_record)
    return {
        "message": f"Order {order_id_str} completion status updated",
        "orderId": order_id_str,
        "completionStatus": payload.completion_status
    }



@router.delete("/orders/{order_id_str}")
@router.delete("/orders/{order_id_str}")
def delete_readymade_order(order_id_str: str, db: Session = Depends(get_db)):
    clean_id = order_id_str.replace("RET-", "").lstrip("0")
    if not clean_id or not clean_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid order ID format")
    
    order_num = int(clean_id)
    
    # Delete items
    db.query(models.ReadymadeOrderItem).filter(models.ReadymadeOrderItem.order_id == order_num).delete()
    
    # Delete payment
    db.query(models.Payment).filter(models.Payment.order_type == "Readymade", models.Payment.order_id == order_num).delete()

    # Delete order
    res = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == order_num).delete()
    if not res:
        raise HTTPException(status_code=404, detail="Order not found in database")

    db.commit()
    return {"message": f"Order {order_id_str} deleted from database successfully"}


# ----------------------------------------------------
# ADMIN SYSTEM-WIDE BUSINESS INTELLIGENCE & AUDIT ENDPOINTS
# ----------------------------------------------------

def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[str] = None,
    actor_id: Optional[int] = None,
    actor_role: Optional[str] = None,
    actor_name: Optional[str] = None
):
    try:
        entry = models.AuditLog(
            actor_id=actor_id,
            actor_role=actor_role or "System Admin",
            actor_name=actor_name or "System Administrator",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            timestamp=datetime.utcnow()
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[AUDIT LOG] Warning: {e}")


def calculate_admin_dashboard_summary(db: Session):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)
    five_days_ago = now - timedelta(days=5)

    sql_all_in_one = text('''
    SELECT
        (SELECT count(*) FROM tbl_readymade_order) AS rm_total,
        (SELECT count(*) FROM tbl_custom_order) AS co_total,
        (SELECT count(*) FROM tbl_fabrication_request) AS fab_total,
        (SELECT count(*) FROM tbl_service_request) AS srv_total,
        (SELECT count(*) FROM tbl_readymade_order WHERE order_date >= :today_start) AS rm_today,
        (SELECT count(*) FROM tbl_custom_order WHERE order_date >= :today_start) AS co_today,
        (SELECT count(*) FROM tbl_readymade_order WHERE order_status NOT IN ('Delivered', 'Cancelled')) AS rm_pending,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status NOT IN ('Completed', 'Delivered', 'Cancelled')) AS co_pending,
        (SELECT count(*) FROM tbl_readymade_order WHERE order_status = 'Delivered') AS rm_delivered,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status IN ('Completed', 'Delivered')) AS co_delivered,
        (SELECT count(*) FROM tbl_readymade_order WHERE order_status = 'Cancelled') AS rm_cancelled,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'Cancelled') AS co_cancelled,
        (SELECT coalesce(sum(total_amount), 0) FROM tbl_readymade_order WHERE order_status = 'Cancelled') AS rm_cancelled_val,
        (SELECT coalesce(sum(estimated_price), 0) FROM tbl_custom_order WHERE order_status = 'Cancelled') AS co_cancelled_val,
        (SELECT count(*) FROM tbl_order_return) AS ret_total,
        (SELECT count(*) FROM tbl_customer) AS cust_total,
        (SELECT count(*) FROM tbl_users WHERE status = true) AS active_users,
        (SELECT count(*) FROM tbl_product) AS prod_total,
        (SELECT count(*) FROM tbl_product WHERE stock_quantity < 5) AS prod_low_stock,
        (SELECT coalesce(sum(amount), 0) FROM tbl_payment WHERE payment_status = 'Paid') AS rev_total,
        (SELECT coalesce(sum(amount), 0) FROM tbl_payment WHERE payment_status = 'Paid' AND payment_date >= :today_start) AS rev_today,
        (SELECT coalesce(sum(amount), 0) FROM tbl_payment WHERE payment_status = 'Paid' AND payment_date >= :month_start) AS rev_month,
        (SELECT count(*) FROM tbl_payment WHERE payment_status = 'Paid') AS rev_paid_count,
        (SELECT coalesce(sum(refund_amount), 0) FROM tbl_order_return WHERE refund_status = 'Refunded') AS ret_refunds_total,
        (SELECT count(*) FROM tbl_rework_job WHERE status != 'RESOLVED') AS rework_total,
        (SELECT count(*) FROM tbl_readymade_order WHERE payment_status IN ('Pending', 'UNPAID')) AS rm_unpaid,
        (SELECT count(*) FROM tbl_custom_order WHERE payment_status IN ('Pending', 'UNPAID')) AS co_unpaid,
        (SELECT count(*) FROM tbl_fabrication_request WHERE payment_status IN ('Pending', 'UNPAID')) AS fab_unpaid,
        (SELECT count(*) FROM tbl_service_request WHERE payment_status IN ('Pending', 'UNPAID')) AS srv_unpaid,
        (SELECT count(*) FROM tbl_custom_order WHERE coalesce(review_status, 'NEW') IN ('NEW', 'UNDER_REVIEW')) AS cp_request,
        (SELECT count(*) FROM tbl_custom_order WHERE review_status = 'APPROVED') AS cp_retail_review,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'Technical Assessment') AS cp_technical_assessment,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'Quotation Sent') AS cp_quotation,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'Quotation Approved') AS cp_customer_approval,
        (SELECT count(*) FROM tbl_custom_order WHERE payment_status = 'Pending' AND order_status IN ('Quotation Approved', 'Awaiting Payment')) AS cp_payment,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'In Production') AS cp_production,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'QC Pending') AS cp_qc,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status IN ('Completed', 'Delivered')) AS cp_completed,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status IN ('NEW', 'APPROVED', 'Pending Assessment')) +
        (SELECT count(*) FROM tbl_fabrication_request WHERE status IN ('REQUESTED', 'ASSESSED')) AS ps_assessments_pending,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'Quotation Pending') +
        (SELECT count(*) FROM tbl_fabrication_request WHERE status = 'ASSESSED') AS ps_quotations_pending,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'Quotation Sent') +
        (SELECT count(*) FROM tbl_fabrication_request WHERE status = 'QUOTED') AS ps_customer_approvals_pending,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'Material Pending') +
        (SELECT count(*) FROM tbl_fabrication_request WHERE status = 'APPROVED' AND material_source = 'Customer-Owned') AS ps_materials_pending,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'In Production') +
        (SELECT count(*) FROM tbl_fabrication_request WHERE status = 'IN_PRODUCTION') AS ps_in_production,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'QC Pending') +
        (SELECT count(*) FROM tbl_fabrication_request WHERE status = 'QC_PENDING') AS ps_qc_pending,
        (SELECT count(*) FROM tbl_custom_order WHERE order_status = 'Completed' AND order_date >= :today_start) AS ps_completed_today,
        (SELECT json_object_agg(coalesce(order_status, 'Unknown'), cnt) FROM (SELECT order_status, count(*) as cnt FROM tbl_readymade_order GROUP BY order_status) t) AS rm_statuses,
        (SELECT json_object_agg(st, cnt) FROM (SELECT coalesce(a.status, 'AVAILABLE') as st, count(u.user_id) as cnt FROM tbl_users u JOIN tbl_role r ON u.role_id = r.role_id AND r.role_name = 'Worker' LEFT JOIN tbl_worker_availability a ON u.user_id = a.worker_id GROUP BY coalesce(a.status, 'AVAILABLE')) t) AS worker_statuses,
        (SELECT json_object_agg(coalesce(skill_name, 'Other'), cnt) FROM (SELECT skill_name, count(*) as cnt FROM tbl_worker_skill GROUP BY skill_name) t) AS worker_skills,
        (SELECT json_agg(json_build_object('id', custom_order_id, 'furniture_type', furniture_type, 'order_status', order_status, 'order_date', order_date)) FROM (SELECT custom_order_id, furniture_type, order_status, order_date FROM tbl_custom_order WHERE order_status = 'In Production' AND order_date < :five_days_ago LIMIT 5) t) AS delays,
        (SELECT json_agg(json_build_object('id', inspection_id, 'order_type', order_type, 'order_id', order_id, 'notes', inspection_notes)) FROM (SELECT inspection_id, order_type, order_id, inspection_notes FROM tbl_quality_inspection WHERE result = 'FAIL' ORDER BY inspection_id DESC LIMIT 5) t) AS qc_fails,
        (SELECT json_agg(json_build_object('product_id', product_id, 'product_name', product_name, 'stock_quantity', stock_quantity)) FROM (SELECT product_id, product_name, stock_quantity FROM tbl_product WHERE stock_quantity < 5 LIMIT 5) t) AS low_stock_items,
        (SELECT json_agg(json_build_object('audit_id', audit_id, 'actor_name', actor_name, 'actor_role', actor_role, 'action', action, 'entity_type', entity_type, 'entity_id', entity_id, 'details', details, 'timestamp', timestamp)) FROM (SELECT audit_id, actor_name, actor_role, action, entity_type, entity_id, details, timestamp FROM tbl_audit_log ORDER BY audit_id DESC LIMIT 15) t) AS recent_logs
    ''')

    metrics = dict(db.execute(sql_all_in_one, {'today_start': today_start, 'month_start': month_start, 'five_days_ago': five_days_ago}).fetchone()._mapping)

    rm_s = metrics.get('rm_statuses') or {}
    order_status_counts = {
        'Placed': int(rm_s.get('Placed', 0)) + int(rm_s.get('Order Placed', 0)),
        'Confirmed': int(rm_s.get('Confirmed', 0)),
        'Processing': int(rm_s.get('Processing', 0)) + int(rm_s.get('In Production', 0)),
        'Packing': int(rm_s.get('Packing', 0)),
        'Packed': int(rm_s.get('Packed', 0)),
        'Dispatched': int(rm_s.get('Dispatched', 0)),
        'Out for Delivery': int(rm_s.get('Out for Delivery', 0)),
        'Delivered': int(rm_s.get('Delivered', 0)),
        'Cancelled': int(rm_s.get('Cancelled', 0)),
        'Returned': int(rm_s.get('Returned', 0))
    }

    w_s = metrics.get('worker_statuses') or {}
    worker_status_counts = {
        'available': int(w_s.get('AVAILABLE', 0)),
        'busy': int(w_s.get('BUSY', 0)),
        'on_site': int(w_s.get('ON_SITE', 0)),
        'offline': int(w_s.get('OFF_DUTY', 0)) + int(w_s.get('OFFLINE', 0)) + int(w_s.get('INACTIVE', 0))
    }
    total_workers = sum(int(v) for v in w_s.values())

    w_skills = metrics.get('worker_skills') or {}
    skill_counts = {
        'Woodwork & Carpentry': sum(int(v) for k, v in w_skills.items() if 'Wood' in k or 'Carpen' in k),
        'Upholstery': sum(int(v) for k, v in w_skills.items() if 'Upholster' in k),
        'Assembly': sum(int(v) for k, v in w_skills.items() if 'Assembl' in k),
        'Surface Finishing': sum(int(v) for k, v in w_skills.items() if 'Finish' in k or 'Polish' in k)
    }

    pending_payments_count = (
        int(metrics.get('rm_unpaid', 0)) +
        int(metrics.get('co_unpaid', 0)) +
        int(metrics.get('fab_unpaid', 0)) +
        int(metrics.get('srv_unpaid', 0))
    )

    alerts = []
    for d in (metrics.get('delays') or []):
        f_type = d.get('furniture_type') or 'Custom Order'
        oid = d.get('id')
        alerts.append({
            'id': f'alert-delay-{oid}',
            'severity': 'URGENT',
            'title': f'Production Delay on Custom Order #{oid}',
            'description': f'Order for {f_type} has been in production for over 5 days.',
            'type': 'delay'
        })

    for qc in (metrics.get('qc_fails') or []):
        qid = qc.get('id')
        notes = qc.get('notes') or 'Quality checklist inspection failed.'
        alerts.append({
            'id': f'alert-qc-{qid}',
            'severity': 'URGENT',
            'title': f"QC Failure on {qc.get('order_type', 'Custom')} Order #{qc.get('order_id', qid)}",
            'description': f'Notes: {notes}',
            'type': 'qc_failure'
        })

    for p in (metrics.get('low_stock_items') or []):
        pid = p.get('product_id')
        pname = p.get('product_name') or 'Product'
        qty = p.get('stock_quantity')
        alerts.append({
            'id': f'alert-stock-{pid}',
            'severity': 'LOW_STOCK',
            'title': f'Low Stock Warning: {pname}',
            'description': f'Current inventory: {qty} units (Threshold: 5 units).',
            'type': 'low_stock'
        })

    activities = []
    for log in (metrics.get('recent_logs') or []):
        activities.append({
            'id': log.get('audit_id'),
            'actorName': log.get('actor_name') or 'System Admin',
            'actorRole': log.get('actor_role') or 'Admin',
            'action': log.get('action') or '',
            'entityType': log.get('entity_type') or '',
            'entityId': str(log.get('entity_id') or ''),
            'details': log.get('details') or '',
            'timestamp': str(log.get('timestamp') or '')[:19].replace('T', ' ')
        })

    summary_data = {
        'business_metrics': {
            'total_orders': int(metrics.get('rm_total', 0)) + int(metrics.get('co_total', 0)),
            'todays_orders': int(metrics.get('rm_today', 0)) + int(metrics.get('co_today', 0)),
            'pending_orders': int(metrics.get('rm_pending', 0)) + int(metrics.get('co_pending', 0)),
            'completed_orders': int(metrics.get('rm_delivered', 0)) + int(metrics.get('co_delivered', 0)),
            'cancelled_orders': int(metrics.get('rm_cancelled', 0)) + int(metrics.get('co_cancelled', 0)),
            'return_requests': int(metrics.get('ret_total', 0)),
            'total_customers': int(metrics.get('cust_total', 0)),
            'active_customers': int(metrics.get('active_users', 0)),
            'total_products': int(metrics.get('prod_total', 0)),
            'low_stock_items': int(metrics.get('prod_low_stock', 0))
        },
        'revenue_metrics': {
            'total_revenue': float(metrics.get('rev_total', 0)),
            'todays_revenue': float(metrics.get('rev_today', 0)),
            'this_month_revenue': float(metrics.get('rev_month', 0)),
            'paid_orders_count': int(metrics.get('rev_paid_count', 0)),
            'pending_payments_count': pending_payments_count,
            'refunds_total_amount': float(metrics.get('ret_refunds_total', 0)),
            'cancelled_order_value': float(metrics.get('rm_cancelled_val', 0)) + float(metrics.get('co_cancelled_val', 0))
        },
        'order_overview': {
            'readymade': int(metrics.get('rm_total', 0)),
            'customization': int(metrics.get('co_total', 0)),
            'fabrication': int(metrics.get('fab_total', 0)),
            'onsite_services': int(metrics.get('srv_total', 0))
        },
        'order_status_counts': order_status_counts,
        'custom_pipeline_counts': {
            'request': int(metrics.get('cp_request', 0)),
            'retail_review': int(metrics.get('cp_retail_review', 0)),
            'technical_assessment': int(metrics.get('cp_technical_assessment', 0)),
            'quotation': int(metrics.get('cp_quotation', 0)),
            'customer_approval': int(metrics.get('cp_customer_approval', 0)),
            'payment': int(metrics.get('cp_payment', 0)),
            'production': int(metrics.get('cp_production', 0)),
            'qc': int(metrics.get('cp_qc', 0)),
            'completed': int(metrics.get('cp_completed', 0))
        },
        'production_status_summary': {
            'technical_assessment': int(metrics.get('ps_assessments_pending', 0)),
            'quotation_pending': int(metrics.get('ps_quotations_pending', 0)),
            'customer_approval': int(metrics.get('ps_customer_approvals_pending', 0)),
            'payment_pending': pending_payments_count,
            'material_pending': int(metrics.get('ps_materials_pending', 0)),
            'in_production': int(metrics.get('ps_in_production', 0)),
            'qc_pending': int(metrics.get('ps_qc_pending', 0)),
            'rework': int(metrics.get('rework_total', 0)),
            'completed_today': int(metrics.get('ps_completed_today', 0))
        },
        'worker_overview': {
            'total_workers': total_workers,
            'status_counts': worker_status_counts,
            'skill_counts': skill_counts
        },
        'alerts': alerts,
        'recent_activities': activities
    }
    return summary_data


def warm_dashboard_cache():
    try:
        from app.database import SessionLocal
        with SessionLocal() as db:
            data = calculate_admin_dashboard_summary(db)
            _dashboard_summary_cache["data"] = data
            _dashboard_summary_cache["timestamp"] = time.time()
            print("[CACHE] Admin dashboard summary cache pre-warmed successfully.")
    except Exception as e:
        print(f"[CACHE] Notice: {e}")


@router.get("/dashboard-summary")
def get_admin_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify Admin Authorization
    if current_user.role and current_user.role.role_name not in ["Admin", "System Admin"]:
        if current_user.email != "admin@retailsphere.com":
            raise HTTPException(status_code=403, detail="Admin authorization required.")

    now_ts = time.time()
    # Cache hit: Fresh (< 120 seconds)
    if _dashboard_summary_cache["data"] and (now_ts - _dashboard_summary_cache["timestamp"] < 120):
        return _dashboard_summary_cache["data"]

    summary_data = calculate_admin_dashboard_summary(db)
    _dashboard_summary_cache["data"] = summary_data
    _dashboard_summary_cache["timestamp"] = now_ts
    return summary_data


@router.get("/analytics/revenue")
def get_revenue_analytics(
    period: str = "30days",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    now_ts = time.time()
    cache_key = period
    if cache_key in _revenue_analytics_cache:
        c_data, c_ts = _revenue_analytics_cache[cache_key]
        if now_ts - c_ts < 120:
            return c_data

    now = datetime.utcnow()
    
    if period == "today":
        period_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        period_label = "Today"
    elif period == "7days":
        period_start = now - timedelta(days=7)
        period_label = "Last 7 Days"
    elif period == "30days":
        period_start = now - timedelta(days=30)
        period_label = "Last 30 Days"
    elif period == "this_month":
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_label = "This Month"
    elif period == "this_year":
        period_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        period_label = "This Year"
    else:
        period_start = now - timedelta(days=30)
        period_label = "Last 30 Days"

    sql_rev = text('''
        SELECT
          coalesce(sum(amount), 0) AS total_revenue,
          count(*) AS order_count,
          coalesce(
            (SELECT coalesce(sum(refund_amount), 0)
             FROM tbl_order_return
             WHERE refund_status = 'Refunded'
               AND (returned_at >= :period_start OR (returned_at IS NULL AND requested_at >= :period_start))),
            0
          ) AS refund_amount
        FROM tbl_payment
        WHERE payment_status = 'Paid' AND payment_date >= :period_start
    ''')
    metrics = dict(db.execute(sql_rev, {'period_start': period_start}).fetchone()._mapping)
    period_total_revenue = float(metrics["total_revenue"])
    period_paid_count = int(metrics["order_count"])
    period_refund_amount = float(metrics["refund_amount"])
    avg_order_val = period_total_revenue / period_paid_count if period_paid_count > 0 else 0.0
    net_revenue = period_total_revenue - period_refund_amount

    sql_chart = text('''
        SELECT payment_date, amount, order_type
        FROM tbl_payment
        WHERE payment_status = 'Paid' AND payment_date >= :period_start
        ORDER BY payment_date ASC
    ''')
    chart_rows = db.execute(sql_chart, {'period_start': period_start}).fetchall()
    revenue_chart = []
    for r in chart_rows:
        p_date = r[0]
        revenue_chart.append({
            "date": p_date.strftime("%d %b") if p_date else "Recent",
            "amount": float(r[1] or 0),
            "orderType": r[2]
        })

    rev_result = {
        "period": period,
        "period_label": period_label,
        "total_revenue": period_total_revenue,
        "order_count": period_paid_count,
        "average_order_value": round(avg_order_val, 2),
        "paid_amount": period_total_revenue,
        "refund_amount": period_refund_amount,
        "net_revenue": net_revenue,
        "chart_data": revenue_chart
    }
    _revenue_analytics_cache[cache_key] = (rev_result, now_ts)
    return rev_result


@router.get("/pipeline/bottlenecks")
def get_production_bottlenecks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    now_ts = time.time()
    if _bottlenecks_cache["data"] and (now_ts - _bottlenecks_cache["timestamp"] < 90):
        return _bottlenecks_cache["data"]

    stages = db.query(models.ProductionStage).all()
    stage_groups: dict = {}
    for st in stages:
        s_name = st.stage_name
        if s_name not in stage_groups:
            stage_groups[s_name] = {"pending": 0, "in_progress": 0, "workers": set()}
        if st.status in ["LOCKED", "READY_FOR_ASSIGNMENT", "ASSIGNED"]:
            stage_groups[s_name]["pending"] += 1
        elif st.status == "IN_PROGRESS":
            stage_groups[s_name]["in_progress"] += 1
        if st.assigned_worker_id:
            stage_groups[s_name]["workers"].add(st.assigned_worker_id)

    bottlenecks = []
    for name, data in stage_groups.items():
        bottlenecks.append({
            "stage": name,
            "pending_jobs": data["pending"],
            "in_progress_jobs": data["in_progress"],
            "assigned_workers_count": len(data["workers"]),
            "avg_waiting_time_hours": 4.5 if data["pending"] > 2 else 1.2,
            "risk": "HIGH" if data["pending"] >= 3 else ("MEDIUM" if data["pending"] > 0 else "LOW")
        })

    _bottlenecks_cache["data"] = bottlenecks
    _bottlenecks_cache["timestamp"] = now_ts
    return bottlenecks


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    logs = db.query(models.AuditLog).order_by(models.AuditLog.audit_id.desc()).limit(limit).all()
    res = []
    for l in logs:
        res.append({
            "audit_id": l.audit_id,
            "actor_id": l.actor_id,
            "actor_name": l.actor_name or "System Admin",
            "actor_role": l.actor_role or "Admin",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id or "",
            "details": l.details or "",
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else ""
        })
    return res


class CreateAuditLogPayload(BaseModel):
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None


@router.post("/audit-logs", status_code=status.HTTP_201_CREATED)
def create_audit_log(
    payload: CreateAuditLogPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    log_audit_event(
        db,
        action=payload.action,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        details=payload.details,
        actor_id=current_user.user_id,
        actor_role=current_user.role.role_name if current_user.role else "Admin",
        actor_name=current_user.full_name
    )
    return {"message": "Audit event recorded."}


@router.get("/search")
def global_system_search(
    q: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query_str = q.strip().lower()
    if not query_str:
        return {"results": []}

    results = []

    # 1. Readymade Orders
    readymade = db.query(models.ReadymadeOrder).all()
    for r in readymade:
        ord_code = f"RET-{r.order_id:06d}".lower()
        if query_str in ord_code or query_str in (r.customer_name or "").lower() or query_str in (r.customer_email or "").lower():
            results.append({
                "type": "Order",
                "id": f"RET-{r.order_id:06d}",
                "title": f"Ready-Made Order RET-{r.order_id:06d}",
                "subtitle": f"Customer: {r.customer_name or 'Client'} | Status: {r.order_status} | ₹{r.total_amount}",
                "entityId": r.order_id
            })

    # 2. Custom Orders
    customs = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id.notin_([103, 102, 13, 28, 101, 14, 40])).all()
    for c in customs:
        code = f"CUS-{c.custom_order_id:04d}".lower()
        if query_str in code or query_str in (c.furniture_type or "").lower() or query_str in (c.material or "").lower():
            results.append({
                "type": "Customization",
                "id": f"CUS-{c.custom_order_id:04d}",
                "title": f"Customization Request #{c.custom_order_id} ({c.furniture_type})",
                "subtitle": f"Status: {c.order_status} | Material: {c.material}",
                "entityId": c.custom_order_id
            })

    # 3. Fabrication Requests
    fabs = db.query(models.FabricationRequest).all()
    for f in fabs:
        code = f"FBR-{f.fabrication_id:04d}".lower()
        if query_str in code or query_str in (f.service_type or "").lower() or query_str in (f.dimensions or "").lower():
            results.append({
                "type": "Fabrication",
                "id": f"FBR-{f.fabrication_id:04d}",
                "title": f"Fabrication Request #{f.fabrication_id} ({f.service_type})",
                "subtitle": f"Status: {f.status} | Source: {f.material_source}",
                "entityId": f.fabrication_id
            })

    # 4. Service Requests
    srvs = db.query(models.ServiceRequest).all()
    for s in srvs:
        code = f"SRV-{s.service_id:04d}".lower()
        if query_str in code or query_str in (s.service_category or "").lower() or query_str in (s.city or "").lower():
            results.append({
                "type": "On-Site Service",
                "id": f"SRV-{s.service_id:04d}",
                "title": f"On-Site Service Job #{s.service_id} ({s.service_category})",
                "subtitle": f"Status: {s.status} | Location: {s.city}",
                "entityId": s.service_id
            })

    # 5. Products
    prods = db.query(models.Product).all()
    for p in prods:
        sku = f"SKU-RS-{p.product_id}".lower()
        if query_str in sku or query_str in p.product_name.lower() or query_str in (p.material or "").lower():
            results.append({
                "type": "Product",
                "id": f"SKU-RS-{p.product_id}",
                "title": p.product_name,
                "subtitle": f"Material: {p.material} | Stock: {p.stock_quantity} | ₹{p.price}",
                "entityId": p.product_id
            })

    # 6. Users / Customers
    users = db.query(models.User).all()
    for u in users:
        if query_str in u.full_name.lower() or query_str in u.email.lower():
            role_name = u.role.role_name if u.role else "User"
            results.append({
                "type": "User",
                "id": f"USR-{u.user_id}",
                "title": f"{u.full_name} ({role_name})",
                "subtitle": f"Email: {u.email} | Phone: {u.phone or 'N/A'}",
                "entityId": u.user_id
            })

    return {"results": results[:20]}


class AdminLeaveReviewPayload(BaseModel):
    status: str
    review_notes: Optional[str] = None


@router.get("/leave-requests")
def get_admin_leave_requests(db: Session = Depends(get_db)):
    leaves = db.query(models.WorkerLeave).order_by(models.WorkerLeave.applied_on.desc()).all()
    return leaves


@router.post("/leave-requests/{leave_id}/review")
def admin_review_leave_request(leave_id: int, payload: AdminLeaveReviewPayload, db: Session = Depends(get_db)):
    leave = db.query(models.WorkerLeave).filter(models.WorkerLeave.leave_id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request record not found.")

    leave.status = payload.status.capitalize()
    leave.reviewed_by = "System Administrator"
    if payload.review_notes:
        leave.review_notes = payload.review_notes.strip()

    db.commit()
    db.refresh(leave)

    return {"message": f"Leave request #{leave_id} set to {leave.status}.", "leave": leave}


@router.get("/export-database-excel")
def export_database_excel_endpoint():
    """
    READ-ONLY Database Export Endpoint for Inspection and Documentation.
    Exports all current database tables and records into an Excel (.xlsx) file.
    Completely read-only operation: No data is inserted, updated, or deleted.
    """
    from fastapi.responses import Response
    from export_database_excel import generate_database_excel_bytes

    try:
        excel_bytes = generate_database_excel_bytes()
        filename = f"RetailSphere_Database_Export_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        print(f"[EXPORT ERROR] Failed to generate Excel export: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database export generation failed: {str(e)}"
        )


# --- Carrier Partner Management Endpoints ---
# --- CARRIER PARTNERS MANAGEMENT ---

@router.get("/carriers")
def list_carrier_partners(db: Session = Depends(get_db)):
    carriers = db.query(models.CarrierPartner).order_by(models.CarrierPartner.carrier_id.asc()).all()
    return carriers


@router.post("/carriers", status_code=status.HTTP_201_CREATED)
def create_carrier_partner(payload: schemas.CarrierPartnerCreate, db: Session = Depends(get_db)):
    name_clean = payload.carrier_name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Carrier name is required.")
    
    phone_clean = payload.contact_phone.strip()
    if not phone_clean:
        raise HTTPException(status_code=400, detail="Contact phone number is required.")

    # 1. Ensure 'Carrier Partner' role exists in tbl_role
    carrier_role = db.query(models.Role).filter(
        (models.Role.role_name == "Carrier Partner") |
        (models.Role.role_name == "CARRIER_PARTNER")
    ).first()

    if not carrier_role:
        carrier_role = models.Role(role_name="Carrier Partner")
        db.add(carrier_role)
        db.commit()
        db.refresh(carrier_role)

    # 2. Create platform User account for this Carrier Partner if email is provided
    created_user = None
    temp_pwd = generate_strong_password(12)
    email_sent = False

    if payload.contact_email and payload.contact_email.strip():
        email_clean = payload.contact_email.strip().lower()
        existing_u = db.query(models.User).filter(models.User.email == email_clean).first()
        hashed_pwd = auth.get_password_hash(temp_pwd)
        
        if not existing_u:
            created_user = models.User(
                role_id=carrier_role.role_id,
                full_name=name_clean,
                email=email_clean,
                phone=phone_clean,
                password=hashed_pwd,
                status=True,
                must_change_password=True
            )
            db.add(created_user)
            db.commit()
            db.refresh(created_user)
        else:
            created_user = existing_u
            created_user.role_id = carrier_role.role_id
            created_user.full_name = name_clean
            created_user.phone = phone_clean
            created_user.password = hashed_pwd
            created_user.status = True
            created_user.must_change_password = True
            db.commit()

        # Send credentials via email
        try:
            email_sent = send_carrier_credentials_email(
                to_email=email_clean,
                carrier_name=name_clean,
                username=email_clean,
                password=temp_pwd
            )
        except Exception as e:
            print(f"[CARRIER CREATION EMAIL ERROR] {e}")

    new_carrier = models.CarrierPartner(
        carrier_name=name_clean,
        contact_phone=phone_clean,
        contact_email=payload.contact_email.strip() if payload.contact_email else None,
        status=payload.status if payload.status is not None else True,
        user_id=created_user.user_id if created_user else None
    )
    db.add(new_carrier)
    db.commit()
    db.refresh(new_carrier)

    # Ensure default formal agreement exists for new carrier partner
    existing_agr = db.query(models.CarrierAgreement).filter(
        models.CarrierAgreement.carrier_id == new_carrier.carrier_id
    ).first()
    if not existing_agr:
        admin_user = db.query(models.User).join(models.Role).filter(models.Role.role_name == "Admin").first()
        new_agr = models.CarrierAgreement(
            agreement_number=f"AGR-RS-2026-00{new_carrier.carrier_id}",
            carrier_id=new_carrier.carrier_id,
            title="RetailSphere Commercial Transportation & Consignment Agreement",
            effective_date=date.today(),
            expiry_date=date.today() + timedelta(days=365),
            services_covered="Ready-Made Furniture Deliveries, Custom Furniture Consignments, Raw Material Inbound Pickups, Post-Fabrication Customer Handover",
            transportation_terms="Guaranteed pickup within 4 hours of dispatch confirmation; GPS route compliance; signature proof of delivery required on delivery completion.",
            settlement_terms="Weekly electronic settlement cycle with consolidated invoice generation. Margin deduction: 10% platform facilitation fee.",
            coverage_area="All Regional Logistics Routes",
            base_payout_rate=100.0,
            per_km_payout_rate=15.0,
            status="ACTIVE",
            created_by_id=admin_user.user_id if admin_user else None
        )
        db.add(new_agr)
        db.commit()

    return new_carrier


@router.put("/carriers/{carrier_id}")
def update_carrier_partner(carrier_id: int, payload: schemas.CarrierPartnerUpdate, db: Session = Depends(get_db)):
    carrier = db.query(models.CarrierPartner).filter(models.CarrierPartner.carrier_id == carrier_id).first()
    if not carrier:
        raise HTTPException(status_code=404, detail="Carrier partner not found.")

    if payload.carrier_name is not None and payload.carrier_name.strip():
        carrier.carrier_name = payload.carrier_name.strip()
    if payload.contact_phone is not None and payload.contact_phone.strip():
        carrier.contact_phone = payload.contact_phone.strip()
    if payload.contact_email is not None:
        carrier.contact_email = payload.contact_email.strip() if payload.contact_email else None
    if payload.status is not None:
        carrier.status = payload.status

    # Synchronize linked User account
    if carrier.contact_email and carrier.contact_email.strip():
        email_clean = carrier.contact_email.strip().lower()
        carrier_role = db.query(models.Role).filter(
            (models.Role.role_name == "Carrier Partner") |
            (models.Role.role_name == "CARRIER_PARTNER")
        ).first()
        if not carrier_role:
            carrier_role = models.Role(role_name="Carrier Partner")
            db.add(carrier_role)
            db.commit()
            db.refresh(carrier_role)

        if carrier.user_id:
            user = db.query(models.User).filter(models.User.user_id == carrier.user_id).first()
            if user:
                user.email = email_clean
                user.full_name = carrier.carrier_name
                user.phone = carrier.contact_phone
                user.role_id = carrier_role.role_id
                db.commit()
        else:
            existing_u = db.query(models.User).filter(models.User.email == email_clean).first()
            if not existing_u:
                temp_pwd = generate_strong_password(12)
                hashed_pwd = auth.get_password_hash(temp_pwd)
                new_u = models.User(
                    role_id=carrier_role.role_id,
                    full_name=carrier.carrier_name,
                    email=email_clean,
                    phone=carrier.contact_phone,
                    password=hashed_pwd,
                    status=True,
                    must_change_password=True
                )
                db.add(new_u)
                db.commit()
                db.refresh(new_u)
                carrier.user_id = new_u.user_id
            else:
                existing_u.role_id = carrier_role.role_id
                existing_u.full_name = carrier.carrier_name
                existing_u.phone = carrier.contact_phone
                carrier.user_id = existing_u.user_id

    db.commit()
    db.refresh(carrier)
    return carrier


@router.post("/carriers/{carrier_id}/resend-credentials")
def resend_carrier_credentials(carrier_id: int, db: Session = Depends(get_db)):
    carrier = db.query(models.CarrierPartner).filter(models.CarrierPartner.carrier_id == carrier_id).first()
    if not carrier:
        raise HTTPException(status_code=404, detail="Carrier partner not found.")

    if not carrier.contact_email or not carrier.contact_email.strip():
        raise HTTPException(status_code=400, detail="Carrier partner has no registered contact email.")

    email_clean = carrier.contact_email.strip().lower()
    carrier_role = db.query(models.Role).filter(
        (models.Role.role_name == "Carrier Partner") |
        (models.Role.role_name == "CARRIER_PARTNER")
    ).first()
    if not carrier_role:
        carrier_role = models.Role(role_name="Carrier Partner")
        db.add(carrier_role)
        db.commit()
        db.refresh(carrier_role)

    temp_pwd = generate_strong_password(12)
    hashed_pwd = auth.get_password_hash(temp_pwd)

    user = None
    if carrier.user_id:
        user = db.query(models.User).filter(models.User.user_id == carrier.user_id).first()

    if not user:
        user = db.query(models.User).filter(models.User.email == email_clean).first()

    if not user:
        user = models.User(
            role_id=carrier_role.role_id,
            full_name=carrier.carrier_name,
            email=email_clean,
            phone=carrier.contact_phone,
            password=hashed_pwd,
            status=True,
            must_change_password=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        carrier.user_id = user.user_id
    else:
        user.email = email_clean
        user.full_name = carrier.carrier_name
        user.phone = carrier.contact_phone
        user.password = hashed_pwd
        user.role_id = carrier_role.role_id
        user.must_change_password = True
        carrier.user_id = user.user_id
        db.commit()

    email_sent = False
    try:
        email_sent = send_carrier_credentials_email(
            to_email=email_clean,
            carrier_name=carrier.carrier_name,
            username=email_clean,
            password=temp_pwd
        )
    except Exception as e:
        print(f"[RESEND CARRIER CREDENTIALS ERROR] {e}")

    return {
        "success": True,
        "email_sent": email_sent,
        "message": f"Login credentials successfully sent to {email_clean}."
    }


@router.delete("/carriers/{carrier_id}")
def delete_carrier_partner(carrier_id: int, db: Session = Depends(get_db)):
    carrier = db.query(models.CarrierPartner).filter(models.CarrierPartner.carrier_id == carrier_id).first()
    db.delete(carrier)
    db.commit()
    return {"message": f"Carrier partner #{carrier_id} deleted successfully."}


# --- CARRIER DELIVERY PERSONNEL MANAGEMENT (ADMIN) ---

@router.get("/carrier-personnel")
def list_all_carrier_personnel(db: Session = Depends(get_db)):
    personnel_list = db.query(models.DeliveryPersonnel).order_by(models.DeliveryPersonnel.personnel_id.asc()).all()
    result = []
    for p in personnel_list:
        carrier = p.carrier_partner
        # Count assigned tasks
        fulfillments = db.query(models.OrderFulfillment).filter(
            models.OrderFulfillment.assigned_personnel_id == p.personnel_id
        ).all()

        active_count = sum(1 for f in fulfillments if (f.fulfillment_status or '').lower() not in ['delivered', 'cancelled'])
        completed_count = sum(1 for f in fulfillments if (f.fulfillment_status or '').lower() == 'delivered')

        result.append({
            "personnel_id": p.personnel_id,
            "carrier_id": p.carrier_id,
            "carrier_name": carrier.carrier_name if carrier else "Unknown Carrier",
            "name": p.name,
            "phone": p.phone,
            "email": p.email or (p.user.email if p.user else None),
            "vehicle_type": p.vehicle_type or "Mini Truck",
            "vehicle_reg": p.vehicle_reg or "—",
            "status": p.status or "ACTIVE",
            "notes": p.notes,
            "user_id": p.user_id,
            "active_tasks_count": active_count,
            "completed_tasks_count": completed_count,
            "total_tasks_count": len(fulfillments),
            "created_at": p.created_at.isoformat() if p.created_at else None
        })
    return result


@router.post("/carrier-personnel/{personnel_id}/resend-credentials")
def resend_personnel_credentials_admin(personnel_id: int, db: Session = Depends(get_db)):
    personnel = db.query(models.DeliveryPersonnel).filter(models.DeliveryPersonnel.personnel_id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Delivery personnel not found.")

    target_email = personnel.email or (personnel.user.email if personnel.user else None)
    if not target_email:
        raise HTTPException(status_code=400, detail="Personnel has no registered email address.")

    carrier_name = personnel.carrier_partner.carrier_name if personnel.carrier_partner else "3PL Carrier Partner"
    temp_pwd = generate_strong_password(12)
    hashed_pwd = auth.get_password_hash(temp_pwd)

    if personnel.user:
        personnel.user.password = hashed_pwd
        personnel.user.must_change_password = True
    else:
        # Resolve Role
        p_role = db.query(models.Role).filter(
            (models.Role.role_name.ilike("%Delivery Personnel%")) |
            (models.Role.role_name.ilike("%Driver%"))
        ).first()
        new_u = models.User(
            role_id=p_role.role_id if p_role else 7,
            full_name=personnel.name,
            email=target_email.strip().lower(),
            phone=personnel.phone,
            password=hashed_pwd,
            status=True,
            must_change_password=True
        )
        db.add(new_u)
        db.commit()
        db.refresh(new_u)
        personnel.user_id = new_u.user_id

    db.commit()

    from app.email_utils import send_delivery_personnel_credentials_email
    email_sent = send_delivery_personnel_credentials_email(
        to_email=target_email.strip().lower(),
        personnel_name=personnel.name,
        carrier_agency_name=carrier_name,
        vehicle_info=f"{personnel.vehicle_type or 'Mini Truck'} ({personnel.vehicle_reg or 'KL-05-AT-4482'})",
        password=temp_pwd
    )

    if not email_sent:
        return {
            "success": True,
            "message": f"Password reset to '{temp_pwd}' (Email dispatch could not reach SMTP inbox)."
        }

    return {
        "success": True,
        "message": f"New credentials successfully emailed to {target_email}!"
    }


@router.put("/carrier-personnel/{personnel_id}/status")
def toggle_personnel_status_admin(personnel_id: int, payload: dict, db: Session = Depends(get_db)):
    personnel = db.query(models.DeliveryPersonnel).filter(models.DeliveryPersonnel.personnel_id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=404, detail="Delivery personnel not found.")

    new_st = payload.get("status", "ACTIVE")
    personnel.status = new_st
    if personnel.user:
        personnel.user.status = (new_st == "ACTIVE")
    db.commit()
    return {"success": True, "message": f"Personnel status updated to '{new_st}'.", "status": new_st}



# --- CARRIER AGREEMENTS MANAGEMENT ---

class AgreementCreatePayload(BaseModel):
    carrier_id: int
    title: str
    effective_date: str
    expiry_date: str
    services_covered: str
    transportation_terms: str
    settlement_terms: str
    coverage_area: Optional[str] = "All Regional Kerala Districts"
    base_payout_rate: Optional[float] = 100.0
    per_km_payout_rate: Optional[float] = 15.0


@router.get("/carrier-agreements")
def list_carrier_agreements(db: Session = Depends(get_db)):
    agreements = (
        db.query(models.CarrierAgreement)
        .options(joinedload(models.CarrierAgreement.carrier_partner))
        .order_by(models.CarrierAgreement.agreement_id.desc())
        .all()
    )
    result = []
    for a in agreements:
        c = a.carrier_partner
        result.append({
            "agreement_id": a.agreement_id,
            "agreement_number": a.agreement_number,
            "carrier_id": a.carrier_id,
            "carrier_name": c.carrier_name if c else "Unknown Carrier",
            "title": a.title,
            "effective_date": a.effective_date.isoformat() if a.effective_date else None,
            "expiry_date": a.expiry_date.isoformat() if a.expiry_date else None,
            "services_covered": a.services_covered,
            "transportation_terms": a.transportation_terms,
            "settlement_terms": a.settlement_terms,
            "coverage_area": a.coverage_area,
            "base_payout_rate": float(a.base_payout_rate) if a.base_payout_rate else 100.0,
            "per_km_payout_rate": float(a.per_km_payout_rate) if a.per_km_payout_rate else 15.0,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None
        })
    return result


@router.post("/carrier-agreements", status_code=status.HTTP_201_CREATED)
def create_carrier_agreement(payload: AgreementCreatePayload, db: Session = Depends(get_db)):
    carrier = db.query(models.CarrierPartner).filter(models.CarrierPartner.carrier_id == payload.carrier_id).first()
    if not carrier:
        raise HTTPException(status_code=404, detail="Carrier partner not found.")

    eff_date = datetime.strptime(payload.effective_date, "%Y-%m-%d").date() if payload.effective_date else date.today()
    exp_date = datetime.strptime(payload.expiry_date, "%Y-%m-%d").date() if payload.expiry_date else date.today() + timedelta(days=365)

    count_existing = db.query(models.CarrierAgreement).count()
    agr_number = f"AGR-RS-2026-{(count_existing + 1):03d}"

    new_agr = models.CarrierAgreement(
        agreement_number=agr_number,
        carrier_id=carrier.carrier_id,
        title=payload.title.strip(),
        effective_date=eff_date,
        expiry_date=exp_date,
        services_covered=payload.services_covered.strip(),
        transportation_terms=payload.transportation_terms.strip(),
        settlement_terms=payload.settlement_terms.strip(),
        coverage_area=payload.coverage_area.strip() if payload.coverage_area else "Kerala Central Hub Zone",
        base_payout_rate=payload.base_payout_rate or 100.0,
        per_km_payout_rate=payload.per_km_payout_rate or 15.0,
        status="ACTIVE"
    )
    db.add(new_agr)
    db.commit()
    db.refresh(new_agr)

    return new_agr


# --- TRANSPORTATION RATE CARD CONFIGURATION ---

class RateCardUpdatePayload(BaseModel):
    service_type: Optional[str] = "STANDARD_DELIVERY"
    base_charge: float
    rate_per_km: float
    min_charge: Optional[float] = 100.0
    is_active: Optional[bool] = True


@router.get("/rate-cards")
def get_rate_cards(db: Session = Depends(get_db)):
    rate_cards = db.query(models.TransportationRateCard).all()
    if not rate_cards:
        # Seed defaults if empty
        default_cards = [
            models.TransportationRateCard(service_type="STANDARD_DELIVERY", base_charge=100.0, rate_per_km=15.0, min_charge=100.0, is_active=True),
            models.TransportationRateCard(service_type="FABRICATION_PICKUP", base_charge=120.0, rate_per_km=15.0, min_charge=120.0, is_active=True),
            models.TransportationRateCard(service_type="FABRICATION_RETURN", base_charge=120.0, rate_per_km=15.0, min_charge=120.0, is_active=True),
        ]
        db.add_all(default_cards)
        db.commit()
        rate_cards = db.query(models.TransportationRateCard).all()
    return rate_cards


@router.put("/rate-cards/{rate_id}")
def update_rate_card(rate_id: int, payload: RateCardUpdatePayload, db: Session = Depends(get_db)):
    rc = db.query(models.TransportationRateCard).filter(models.TransportationRateCard.rate_id == rate_id).first()
    if not rc:
        raise HTTPException(status_code=404, detail="Rate card not found.")

    rc.base_charge = payload.base_charge
    rc.rate_per_km = payload.rate_per_km
    if payload.min_charge is not None:
        rc.min_charge = payload.min_charge
    if payload.is_active is not None:
        rc.is_active = payload.is_active
    if payload.service_type:
        rc.service_type = payload.service_type

    db.commit()
    db.refresh(rc)
    return rc


# --- TRANSPORTATION DISTANCE & CHARGE CALCULATION PREVIEW ---

class DistanceCalcPayload(BaseModel):
    origin_address: Optional[str] = "RetailSphere Central Hub, Kottayam"
    destination_address: str
    service_type: Optional[str] = "STANDARD_DELIVERY"


@router.post("/calculate-transportation")
def calculate_transportation_endpoint(payload: DistanceCalcPayload, db: Session = Depends(get_db)):
    from app.utils.distance_calculator import compute_transportation_charge
    orig = payload.origin_address or "RetailSphere Central Hub, Kottayam"
    dest = payload.destination_address
    if not dest or not dest.strip():
        raise HTTPException(status_code=400, detail="Destination address is required for distance calculation.")

    calc_result = compute_transportation_charge(
        db=db,
        origin_address=orig.strip(),
        destination_address=dest.strip(),
        service_type=payload.service_type or "STANDARD_DELIVERY"
    )
    return calc_result


# --- CARRIER SETTLEMENTS VIEW ---

@router.get("/carrier-settlements")
def list_admin_carrier_settlements(db: Session = Depends(get_db)):
    settlements = (
        db.query(models.CarrierSettlement)
        .options(joinedload(models.CarrierSettlement.carrier_partner))
        .order_by(models.CarrierSettlement.settlement_id.desc())
        .all()
    )
    result = []
    for s in settlements:
        c = s.carrier_partner
        result.append({
            "settlement_id": s.settlement_id,
            "carrier_id": s.carrier_id,
            "carrier_name": c.carrier_name if c else "Carrier Agency",
            "order_type": s.order_type,
            "order_id": s.order_id,
            "distance_km": float(s.distance_km) if s.distance_km else 0.0,
            "customer_charge": float(s.customer_charge) if s.customer_charge else 0.0,
            "carrier_payout": float(s.carrier_payout) if s.carrier_payout else 0.0,
            "service_margin": float(s.service_margin) if s.service_margin else 0.0,
            "settlement_status": s.settlement_status,
            "notes": s.notes,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "settled_at": s.settled_at.isoformat() if s.settled_at else None
        })
    return result


@router.put("/carrier-settlements/{settlement_id}/status")
def update_settlement_status(settlement_id: int, payload: dict, db: Session = Depends(get_db)):
    s = db.query(models.CarrierSettlement).filter(models.CarrierSettlement.settlement_id == settlement_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Settlement record not found.")

    new_st = payload.get("status", "SETTLED")
    s.settlement_status = new_st
    if new_st == "SETTLED":
        s.settled_at = datetime.utcnow()
    db.commit()
    db.refresh(s)
    return {"message": f"Settlement #{settlement_id} status updated to {new_st}", "settlement": s}


# --- REVIEWS & CUSTOMER FEEDBACK VIEW & MODERATION ---

@router.get("/reviews")
def list_admin_product_reviews(db: Session = Depends(get_db)):
    reviews = db.query(models.Review).order_by(models.Review.review_date.desc()).all()
    results = []
    for r in reviews:
        c_name = "Valued Customer"
        c_email = ""
        if r.customer and r.customer.user:
            c_name = r.customer.user.full_name or r.customer.user.username
            c_email = r.customer.user.email or ""
        
        prod = r.product
        results.append({
            "review_id": r.review_id,
            "product_id": r.product_id,
            "product_name": prod.product_name if prod else f"Product #{r.product_id}",
            "product_image": prod.images[0].image_url if (prod and prod.images) else None,
            "product_category": prod.category.category_name if (prod and prod.category) else "Furniture",
            "customer_id": r.customer_id,
            "customer_name": c_name,
            "customer_email": c_email,
            "rating": r.rating,
            "review": r.review or "",
            "review_date": r.review_date.isoformat() if r.review_date else None,
            "verified_purchase": True
        })
    return results


@router.delete("/reviews/{review_id}")
def delete_admin_product_review(review_id: int, db: Session = Depends(get_db)):
    r = db.query(models.Review).filter(models.Review.review_id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found.")
    db.delete(r)
    db.commit()
    return {"message": f"Review #{review_id} removed successfully."}


# --- DRIVER / PERSONNEL EMAIL CHANGE REQUESTS ---

@router.get("/personnel-email-change-requests")
def list_admin_personnel_email_change_requests(db: Session = Depends(get_db)):
    requests = db.query(models.PersonnelEmailChangeRequest).order_by(models.PersonnelEmailChangeRequest.request_id.desc()).all()
    results = []
    for r in requests:
        results.append({
            "request_id": r.request_id,
            "personnel_id": r.personnel_id,
            "personnel_name": r.personnel.name if r.personnel else f"Driver #{r.personnel_id}",
            "carrier_id": r.carrier_id,
            "carrier_name": r.carrier.carrier_name if r.carrier else "Carrier Partner",
            "current_email": r.current_email,
            "requested_email": r.requested_email,
            "reason": r.reason,
            "status": r.status,
            "rejection_reason": r.rejection_reason,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None
        })
    return results


@router.put("/personnel-email-change-requests/{request_id}/review")
def review_admin_personnel_email_change_request(request_id: int, payload: dict, db: Session = Depends(get_db)):
    req_obj = db.query(models.PersonnelEmailChangeRequest).filter(models.PersonnelEmailChangeRequest.request_id == request_id).first()
    if not req_obj:
        raise HTTPException(status_code=404, detail="Request not found.")
    
    action = payload.get("action", "").upper()
    if action not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="Action must be APPROVE or REJECT.")
    
    if action == "APPROVE":
        target_email = req_obj.requested_email.strip().lower()
        existing = db.query(models.User).filter(models.User.email == target_email).first()
        personnel = req_obj.personnel
        if existing and (not personnel or existing.user_id != personnel.user_id):
            raise HTTPException(status_code=400, detail="Target email is already used by another account.")
        
        if personnel:
            personnel.email = target_email
            if personnel.user:
                personnel.user.email = target_email
                if personnel.user.username == req_obj.current_email:
                    personnel.user.username = target_email
        
        req_obj.status = "APPROVED"
        req_obj.updated_at = datetime.utcnow()
        db.commit()
        return {"message": f"Driver email updated to {target_email} successfully.", "status": "APPROVED"}
    else:
        req_obj.status = "REJECTED"
        req_obj.rejection_reason = payload.get("rejection_reason", "Declined by Administrator.")
        req_obj.updated_at = datetime.utcnow()
        db.commit()
        return {"message": "Email change request rejected.", "status": "REJECTED"}


# --- ORDER CANCELLATIONS LEDGER ---

@router.get("/cancellations")
def list_admin_order_cancellations(db: Session = Depends(get_db)):
    cancellations = db.query(models.OrderCancellation).order_by(models.OrderCancellation.cancelled_at.desc()).all()
    results = []
    for c in cancellations:
        ord_obj = c.order
        cust = ord_obj.customer if ord_obj else None
        cust_user = cust.user if cust else None
        results.append({
            "cancellation_id": c.cancellation_id,
            "order_id": c.order_id,
            "order_number": f"RET-{c.order_id:06d}",
            "customer_name": cust_user.full_name if cust_user else (ord_obj.customer_name if ord_obj else "Customer"),
            "customer_email": cust_user.email if cust_user else (ord_obj.customer_email if ord_obj else ""),
            "total_amount": float(ord_obj.total_amount) if ord_obj and ord_obj.total_amount else 0.0,
            "payment_status": ord_obj.payment_status if ord_obj else "Cancelled",
            "cancelled_by_role": c.cancelled_by_role or "Customer",
            "reason": c.reason or "Customer cancellation request",
            "cancelled_at": c.cancelled_at.isoformat() if c.cancelled_at else None
        })
    return results


# --- AI EXECUTION & INTELLIGENCE LOGS ---

@router.get("/ai-logs")
def list_admin_ai_execution_logs(limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(models.AIAnalysisLog).order_by(models.AIAnalysisLog.created_at.desc()).limit(limit).all()
    return [
        {
            "log_id": l.log_id,
            "analysis_type": l.analysis_type,
            "input_payload": l.input_payload,
            "output_result": l.output_result,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]










