from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, Union, List
from datetime import datetime, date
import string
import secrets
import random

from app.database import get_db
from app import models, auth
from app.email_utils import send_staff_credentials_email

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

class StaffCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role_name: str  # "Retail Staff", "Production Staff", or "Artisan Worker"
    password: Optional[str] = None
    skill_name: Optional[str] = "Woodwork & Carpentry"
    proficiency_level: Optional[str] = "Expert"

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
        models.User.full_name != "admin"
    ).order_by(models.User.user_id.asc()).all()
    
    result = []
    for u in users:
        raw_role = u.role.role_name if u.role else "Retail Staff"
        role_name = "Artisan Worker" if raw_role in ["Worker", "Artisan Worker"] else raw_role
        result.append({
            "id": f"st-{u.user_id}",
            "user_id": u.user_id,
            "name": u.full_name,
            "email": u.email,
            "phone": u.phone or "+91 98765 43210",
            "role": role_name,
            "skill": u.specialization or ("Woodwork & Carpentry" if role_name == "Artisan Worker" else None),
            "is_driver": bool(u.is_driver),
            "status": "Active" if u.status else "Inactive",
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
    admin_role = db.query(models.Role).filter(models.Role.role_name == "Admin").first()
    admin_role_id = admin_role.role_id if admin_role else None
    
    query = db.query(models.User).filter(
        models.User.email != "admin@retailsphere.com",
        models.User.full_name != "admin"
    )
    if admin_role_id:
        query = query.filter(models.User.role_id != admin_role_id)
        
    users = query.order_by(models.User.user_id.asc()).all()
    
    result = []
    for u in users:
        role_name = u.role.role_name if u.role else "Customer"
        result.append({
            "id": f"usr-{u.user_id}",
            "user_id": u.user_id,
            "full_name": u.full_name,
            "name": u.full_name,
            "email": u.email,
            "phone": u.phone or "+91 98765 43210",
            "role_name": role_name,
            "role": role_name,
            "is_driver": bool(u.is_driver),
            "status": u.status,
            "status_text": "Active" if u.status else "Inactive",
            "created_at": u.created_at.strftime("%Y-%m-%d") if u.created_at else "Recent",
            "dateAdded": u.created_at.strftime("%Y-%m-%d") if u.created_at else "Recent"
        })
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

@router.get("/inventory")
def list_inventory(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
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
            "image_url": first_img or "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"
        })

    return res

@router.post("/inventory", status_code=status.HTTP_201_CREATED)
def add_inventory_product(payload: ProductCreatePayload, db: Session = Depends(get_db)):
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
            "title": n.title,
            "message": n.message,
            "time": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else "",
            "unread": not n.is_read
        })
    return res


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
    db_orders = db.query(models.ReadymadeOrder).order_by(models.ReadymadeOrder.order_id.desc()).all()
    res = []
    for r in db_orders:
        cust_name = r.customer_name
        cust_email = r.customer_email
        if (not cust_name or not cust_email) and r.customer_id:
            c = db.query(models.Customer).filter(models.Customer.customer_id == r.customer_id).first()
            if c and c.user:
                cust_name = cust_name or c.user.full_name
                cust_email = cust_email or c.user.email

        items_list = []
        for i in r.items:
            img = i.image_url
            sku_code = "SKU-RS-STORE"
            if i.product_id:
                p = db.query(models.Product).filter(models.Product.product_id == i.product_id).first()
                if p:
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
        
        res.append({
            "orderId": f"RET-{r.order_id:06d}",
            "customerId": r.customer_id,
            "customerName": cust_name or "Valued Customer",
            "email": cust_email or "customer@retailsphere.com",
            "itemsCount": sum(i.quantity for i in r.items) if r.items else 1,
            "totalAmount": float(r.total_amount or 0),
            "orderStatus": r.order_status or "Order Placed",
            "completionStatus": getattr(r, "completion_status", None) or r.order_status or "Order Placed",
            "paymentStatus": r.payment_status or "Paid",
            "paymentId": r.payment_id,
            "orderDate": r.order_date.strftime("%b %d, %Y") if r.order_date else "Recent",
            "createdAt": int(r.order_date.timestamp() * 1000) if r.order_date else 0,
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
            customer = db.query(models.Customer).filter(models.Customer.customer_id == int(clean_c_id)).first()

    if not customer:
        customer = db.query(models.Customer).first()

    cust_id = customer.customer_id if customer else None

    created_orders = []

    try:
        if not payload.items:
            item_total = payload.totalAmount
            new_order = models.ReadymadeOrder(
                customer_id=cust_id,
                customer_name=payload.customerName.strip(),
                customer_email=payload.email.strip(),
                total_amount=item_total,
                payment_status=payload.paymentStatus.strip() or "Paid",
                payment_id=payload.paymentId.strip() if payload.paymentId else None,
                order_status="Order Placed",
                delivery_address="Ettumanoor, Kottayam, Kerala 686631"
            )
            db.add(new_order)
            db.flush()
            created_orders.append(new_order)
        else:
            # Create a separate, itemized order for EACH item in cart
            for idx, item in enumerate(payload.items):
                item_price = float(item.price or 0)
                item_qty = int(item.quantity or 1)
                item_total = item_price * item_qty

                prod_id = None
                raw_id_str = str(item.id).replace('inv-', '').replace('rec-', '').replace('item-', '')
                if raw_id_str.isdigit():
                    prod_id = int(raw_id_str)

                item_pay_id = payload.paymentId
                if len(payload.items) > 1 and item_pay_id:
                    item_pay_id = f"{item_pay_id}_{idx+1}"

                new_order = models.ReadymadeOrder(
                    customer_id=cust_id,
                    customer_name=payload.customerName.strip(),
                    customer_email=payload.email.strip(),
                    total_amount=item_total,
                    payment_status=payload.paymentStatus.strip() or "Paid",
                    payment_id=item_pay_id,
                    order_status="Order Placed",
                    delivery_address="Ettumanoor, Kottayam, Kerala 686631"
                )
                db.add(new_order)
                db.flush()

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
                    amount=item_total,
                    payment_method="Razorpay",
                    transaction_id=item_pay_id or f"PAY-RET-{new_order.order_id}-{int(time.time())}",
                    payment_status=payload.paymentStatus.strip() or "Paid"
                )
                db.add(new_payment)
                created_orders.append(new_order)

        # Single Atomic Commit for entire checkout batch
        db.commit()

        for o in created_orders:
            db.refresh(o)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order creation failed: {str(e)}"
        )

    first_ord = created_orders[0]
    return {
        "message": "Order(s) placed and stored successfully in database",
        "orderId": f"RET-{first_ord.order_id:06d}",
        "order_id": first_ord.order_id,
        "createdCount": len(created_orders)
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


@router.get("/dashboard-summary")
def get_admin_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify Admin Authorization
    if current_user.role and current_user.role.role_name not in ["Admin", "System Admin"]:
        if current_user.email != "admin@retailsphere.com":
            raise HTTPException(status_code=403, detail="Admin authorization required.")

    readymade_orders = db.query(models.ReadymadeOrder).all()
    custom_orders = db.query(models.CustomOrder).all()
    fabrication_requests = db.query(models.FabricationRequest).all()
    service_requests = db.query(models.ServiceRequest).all()

    total_orders_count = len(readymade_orders) + len(custom_orders)
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders_count = sum(1 for o in readymade_orders if o.order_date and o.order_date >= today_start) + \
                         sum(1 for c in custom_orders if c.order_date and c.order_date >= today_start)

    pending_orders_count = sum(1 for o in readymade_orders if o.order_status not in ["Delivered", "Cancelled"]) + \
                           sum(1 for c in custom_orders if c.order_status not in ["Completed", "Delivered", "Cancelled"])

    completed_orders_count = sum(1 for o in readymade_orders if o.order_status == "Delivered") + \
                             sum(1 for c in custom_orders if c.order_status in ["Completed", "Delivered"])

    cancelled_orders_count = sum(1 for o in readymade_orders if o.order_status == "Cancelled") + \
                             sum(1 for c in custom_orders if c.order_status == "Cancelled")

    return_requests_count = db.query(models.OrderReturn).count()

    total_customers_count = db.query(models.Customer).count()
    active_customers_count = db.query(models.User).filter(models.User.status == True).count()
    total_products_count = db.query(models.Product).count()
    low_stock_products_count = db.query(models.Product).filter(models.Product.stock_quantity < 5).count()

    # Revenue Metrics (from paid tbl_payment records)
    payments = db.query(models.Payment).filter(models.Payment.payment_status == "Paid").all()
    total_revenue = sum(float(p.amount or 0) for p in payments)

    today_revenue = sum(float(p.amount or 0) for p in payments if p.payment_date and p.payment_date >= today_start)
    
    month_start = today_start.replace(day=1)
    month_revenue = sum(float(p.amount or 0) for p in payments if p.payment_date and p.payment_date >= month_start)

    paid_orders_count = len(payments)
    pending_payments_count = sum(1 for o in readymade_orders if o.payment_status in ["Pending", "UNPAID"]) + \
                             sum(1 for c in custom_orders if c.payment_status in ["Pending", "UNPAID"]) + \
                             sum(1 for f in fabrication_requests if f.payment_status in ["Pending", "UNPAID"]) + \
                             sum(1 for s in service_requests if s.payment_status in ["Pending", "UNPAID"])

    returns_paid = db.query(models.OrderReturn).filter(models.OrderReturn.refund_status == "Refunded").all()
    refunds_total_amount = sum(float(r.refund_amount or 0) for r in returns_paid)

    cancelled_readymade = db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_status == "Cancelled").all()
    cancelled_custom = db.query(models.CustomOrder).filter(models.CustomOrder.order_status == "Cancelled").all()
    cancelled_order_value = sum(float(r.total_amount or 0) for r in cancelled_readymade) + \
                            sum(float(c.estimated_price or 0) for c in cancelled_custom)

    order_overview = {
        "readymade": len(readymade_orders),
        "customization": len(custom_orders),
        "fabrication": len(fabrication_requests),
        "onsite_services": len(service_requests)
    }

    order_status_counts = {
        "Placed": sum(1 for o in readymade_orders if o.order_status in ["Placed", "Order Placed"]),
        "Confirmed": sum(1 for o in readymade_orders if o.order_status == "Confirmed"),
        "Processing": sum(1 for o in readymade_orders if o.order_status in ["Processing", "In Production"]),
        "Packing": sum(1 for o in readymade_orders if o.order_status == "Packing"),
        "Packed": sum(1 for o in readymade_orders if o.order_status == "Packed"),
        "Dispatched": sum(1 for o in readymade_orders if o.order_status == "Dispatched"),
        "Out for Delivery": sum(1 for o in readymade_orders if o.order_status == "Out for Delivery"),
        "Delivered": sum(1 for o in readymade_orders if o.order_status == "Delivered"),
        "Cancelled": sum(1 for o in readymade_orders if o.order_status == "Cancelled"),
        "Returned": sum(1 for o in readymade_orders if o.order_status == "Returned")
    }

    custom_pipeline_counts = {
        "request": sum(1 for c in custom_orders if (c.review_status or 'NEW') in ["NEW", "UNDER_REVIEW"]),
        "retail_review": sum(1 for c in custom_orders if c.review_status == "APPROVED"),
        "technical_assessment": sum(1 for c in custom_orders if c.order_status == "Technical Assessment"),
        "quotation": sum(1 for c in custom_orders if c.order_status == "Quotation Sent"),
        "customer_approval": sum(1 for c in custom_orders if c.order_status == "Quotation Approved"),
        "payment": sum(1 for c in custom_orders if c.payment_status == "Pending" and c.order_status in ["Quotation Approved", "Awaiting Payment"]),
        "production": sum(1 for c in custom_orders if c.order_status == "In Production"),
        "qc": sum(1 for c in custom_orders if c.order_status == "QC Pending"),
        "completed": sum(1 for c in custom_orders if c.order_status in ["Completed", "Delivered"])
    }

    assessments_pending = sum(1 for c in custom_orders if c.order_status in ["NEW", "APPROVED", "Pending Assessment"]) + \
                          sum(1 for f in fabrication_requests if f.status in ["REQUESTED", "ASSESSED"])
    
    quotations_pending = sum(1 for c in custom_orders if c.order_status == "Quotation Pending") + \
                         sum(1 for f in fabrication_requests if f.status == "ASSESSED")

    customer_approvals_pending = sum(1 for c in custom_orders if c.order_status == "Quotation Sent") + \
                                sum(1 for f in fabrication_requests if f.status == "QUOTED")

    materials_pending = sum(1 for c in custom_orders if c.order_status == "Material Pending") + \
                        sum(1 for f in fabrication_requests if f.status == "APPROVED" and f.material_source == "Customer-Owned")

    in_production_count = sum(1 for c in custom_orders if c.order_status == "In Production") + \
                          sum(1 for f in fabrication_requests if f.status == "IN_PRODUCTION")

    qc_pending_count = sum(1 for c in custom_orders if c.order_status == "QC Pending") + \
                       sum(1 for f in fabrication_requests if f.status == "QC_PENDING")

    rework_count = db.query(models.ReworkJob).filter(models.ReworkJob.status != "RESOLVED").count()
    completed_today_count = sum(1 for c in custom_orders if c.order_status == "Completed" and c.order_date >= today_start)

    production_status_summary = {
        "technical_assessment": assessments_pending,
        "quotation_pending": quotations_pending,
        "customer_approval": customer_approvals_pending,
        "payment_pending": pending_payments_count,
        "material_pending": materials_pending,
        "in_production": in_production_count,
        "qc_pending": qc_pending_count,
        "rework": rework_count,
        "completed_today": completed_today_count
    }

    worker_role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
    worker_role_id = worker_role.role_id if worker_role else None
    
    if worker_role_id:
        workers = db.query(models.User).filter(models.User.role_id == worker_role_id).all()
    else:
        workers = []

    availabilities = db.query(models.WorkerAvailability).all()
    avail_map = {a.worker_id: a.status for a in availabilities}

    worker_status_counts = {
        "available": sum(1 for w in workers if avail_map.get(w.user_id, "AVAILABLE") == "AVAILABLE"),
        "busy": sum(1 for w in workers if avail_map.get(w.user_id) == "BUSY"),
        "on_site": sum(1 for w in workers if avail_map.get(w.user_id) == "ON_SITE"),
        "offline": sum(1 for w in workers if avail_map.get(w.user_id) in ["OFF_DUTY", "OFFLINE", "INACTIVE"])
    }

    worker_skills = db.query(models.WorkerSkill).all()
    skill_counts = {
        "Woodwork & Carpentry": sum(1 for s in worker_skills if "Wood" in s.skill_name or "Carpen" in s.skill_name),
        "Upholstery": sum(1 for s in worker_skills if "Upholster" in s.skill_name),
        "Assembly": sum(1 for s in worker_skills if "Assembl" in s.skill_name),
        "Surface Finishing": sum(1 for s in worker_skills if "Finish" in s.skill_name or "Polish" in s.skill_name)
    }

    alerts = []
    for c in custom_orders:
        if c.order_status == "In Production" and c.order_date and (datetime.utcnow() - c.order_date).days > 5:
            alerts.append({
                "id": f"alert-delay-{c.custom_order_id}",
                "severity": "URGENT",
                "title": f"Production Delay on Custom Order #{c.custom_order_id}",
                "description": f"Order for {c.furniture_type} has been in production for over 5 days.",
                "type": "delay"
            })

    failed_inspections = db.query(models.QualityInspection).filter(models.QualityInspection.result == "FAIL").order_by(models.QualityInspection.inspection_id.desc()).limit(3).all()
    for qc in failed_inspections:
        alerts.append({
            "id": f"alert-qc-{qc.inspection_id}",
            "severity": "URGENT",
            "title": f"QC Failure on {qc.order_type} Order #{qc.order_id}",
            "description": f"Notes: {qc.inspection_notes or 'Quality checklist inspection failed.'}",
            "type": "qc_failure"
        })

    low_stock_prods = db.query(models.Product).filter(models.Product.stock_quantity < 5).all()
    for p in low_stock_prods[:3]:
        alerts.append({
            "id": f"alert-stock-{p.product_id}",
            "severity": "LOW_STOCK",
            "title": f"Low Stock Warning: {p.product_name}",
            "description": f"Current inventory: {p.stock_quantity} units (Threshold: 5 units).",
            "type": "low_stock"
        })

    audit_logs = db.query(models.AuditLog).order_by(models.AuditLog.audit_id.desc()).limit(15).all()
    activities = []
    for log in audit_logs:
        activities.append({
            "id": log.audit_id,
            "actorName": log.actor_name or "System Admin",
            "actorRole": log.actor_role or "Admin",
            "action": log.action,
            "entityType": log.entity_type,
            "entityId": log.entity_id or "",
            "details": log.details or "",
            "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else ""
        })

    return {
        "business_metrics": {
            "total_orders": total_orders_count,
            "todays_orders": today_orders_count,
            "pending_orders": pending_orders_count,
            "completed_orders": completed_orders_count,
            "cancelled_orders": cancelled_orders_count,
            "return_requests": return_requests_count,
            "total_customers": total_customers_count,
            "active_customers": active_customers_count,
            "total_products": total_products_count,
            "low_stock_items": low_stock_products_count
        },
        "revenue_metrics": {
            "total_revenue": total_revenue,
            "todays_revenue": today_revenue,
            "this_month_revenue": month_revenue,
            "paid_orders_count": paid_orders_count,
            "pending_payments_count": pending_payments_count,
            "refunds_total_amount": refunds_total_amount,
            "cancelled_order_value": cancelled_order_value
        },
        "order_overview": order_overview,
        "order_status_counts": order_status_counts,
        "custom_pipeline_counts": custom_pipeline_counts,
        "production_status_summary": production_status_summary,
        "worker_overview": {
            "total_workers": len(workers),
            "status_counts": worker_status_counts,
            "skill_counts": skill_counts
        },
        "alerts": alerts,
        "recent_activities": activities
    }


