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
    completion_status = Column(String(100), nullable=True)
    delivery_address = Column(Text, nullable=True, default="Standard Delivery")
    order_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer", back_populates="readymade_orders")
    items = relationship("ReadymadeOrderItem", back_populates="order")
    fulfillment = relationship("OrderFulfillment", back_populates="order", uselist=False)
    status_history = relationship("OrderStatusHistory", back_populates="order")
    messages = relationship("OrderMessage", back_populates="order")
    return_request = relationship("OrderReturn", back_populates="order", uselist=False)
    cancellation = relationship("OrderCancellation", back_populates="order", uselist=False)


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


class OrderFulfillment(Base):
    __tablename__ = "tbl_order_fulfillment"

    fulfillment_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("tbl_readymade_order.order_id"), unique=True, nullable=False)
    fulfillment_status = Column(String(50), default="Pending")
    packed_at = Column(DateTime, nullable=True)
    packed_by_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    packing_notes = Column(Text, nullable=True)
    dispatched_at = Column(DateTime, nullable=True)
    dispatched_by_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    carrier = Column(String(100), nullable=True)
    tracking_number = Column(String(100), nullable=True)
    expected_delivery_date = Column(String(50), nullable=True)
    delivery_status = Column(String(50), nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    delivery_notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("ReadymadeOrder", back_populates="fulfillment")
    packed_by_user = relationship("User", foreign_keys=[packed_by_id])
    dispatched_by_user = relationship("User", foreign_keys=[dispatched_by_id])


class OrderStatusHistory(Base):
    __tablename__ = "tbl_order_status_history"

    history_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("tbl_readymade_order.order_id"), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    changed_by_role = Column(String(50), nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    note = Column(Text, nullable=True)

    order = relationship("ReadymadeOrder", back_populates="status_history")
    changed_by_user = relationship("User")


class OrderMessage(Base):
    __tablename__ = "tbl_order_message"

    message_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("tbl_readymade_order.order_id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    sender_role = Column(String(50), nullable=False)
    sender_name = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)

    order = relationship("ReadymadeOrder", back_populates="messages")
    sender_user = relationship("User")


class OrderReturn(Base):
    __tablename__ = "tbl_order_return"

    return_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("tbl_readymade_order.order_id"), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("tbl_customer.customer_id"), nullable=False)
    reason = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    photo_url = Column(Text, nullable=True)
    status = Column(String(50), default="Return Requested")
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    pickup_date = Column(String(50), nullable=True)
    returned_at = Column(DateTime, nullable=True)
    refund_status = Column(String(50), default="Pending")
    refund_amount = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)

    order = relationship("ReadymadeOrder", back_populates="return_request")
    customer = relationship("Customer")
    reviewed_by_user = relationship("User", foreign_keys=[reviewed_by_id])


class OrderCancellation(Base):
    __tablename__ = "tbl_order_cancellation"

    cancellation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("tbl_readymade_order.order_id"), unique=True, nullable=False)
    cancelled_by_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    cancelled_by_role = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    cancelled_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    order = relationship("ReadymadeOrder", back_populates="cancellation")
    cancelled_by_user = relationship("User")



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

    # Retail Staff Review & Coordination Metadata
    review_status = Column(String(50), default="NEW", nullable=True)  # NEW, UNDER_REVIEW, MORE_INFO_REQUESTED, APPROVED, REJECTED
    reviewed_by_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    priority = Column(String(20), default="NORMAL", nullable=True)  # LOW, NORMAL, HIGH, URGENT

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


