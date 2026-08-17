from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class Role(Base):
    __tablename__ = "tbl_role"

    role_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String(100), unique=True, nullable=False)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "tbl_users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("tbl_role.role_id"), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(15), unique=True, index=True, nullable=True)
    password = Column(String(255), nullable=True)
    status = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False, nullable=True)
    specialization = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    role = relationship("Role", back_populates="users")
    customer_profile = relationship("Customer", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")


class Customer(Base):
    __tablename__ = "tbl_customer"

    customer_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(50), nullable=False)
    state = Column(String(50), nullable=False)
    pincode = Column(String(10), nullable=False)

    user = relationship("User", back_populates="customer_profile")
    cart = relationship("Cart", back_populates="customer", uselist=False)
    wishlist = relationship("Wishlist", back_populates="customer")
    readymade_orders = relationship("ReadymadeOrder", back_populates="customer")
    custom_orders = relationship("CustomOrder", back_populates="customer")
    reviews = relationship("Review", back_populates="customer")


class Category(Base):
    __tablename__ = "tbl_category"

    category_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    image = Column(String(255), nullable=True)
    status = Column(Boolean, default=True)

    subcategories = relationship("Subcategory", back_populates="category")
    products = relationship("Product", back_populates="category")


class Subcategory(Base):
    __tablename__ = "tbl_subcategory"

    subcategory_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("tbl_category.category_id"), nullable=False)
    subcategory_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Boolean, default=True)

    category = relationship("Category", back_populates="subcategories")
    products = relationship("Product", back_populates="subcategory")


