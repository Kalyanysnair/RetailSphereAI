import sys
import os
from datetime import datetime, date

from app.database import SessionLocal
from app import models

def seed_demo_orders():
    db = SessionLocal()
    try:
        # Check customer
        customer = db.query(models.Customer).first()
        if not customer:
            user = db.query(models.User).filter(models.User.email == "customer@example.com").first()
            if not user:
                user = models.User(
                    email="customer@example.com",
                    password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW",
                    full_name="Rajesh Sharma",
                    phone="+91 9876543210"
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            customer = models.Customer(
                user_id=user.user_id,
                address="Flat 402, Royal Residency, MG Road",
                city="Bangalore",
                state="Karnataka",
                pincode="560001"
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)

        # Check workers
        worker_role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
        if not worker_role:
            worker_role = models.Role(role_name="Worker")
            db.add(worker_role)
            db.commit()
            db.refresh(worker_role)

        worker1 = db.query(models.User).filter(models.User.email == "ramesh.worker@retailsphere.ai").first()
        if not worker1:
            worker1 = models.User(
                email="ramesh.worker@retailsphere.ai",
                password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW",
                full_name="Ramesh Kumar",
                phone="+91 9811223344",
                role_id=worker_role.role_id,
                specialization="Woodwork & Carpentry",
                status=True
            )
            db.add(worker1)

        worker2 = db.query(models.User).filter(models.User.email == "suresh.worker@retailsphere.ai").first()
        if not worker2:
            worker2 = models.User(
                email="suresh.worker@retailsphere.ai",
                password="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW",
                full_name="Suresh Patel",
                phone="+91 9822334455",
                role_id=worker_role.role_id,
                specialization="Upholstery & Finishing",
                status=True
            )
            db.add(worker2)

        db.commit()
        if worker1: db.refresh(worker1)
        if worker2: db.refresh(worker2)

        # Create Custom Orders
        existing_custom = db.query(models.CustomOrder).all()
        if not existing_custom:
            order1 = models.CustomOrder(
                customer_id=customer.customer_id,
                furniture_type="Bespoke Teak Wood 8-Seater Dining Table",
                material="Solid Grade-A Teak Wood",
                dimensions="96L x 42W x 30H inches",
                color="Walnut Polish",
                design_description="Handcrafted teak wood dining table with brass inlay borders and ergonomically cushioned chairs.",
                reference_image="https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=600&q=80",
                estimated_price=85000.00,
                order_status="In Production",
                payment_status="Paid",
                is_locked=True,
                order_date=datetime.utcnow()
            )

            order2 = models.CustomOrder(
                customer_id=customer.customer_id,
                furniture_type="Luxury Italian Leather L-Shape Sectional Sofa",
                material="Top-Grain Nappa Leather & Solid Pine Frame",
                dimensions="110L x 65W x 34H inches",
                color="Emerald Green",
                design_description="Modular L-shaped luxury sofa with high-density foam cushions and brushed gold stainless steel legs.",
                reference_image="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
                estimated_price=125000.00,
                order_status="In Production",
                payment_status="Paid",
                is_locked=True,
                order_date=datetime.utcnow()
            )

            order3 = models.CustomOrder(
                customer_id=customer.customer_id,
                furniture_type="Modern Executive Office Desk with Built-in Cable Management",
                material="Engineered Oak & Matte Powder-Coated Steel",
                dimensions="72L x 36W x 30H inches",
                color="Natural Oak & Charcoal Grey",
                design_description="Minimalist executive desk featuring wireless phone charging pad, cable routing channels, and soft-close drawers.",
                reference_image="https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80",
                estimated_price=45000.00,
                order_status="Approved",
                payment_status="Paid",
                is_locked=True,
                order_date=datetime.utcnow()
            )

            db.add_all([order1, order2, order3])
            db.commit()
            db.refresh(order1)
            db.refresh(order2)
            db.refresh(order3)

            # Assign Workers to custom orders
            w1_id = worker1.user_id if worker1 else 1
            w2_id = worker2.user_id if worker2 else 2

            asgn1 = models.WorkerAssignment(
                custom_order_id=order1.custom_order_id,
                worker_id=w1_id,
                assigned_date=date.today(),
                task_status="In Production"
            )
            asgn2 = models.WorkerAssignment(
                custom_order_id=order2.custom_order_id,
                worker_id=w2_id,
                assigned_date=date.today(),
                task_status="In Production"
            )
            asgn3 = models.WorkerAssignment(
                custom_order_id=order3.custom_order_id,
                worker_id=w1_id,
                assigned_date=date.today(),
                task_status="Assigned"
            )

            db.add_all([asgn1, asgn2, asgn3])

            # Add production progress updates
            prog1 = models.ProductionProgress(
                custom_order_id=order1.custom_order_id,
                updated_by=w1_id,
                stage="Cutting & Joinery",
                progress_percentage=45,
                remarks="Teak wood slabs cut and frame assembly in progress.",
                updated_at=datetime.utcnow()
            )
            prog2 = models.ProductionProgress(
                custom_order_id=order2.custom_order_id,
                updated_by=w2_id,
                stage="Upholstery & Cushioning",
                progress_percentage=65,
                remarks="Leather stitching and foam padding complete. Attaching metal legs.",
                updated_at=datetime.utcnow()
            )
            db.add_all([prog1, prog2])
            db.commit()

            print("Successfully seeded 3 demo custom orders with assigned workers!")
        else:
            print(f"Custom orders already exist ({len(existing_custom)} orders).")

    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_orders()