class CustomerMaterial(Base):
    __tablename__ = "tbl_customer_material"

    material_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("tbl_customer.customer_id"), nullable=False)
    material_type = Column(String(100), nullable=False)  # Timber / Fabric / Leather / Board
    wood_type = Column(String(100), nullable=True)  # Teak, Mahogany, Oak, Rosewood
    quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(20), default="sq_ft", nullable=False)  # sq_ft, cu_ft, kg, meters, pieces
    dimensions = Column(String(100), nullable=True)
    condition = Column(String(100), default="Good", nullable=True)  # Good, Untreated, Rough, Weathered
    photos = Column(Text, nullable=True)  # Comma-separated or JSON list of image URLs
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="REGISTERED", nullable=False)  # REGISTERED, SUBMITTED, RECEIVED, INSPECTED, APPROVED, ALLOCATED, PARTIALLY_USED, COMPLETED
    remaining_quantity = Column(Numeric(10, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    customer = relationship("Customer")


class FabricationRequest(Base):
    __tablename__ = "tbl_fabrication_request"

    fabrication_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("tbl_customer.customer_id"), nullable=False)
    service_type = Column(String(100), nullable=False)  # Wood Cutting, Wood Shaping, Drilling, Edge Finishing, Surface Finishing, Custom Fabrication
    material_source = Column(String(50), default="Customer-Owned", nullable=False)  # Customer-Owned vs Company Material
    customer_material_id = Column(Integer, ForeignKey("tbl_customer_material.material_id"), nullable=True)
    dimensions = Column(String(100), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    drawing_image = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    deadline = Column(Date, nullable=True)
    estimated_price = Column(Numeric(10, 2), nullable=True)
    status = Column(String(50), default="REQUESTED", nullable=False)  # REQUESTED, ASSESSED, QUOTED, APPROVED, PAID, IN_PRODUCTION, QC_PENDING, COMPLETED, CANCELLED
    payment_status = Column(String(50), default="Pending", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Retail Staff Review & Coordination Metadata
    review_status = Column(String(50), default="NEW", nullable=True)  # NEW, UNDER_REVIEW, MORE_INFO_REQUESTED, APPROVED, REJECTED
    reviewed_by_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    priority = Column(String(20), default="NORMAL", nullable=True)  # LOW, NORMAL, HIGH, URGENT

    customer = relationship("Customer")
    customer_material = relationship("CustomerMaterial")


class ServiceRequest(Base):
    __tablename__ = "tbl_service_request"

    service_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("tbl_customer.customer_id"), nullable=False)
    service_category = Column(String(100), nullable=False)  # Carpentry, Assembly, Upholstery, Repair, Installation, Modification, Polishing
    description = Column(Text, nullable=False)
    photos = Column(Text, nullable=True)
    address = Column(Text, nullable=False)
    city = Column(String(50), nullable=False)
    pincode = Column(String(10), nullable=False)
    preferred_date = Column(Date, nullable=False)
    preferred_time = Column(String(50), nullable=False)  # Morning, Afternoon, Evening
    estimated_price = Column(Numeric(10, 2), nullable=True)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, QUOTED, APPROVED, PAID, WORKER_ASSIGNED, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    payment_status = Column(String(50), default="Pending", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Retail Staff Review & Coordination Metadata
    review_status = Column(String(50), default="NEW", nullable=True)  # NEW, UNDER_REVIEW, MORE_INFO_REQUESTED, APPROVED, REJECTED
    reviewed_by_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    priority = Column(String(20), default="NORMAL", nullable=True)  # LOW, NORMAL, HIGH, URGENT

    customer = relationship("Customer")
    jobs = relationship("ServiceJob", back_populates="service_request")


class RequestMessage(Base):
    __tablename__ = "tbl_request_message"

    message_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_type = Column(String(50), nullable=False)  # customization, fabrication, service, return, order
    request_id = Column(Integer, nullable=False)
    sender_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    sender_role = Column(String(50), nullable=False)  # Customer, Retail Staff, Production Staff
    sender_name = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)

    sender_user = relationship("User")


class ServiceJob(Base):
    __tablename__ = "tbl_service_job"

    job_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    service_id = Column(Integer, ForeignKey("tbl_service_request.service_id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    scheduled_time = Column(DateTime, nullable=True)
    status = Column(String(50), default="ASSIGNED", nullable=False)  # ASSIGNED, IN_TRANSIT, IN_PROGRESS, COMPLETED
    before_photos = Column(Text, nullable=True)
    after_photos = Column(Text, nullable=True)
    customer_notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    service_request = relationship("ServiceRequest", back_populates="jobs")
    worker = relationship("User")


class ProductionStageTemplate(Base):
    __tablename__ = "tbl_production_stage_template"

    template_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    furniture_type = Column(String(100), nullable=False)
    stage_name = Column(String(100), nullable=False)  # Wood & Carpentry, Upholstery, Finishing, Assembly
    sequence_order = Column(Integer, nullable=False)
    estimated_hours = Column(Numeric(6, 2), default=4.0, nullable=False)


class ProductionStage(Base):
    __tablename__ = "tbl_production_stage"

    stage_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_type = Column(String(50), default="Custom", nullable=False)  # Custom / Fabrication
    order_id = Column(Integer, nullable=False)
    stage_name = Column(String(100), nullable=False)  # Wood & Carpentry, Upholstery, Finishing, Assembly
    sequence_order = Column(Integer, nullable=False)
    assigned_worker_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    status = Column(String(50), default="LOCKED", nullable=False)  # LOCKED, WAITING, IN_PROGRESS, QC_PENDING, REWORK_REQUIRED, COMPLETED
    progress_percentage = Column(Integer, default=0, nullable=False)
    remarks = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    assigned_worker = relationship("User")


class WorkerSkill(Base):
    __tablename__ = "tbl_worker_skill"

    skill_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    worker_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    skill_name = Column(String(100), nullable=False)  # Woodwork & Carpentry, Upholstery, Assembly, Surface Finishing, Repair, Installation
    proficiency_level = Column(String(50), default="Expert", nullable=False)


class WorkerAvailability(Base):
    __tablename__ = "tbl_worker_availability"

    availability_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    worker_id = Column(Integer, ForeignKey("tbl_users.user_id"), unique=True, nullable=False)
    status = Column(String(50), default="AVAILABLE", nullable=False)  # AVAILABLE, BUSY, ON_SITE, OFF_DUTY, ON_LEAVE
    active_jobs_count = Column(Integer, default=0, nullable=False)
    rating_score = Column(Numeric(3, 2), default=4.8, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    worker = relationship("User")


class RawMaterial(Base):
    __tablename__ = "tbl_raw_material"

    material_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category = Column(String(100), nullable=False)  # Timber, Plywood, MDF, Fabric, Foam, Leather, Hardware, Adhesives, Finishing
    material_name = Column(String(150), nullable=False)
    unit = Column(String(20), default="sq_ft", nullable=False)  # sq_ft, cu_ft, meters, pieces, kg, liters
    available_qty = Column(Numeric(10, 2), default=0.0, nullable=False)
    reserved_qty = Column(Numeric(10, 2), default=0.0, nullable=False)
    used_qty = Column(Numeric(10, 2), default=0.0, nullable=False)
    wasted_qty = Column(Numeric(10, 2), default=0.0, nullable=False)
    reorder_level = Column(Numeric(10, 2), default=10.0, nullable=False)
    unit_cost = Column(Numeric(10, 2), default=0.0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MaterialTransaction(Base):
    __tablename__ = "tbl_material_transaction"

    transaction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    raw_material_id = Column(Integer, ForeignKey("tbl_raw_material.material_id"), nullable=False)
    order_type = Column(String(50), nullable=False)  # Custom / Fabrication
    order_id = Column(Integer, nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    transaction_type = Column(String(50), nullable=False)  # RESERVED, CONSUMED, RETURNED, WASTED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    raw_material = relationship("RawMaterial")


class Machine(Base):
    __tablename__ = "tbl_machine"

    machine_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_name = Column(String(100), nullable=False)  # CNC Cutting Machine, Wood Shaper, CNC Router, Edge Finisher, Sander
    category = Column(String(100), nullable=False)
    status = Column(String(50), default="AVAILABLE", nullable=False)  # AVAILABLE, IN_USE, MAINTENANCE, OFFLINE
    current_job_id = Column(Integer, nullable=True)
    current_worker_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=True)
    last_serviced_at = Column(DateTime, nullable=True)

    current_worker = relationship("User")


class MachineMaintenance(Base):
    __tablename__ = "tbl_machine_maintenance"

    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("tbl_machine.machine_id"), nullable=False)
    description = Column(Text, nullable=False)
    performed_by = Column(String(100), nullable=False)
    maintenance_type = Column(String(50), default="Routine", nullable=False)  # Routine, Repair, Calibration
    serviced_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    machine = relationship("Machine")


class QualityInspection(Base):
    __tablename__ = "tbl_quality_inspection"

    inspection_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_type = Column(String(50), nullable=False)  # Custom / Fabrication / Readymade
    order_id = Column(Integer, nullable=False)
    stage_id = Column(Integer, nullable=True)
    inspector_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    result = Column(String(20), nullable=False)  # PASS / FAIL
    dimensions_check = Column(Boolean, default=True)
    finishing_check = Column(Boolean, default=True)
    structure_check = Column(Boolean, default=True)
    specifications_check = Column(Boolean, default=True)
    inspection_notes = Column(Text, nullable=True)
    photos = Column(Text, nullable=True)
    inspected_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    inspector = relationship("User")


class ReworkJob(Base):
    __tablename__ = "tbl_rework_job"

    rework_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    inspection_id = Column(Integer, ForeignKey("tbl_quality_inspection.inspection_id"), nullable=False)
    assigned_worker_id = Column(Integer, ForeignKey("tbl_users.user_id"), nullable=False)
    rework_reason = Column(Text, nullable=False)
    status = Column(String(50), default="ASSIGNED", nullable=False)  # ASSIGNED, IN_PROGRESS, RESOLVED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    inspection = relationship("QualityInspection")
    assigned_worker = relationship("User")


class QuotationBreakdown(Base):
    __tablename__ = "tbl_quotation_breakdown"

    quote_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_type = Column(String(50), nullable=False)  # Custom / Fabrication / Service
    order_id = Column(Integer, nullable=False)
    material_cost = Column(Numeric(10, 2), default=0.0, nullable=False)
    labour_cost = Column(Numeric(10, 2), default=0.0, nullable=False)
    machine_cost = Column(Numeric(10, 2), default=0.0, nullable=False)
    finishing_cost = Column(Numeric(10, 2), default=0.0, nullable=False)
    assembly_cost = Column(Numeric(10, 2), default=0.0, nullable=False)
    service_cost = Column(Numeric(10, 2), default=0.0, nullable=False)
    discount = Column(Numeric(10, 2), default=0.0, nullable=False)
    tax = Column(Numeric(10, 2), default=0.0, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default="QUOTED", nullable=False)  # QUOTED, APPROVED, REJECTED, PAID
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AIAnalysisLog(Base):
    __tablename__ = "tbl_ai_analysis_log"

    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_type = Column(String(100), nullable=False)  # furniture_vision, dimension_estimate, material_inspection, damage_detect, cutting_optimization, nl_spec_extract
    input_payload = Column(Text, nullable=False)
    output_result = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)



