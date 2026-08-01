import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, auth

def seed_admin_user():
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

        # 2. Ensure 'Customer', 'Retail Staff', 'Production Staff' roles exist
        for r_name in ["Customer", "Retail Staff", "Production Staff"]:
            r = db.query(models.Role).filter(models.Role.role_name == r_name).first()
            if not r:
                r = models.Role(role_name=r_name)
                db.add(r)
                db.commit()

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
            existing_user.role_id = admin_role.role_id
            existing_user.password = hashed_password
            existing_user.status = True
            db.commit()
            db.refresh(existing_user)
            print(f"[SEED SUCCESS] Updated existing Admin user ID {existing_user.user_id} (Username: 'admin', Password: 'admin@123')")
        else:
            new_admin = models.User(
                role_id=admin_role.role_id,
                full_name=admin_username,
                email=admin_email,
                phone=admin_phone,
                password=hashed_password,
                status=True
            )
            db.add(new_admin)
            db.commit()
            db.refresh(new_admin)
            print(f"[SEED SUCCESS] Created new Admin user ID {new_admin.user_id} (Username: 'admin', Password: 'admin@123')")


    except Exception as e:
        print(f"[SEED ERROR] Failed to seed admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin_user()
