import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models, auth

def seed_admin_user():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # 1. Ensure 'Admin' role exists in tbl_role
        admin_role = db.query(models.Role).filter(models.Role.role_name == "Admin").first()
        if not admin_role:
            admin_role = models.Role(role_name="Admin")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
            print(f"[SEED SUCCESS] Created 'Admin' role with ID: {admin_role.role_id}")
        else:
            print(f"[SEED NOTICE] 'Admin' role already exists with ID: {admin_role.role_id}")

        # 2. Ensure 'Customer', 'Retail Staff', 'Production Staff', 'Worker' roles exist
        roles = {}
        for r_name in ["Admin", "Customer", "Retail Staff", "Production Staff", "Worker"]:
            r = db.query(models.Role).filter(models.Role.role_name == r_name).first()
            if not r:
                r = models.Role(role_name=r_name)
                db.add(r)
                db.commit()
                db.refresh(r)
            roles[r_name] = r

        # 3. Create or update 'admin' user
        admin_username = "admin"
        admin_email = "admin@retailsphere.com"
        admin_phone = "+919999999999"
        raw_password = "admin@123"
        hashed_password = auth.get_password_hash(raw_password)

        existing_user = db.query(models.User).filter(
            (models.User.email == admin_email) |
            (models.User.full_name == admin_username)
        ).first()

        if existing_user:
            existing_user.full_name = admin_username
            existing_user.email = admin_email
            existing_user.role_id = roles["Admin"].role_id
            existing_user.password = hashed_password
            existing_user.status = True
            db.commit()
            db.refresh(existing_user)
            print(f"[SEED SUCCESS] Updated existing Admin user ID {existing_user.user_id}")
        else:
            new_admin = models.User(
                role_id=roles["Admin"].role_id,
                full_name=admin_username,
                email=admin_email,
                phone=admin_phone,
                password=hashed_password,
                status=True
            )
            db.add(new_admin)
            db.commit()
            db.refresh(new_admin)
            print(f"[SEED SUCCESS] Created new Admin user ID {new_admin.user_id}")

        # 4. Seed Retail Staff (No dummy retail staff seeded; actual staff registered in DB)

        # 5. Seed Multiple Production Staff Supervisors
        prod_staff_list = [
            ("Production Supervisor A", "production.staff@retailsphere.com", "+919800000011"),
            ("Production Supervisor B", "supervisor.b@retailsphere.com", "+919800000012"),
            ("Production Supervisor C", "supervisor.c@retailsphere.com", "+919800000013"),
        ]
        for name, email, phone in prod_staff_list:
            u = db.query(models.User).filter(models.User.email == email).first()
            if not u:
                u = models.User(
                    role_id=roles["Production Staff"].role_id,
                    full_name=name,
                    email=email,
                    phone=phone,
                    password=auth.get_password_hash("staff123"),
                    status=True
                )
                db.add(u)
                db.commit()
                print(f"[SEED SUCCESS] Created Production Supervisor account: {email}")

        # 6. Seed Skilled Workers
        workers_list = [
            ("Arun", "arun.worker@retailsphere.com", "+919845012341", "Woodwork & Carpentry", False),
            ("Nimish K", "nimish.worker@retailsphere.com", "+919845012342", "Woodwork & Carpentry", False),
            ("Suresh", "suresh.worker@retailsphere.com", "+919845012343", "Upholstery", False),
            ("Geetha Devi", "geetha.worker@retailsphere.com", "+919845012344", "Assembly & QA", False),
            ("Ajith", "ajith.worker@retailsphere.com", "+919845012345", "Assembly & QA", False),
            ("Rahul", "rahul.driver@retailsphere.com", "+919845012346", "On-Site Installation", True),
        ]
        for name, email, phone, spec, is_drv in workers_list:
            w_u = db.query(models.User).filter(models.User.email == email).first()
            if not w_u:
                w_u = models.User(
                    role_id=roles["Worker"].role_id,
                    full_name=name,
                    email=email,
                    phone=phone,
                    password=auth.get_password_hash("worker123"),
                    specialization=spec,
                    is_driver=is_drv,
                    status=True
                )
                db.add(w_u)
                db.commit()
                db.refresh(w_u)

                # Add worker availability row
                w_avail = db.query(models.WorkerAvailability).filter(models.WorkerAvailability.worker_id == w_u.user_id).first()
                if not w_avail:
                    db.add(models.WorkerAvailability(
                        worker_id=w_u.user_id,
                        status="AVAILABLE",
                        active_jobs_count=0
                    ))

                # Add worker skill row
                w_skill = db.query(models.WorkerSkill).filter(models.WorkerSkill.worker_id == w_u.user_id).first()
                if not w_skill:
                    db.add(models.WorkerSkill(
                        worker_id=w_u.user_id,
                        skill_name=spec,
                        proficiency_level="Expert"
                    ))
                db.commit()
                print(f"[SEED SUCCESS] Created Worker account: {email} ({spec})")

        # 7. Ensure demo customer accounts exist
        demo_customers = [
            ("Kalyany Nikunjam", "kalyany.nikunjam@gmail.com", "+919778237180"),
            ("Kalyany S Nair", "kalyanys2004@gmail.com", "+919778237181"),
        ]
        for c_name, c_email, c_phone in demo_customers:
            cust_u = db.query(models.User).filter(models.User.email == c_email).first()
            if not cust_u:
                cust_u = models.User(
                    role_id=roles["Customer"].role_id,
                    full_name=c_name,
                    email=c_email,
                    phone=c_phone,
                    password=auth.get_password_hash("password123"),
                    status=True
                )
                db.add(cust_u)
                db.commit()
                db.refresh(cust_u)
                c_prof = models.Customer(
                    user_id=cust_u.user_id,
                    address="Ettumanoor",
                    city="Kottayam",
                    state="Kerala",
                    pincode="686631"
                )
                db.add(c_prof)
                db.commit()
                print(f"[SEED SUCCESS] Created demo customer account: {c_email}")

    except Exception as e:
        print(f"[SEED ERROR] Failed to seed admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin_user()
