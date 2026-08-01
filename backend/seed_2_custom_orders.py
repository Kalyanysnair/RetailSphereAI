from app.database import SessionLocal
from app import models
from datetime import datetime

db = SessionLocal()

try:
    # 1. Clear existing custom orders, assignments, progress
    db.query(models.WorkerAssignment).delete()
    db.query(models.ProductionProgress).delete()
    db.query(models.CustomOrder).delete()
    db.commit()

    # 2. Get or create Customer 1 (Kalyany S Nair)
    user1 = db.query(models.User).filter(models.User.email == 'kalyanys2004@gmail.com').first()
    if not user1:
        cust_role = db.query(models.Role).filter(models.Role.role_name == "Customer").first()
        user1 = models.User(
            full_name='Kalyany S Nair',
            email='kalyanys2004@gmail.com',
            phone='+91 9778237180',
            role_id=cust_role.role_id if cust_role else 2,
            password='pbkdf2_sha256$hash$dummy'
        )
        db.add(user1)
        db.commit()
        db.refresh(user1)

    customer1 = db.query(models.Customer).filter(models.Customer.user_id == user1.user_id).first()
    if not customer1:
        customer1 = models.Customer(
            user_id=user1.user_id,
            address='Ettumanoor',
            city='Kottayam',
            state='Kerala',
            pincode='686631'
        )
        db.add(customer1)
        db.commit()
        db.refresh(customer1)

    # 3. Get or create Customer 2 (Marcus Vance)
    user2 = db.query(models.User).filter(models.User.email == 'marcus.vance@example.com').first()
    if not user2:
        cust_role = db.query(models.Role).filter(models.Role.role_name == "Customer").first()
        user2 = models.User(
            full_name='Marcus Vance',
            email='marcus.vance@example.com',
            phone='+91 9876543210',
            role_id=cust_role.role_id if cust_role else 2,
            password='pbkdf2_sha256$hash$dummy'
        )
        db.add(user2)
        db.commit()
        db.refresh(user2)

    customer2 = db.query(models.Customer).filter(models.Customer.user_id == user2.user_id).first()
    if not customer2:
        customer2 = models.Customer(
            user_id=user2.user_id,
            address='Beach Road',
            city='Kochi',
            state='Kerala',
            pincode='682001'
        )
        db.add(customer2)
        db.commit()
        db.refresh(customer2)

    # 4. Insert Single Custom Order for User 1 (Kalyany S Nair)
    order1 = models.CustomOrder(
        custom_order_id=101,
        customer_id=customer1.customer_id,
        furniture_type='Daybed',
        material='Solid Teak Wood',
        dimensions='220cm L x 95cm W x 85cm H',
        color='Cream Bouclé Upholstery',
        design_description='Minimalist handcrafted daybed with teak base',
        reference_image='https://images.unsplash.com/photo-1540518614846-7ede433c5163?auto=format&fit=crop&w=800&q=80',
        order_status='Pending',
        order_date=datetime.utcnow()
    )
    db.add(order1)

    # 5. Insert Single Custom Order for User 2 (Marcus Vance)
    order2 = models.CustomOrder(
        custom_order_id=102,
        customer_id=customer2.customer_id,
        furniture_type='Dining Table',
        material='Solid Teak Planks',
        dimensions='220cm L x 95cm W x 85cm H',
        color='Natural Matte Wax',
        design_description='8-seater solid teak dining table',
        reference_image='https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
        estimated_price=50000.0,
        order_status='Approved',
        is_locked=True,
        order_date=datetime.utcnow()
    )
    db.add(order2)
    db.commit()

    # Progress timeline for Order 101
    prog1 = models.ProductionProgress(
        custom_order_id=101,
        updated_by=1,
        stage='Pending Approval',
        progress_percentage=0,
        remarks='Custom request submitted for staff review.'
    )
    db.add(prog1)

    # Progress timeline for Order 102
    prog2 = models.ProductionProgress(
        custom_order_id=102,
        updated_by=1,
        stage='Material Sourcing',
        progress_percentage=20,
        remarks='Teak wood planks sourced and undergoing seasoning.'
    )
    db.add(prog2)
    db.commit()

    print("Successfully seeded database with 2 users and 1 custom order each!")

finally:
    db.close()
