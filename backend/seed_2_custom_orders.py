from app.database import SessionLocal
from app import models

db = SessionLocal()

try:
    # Clear all custom orders, assignments, progress from PostgreSQL DB
    db.query(models.WorkerAssignment).delete()
    db.query(models.ProductionProgress).delete()
    db.query(models.CustomOrder).delete()
    db.commit()

    # Ensure Customer record for Kalyany S Nair exists
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

    print("PostgreSQL custom order tables cleared. Ready for live customer order submissions!")
except Exception as e:
    db.rollback()
    print("Error clearing tables:", e)
finally:
    db.close()
