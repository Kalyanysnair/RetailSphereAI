from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
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
    role_name: str  # "Retail Staff" or "Production Staff"
    password: Optional[str] = None

@router.post("/create-staff", status_code=status.HTTP_201_CREATED)
def create_staff(payload: StaffCreateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    role_clean = payload.role_name.strip()
    if role_clean not in ["Retail Staff", "Production Staff"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'Retail Staff' or 'Production Staff'"
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

    # Get or create Role
    role = db.query(models.Role).filter(models.Role.role_name == role_clean).first()
    if not role:
        role = models.Role(role_name=role_clean)
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
    except Exception as err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create staff member. Email or phone number is already registered."
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
    staff_roles = db.query(models.Role).filter(models.Role.role_name.in_(["Retail Staff", "Production Staff"])).all()
    role_ids = [r.role_id for r in staff_roles]

    users = db.query(models.User).filter(models.User.role_id.in_(role_ids)).all()
    
    result = []
    for u in users:
        result.append({
            "id": f"st-{u.user_id}",
            "user_id": u.user_id,
            "name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role.role_name if u.role else "Staff",
            "status": "Active" if u.status else "Inactive",
            "dateAdded": u.created_at.strftime("%Y-%m-%d")
        })
    return result

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
    material: str
    price: float
    stock_count: int
    image_url: Optional[str] = None
    color: Optional[str] = "Natural"

class StockUpdatePayload(BaseModel):
    stock_count: Optional[int] = None
    name: Optional[str] = None
    price: Optional[float] = None
    material: Optional[str] = None
    color: Optional[str] = None

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

        res.append({
            "id": f"inv-{p.product_id}",
            "product_id": p.product_id,
            "name": p.product_name,
            "category": p.category.category_name if p.category else "Furniture",
            "subcategory": p.subcategory.subcategory_name if p.subcategory else "",
            "material": p.material or "Standard",
            "color": p.color or "Natural",
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

    subcat = db.query(models.Subcategory).filter(models.Subcategory.category_id == category.category_id).first()
    if not subcat:
        subcat = models.Subcategory(category_id=category.category_id, subcategory_name=f"{cat_name} General")
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

    new_prod = models.Product(
        category_id=category.category_id,
        subcategory_id=subcat.subcategory_id,
        supplier_id=supplier.supplier_id,
        added_by=added_by_id,
        product_name=payload.name.strip(),
        material=payload.material.strip(),
        color=color_val,
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

    return {
        "id": f"inv-{new_prod.product_id}",
        "product_id": new_prod.product_id,
        "name": new_prod.product_name,
        "category": cat_name,
        "material": new_prod.material,
        "color": new_prod.color,
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
    db.commit()
    return {"message": "Product updated", "stock_count": prod.stock_quantity}


from datetime import datetime

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
            "customerName": r.customer_name or "Valued Customer",
            "email": r.customer_email or "customer@retailsphere.com",
            "itemsCount": sum(i.quantity for i in r.items) if r.items else 1,
            "totalAmount": float(r.total_amount or 0),
            "orderStatus": r.order_status or "Order Placed",
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
    new_order = models.ReadymadeOrder(
        customer_name=payload.customerName.strip(),
        customer_email=payload.email.strip(),
        total_amount=payload.totalAmount,
        payment_status=payload.paymentStatus.strip(),
        payment_id=payload.paymentId.strip() if payload.paymentId else None,
        order_status=payload.orderStatus.strip(),
        delivery_address="Ettumanoor, Kottayam, Kerala 686631"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Add items
    for item in payload.items:
        prod_id = None
        clean_id = str(item.id).replace('inv-', '')
        if clean_id.isdigit():
            prod_id = int(clean_id)
        
        db_item = models.ReadymadeOrderItem(
            order_id=new_order.order_id,
            product_id=prod_id,
            product_name=item.name.strip(),
            image_url=item.imageUrl,
            quantity=item.quantity,
            unit_price=item.price
        )
        db.add(db_item)
    
    # Also record payment in tbl_payment
    new_payment = models.Payment(
        order_type="Readymade",
        order_id=new_order.order_id,
        amount=payload.totalAmount,
        payment_method="Razorpay",
        transaction_id=payload.paymentId or f"PAY-RET-{new_order.order_id}-{int(time.time())}",
        payment_status=payload.paymentStatus
    )
    db.add(new_payment)

    db.commit()
    db.refresh(new_order)

    return {
        "message": "Order placed and stored successfully in database",
        "orderId": f"RET-{new_order.order_id:06d}",
        "order_id": new_order.order_id
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