@router.get("/analytics/revenue")
def get_revenue_analytics(
    period: str = "30days",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    payments = db.query(models.Payment).filter(models.Payment.payment_status == "Paid").all()
    
    total_paid_amount = sum(float(p.amount or 0) for p in payments)
    paid_count = len(payments)
    avg_order_val = total_paid_amount / paid_count if paid_count > 0 else 0.0

    returns_paid = db.query(models.OrderReturn).filter(models.OrderReturn.refund_status == "Refunded").all()
    refund_amount = sum(float(r.refund_amount or 0) for r in returns_paid)

    # Time series breakdown
    revenue_chart = []
    for p in sorted(payments, key=lambda x: x.payment_date or datetime.min)[-10:]:
        revenue_chart.append({
            "date": p.payment_date.strftime("%d %b") if p.payment_date else "Recent",
            "amount": float(p.amount or 0),
            "orderType": p.order_type
        })

    return {
        "period": period,
        "total_revenue": total_paid_amount,
        "order_count": paid_count,
        "average_order_value": round(avg_order_val, 2),
        "paid_amount": total_paid_amount,
        "refund_amount": refund_amount,
        "chart_data": revenue_chart
    }


@router.get("/pipeline/bottlenecks")
def get_production_bottlenecks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
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
    customs = db.query(models.CustomOrder).all()
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