class Supplier(Base):
    __tablename__ = "tbl_supplier"

    supplier_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    supplier_name = Column(String(100), nullable=False)
    contact_person = Column(String(100), nullable=False)
    phone = Column(String(15), nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    address = Column(Text, nullable=False)
    gst_number = Column(String(20), unique=True, nullable=True)
    status = Column(Boolean, default=True)

    products = relationship("Product", back_populates="supplier")


class Product(Base):
    __tablename__ = "tbl_product"

    product_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("tbl_category.category_id"), nullable=False)
    subcategory_id = Column(Integer, ForeignKey("tbl_subcategory.subcategory_id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("tbl_supplier.supplier_id"), nullable=False)
    added_by = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    approved_by = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    product_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    material = Column(String(100), nullable=False)
    color = Column(String(50), nullable=False)
    dimensions = Column(String(100), nullable=False)
    weight = Column(Numeric(8, 2), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock_quantity = Column(Integer, default=0)
    warranty = Column(String(50), nullable=True)
    image = Column(String(255), nullable=True)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    availability_status = Column(String(50), default="Available")
    available_colors = Column(Text, nullable=True)

    category = relationship("Category", back_populates="products")
    subcategory = relationship("Subcategory", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    images = relationship("ProductImage", back_populates="product")
    reviews = relationship("Review", back_populates="product")


class ProductImage(Base):
    __tablename__ = "tbl_product_image"

    image_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("tbl_product.product_id"), nullable=False)
    image_url = Column(String(255), nullable=False)

    product = relationship("Product", back_populates="images")


class Cart(Base):
    __tablename__ = "tbl_cart"

    cart_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("tbl_customer.customer_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="cart")
    items = relationship("CartItem", back_populates="cart")


class CartItem(Base):
    __tablename__ = "tbl_cart_item"

    cart_item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cart_id = Column(Integer, ForeignKey("tbl_cart.cart_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("tbl_product.product_id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")


class Wishlist(Base):
    __tablename__ = "tbl_wishlist"

    wishlist_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("tbl_customer.customer_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("tbl_product.product_id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="wishlist")
    product = relationship("Product")


class ReadymadeOrder(Base):
    __tablename__ = "tbl_readymade_order"

    order_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("tbl_customer.customer_id"), nullable=True)
    customer_name = Column(String(100), nullable=True)
    customer_email = Column(String(100), nullable=True)
    retail_staff_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    payment_status = Column(String(50), default="Pending")
    payment_id = Column(String(100), nullable=True)
    order_status = Column(String(50), default="Pending")
    delivery_address = Column(Text, nullable=True, default="Standard Delivery")
    order_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="readymade_orders")
    items = relationship("ReadymadeOrderItem", back_populates="order")


class ReadymadeOrderItem(Base):
    __tablename__ = "tbl_readymade_order_item"

    item_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("tbl_readymade_order.order_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("tbl_product.product_id"), nullable=True)
    product_name = Column(String(255), nullable=True)
    image_url = Column(Text, nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)

    order = relationship("ReadymadeOrder", back_populates="items")
    product = relationship("Product")


class CustomOrder(Base):
    __tablename__ = "tbl_custom_order"

    custom_order_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("tbl_customer.customer_id"), nullable=False)
    production_staff_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    furniture_type = Column(String(255), nullable=False)
    material = Column(String(255), nullable=False)
    dimensions = Column(String(255), nullable=False)
    color = Column(Text, nullable=False)
    design_description = Column(Text, nullable=True)
    reference_image = Column(Text, nullable=True)
    estimated_price = Column(Numeric(10, 2), nullable=True)
    order_status = Column(String(50), default="Pending")
    payment_status = Column(String(50), default="Pending", nullable=True)
    is_locked = Column(Boolean, default=False, nullable=True)
    order_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="custom_orders")
    assignments = relationship("WorkerAssignment", back_populates="custom_order")
    progress_updates = relationship("ProductionProgress", back_populates="custom_order")


class WorkerAssignment(Base):
    __tablename__ = "tbl_worker_assignment"

    assignment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    custom_order_id = Column(Integer, ForeignKey("tbl_custom_order.custom_order_id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    assigned_date = Column(Date, default=date.today, nullable=False)
    task_status = Column(String(50), default="Assigned")

    custom_order = relationship("CustomOrder", back_populates="assignments")


class ProductionProgress(Base):
    __tablename__ = "tbl_production_progress"

    progress_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    custom_order_id = Column(Integer, ForeignKey("tbl_custom_order.custom_order_id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    stage = Column(String(100), nullable=False)
    remarks = Column(Text, nullable=True)
    progress_percentage = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    custom_order = relationship("CustomOrder", back_populates="progress_updates")


class Payment(Base):
    __tablename__ = "tbl_payment"

    payment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_type = Column(String(50), nullable=False)
    order_id = Column(Integer, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(String(50), nullable=False)
    transaction_id = Column(String(100), unique=True, nullable=True)
    payment_status = Column(String(50), default="Pending")
    payment_date = Column(DateTime, default=datetime.utcnow, nullable=False)


class Review(Base):
    __tablename__ = "tbl_review"

    review_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("tbl_customer.customer_id"), nullable=False)
    product_id = Column(Integer, ForeignKey("tbl_product.product_id"), nullable=False)
    rating = Column(Integer, nullable=False)
    review = Column(Text, nullable=True)
    review_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")


class Notification(Base):
    __tablename__ = "tbl_notification"

    notification_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")


class StaffQuery(Base):
    __tablename__ = "tbl_staff_query"

    query_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    staff_name = Column(String(100), nullable=False)
    staff_email = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False, default="Email Change Request")
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="Pending")
    admin_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)

    user = relationship("User")


class Coupon(Base):
    __tablename__ = "tbl_coupon"

    coupon_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    coupon_type = Column(String(50), nullable=False)  # 'percentage_notification', 'first_n_customers', 'flat_amount'
    discount_percent = Column(Integer, default=0, nullable=False)
    flat_discount_amount = Column(Numeric(10, 2), default=0, nullable=True)
    description = Column(Text, nullable=False)
    customer_limit = Column(Integer, nullable=True)
    current_redemptions = Column(Integer, default=0, nullable=False)
    target_user_email = Column(String(100), nullable=True)
    status = Column(String(20), default="Active", nullable=False)  # 'Active', 'Inactive'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    redemptions = relationship("CouponRedemption", back_populates="coupon", cascade="all, delete-orphan")


class CouponRedemption(Base):
    __tablename__ = "tbl_coupon_redemption"

    redemption_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    coupon_id = Column(Integer, ForeignKey("tbl_coupon.coupon_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    user_email = Column(String(100), nullable=False)
    order_id = Column(String(100), nullable=True)
    redeemed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    coupon = relationship("Coupon", back_populates="redemptions")
    user = relationship("User")


