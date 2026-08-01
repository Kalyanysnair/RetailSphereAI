import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

def remove_demo_staff():
    db: Session = SessionLocal()
    try:
        # Find staff roles
        roles = db.query(models.Role).filter(models.Role.role_name.in_(["Retail Staff", "Production Staff"])).all()
        role_ids = [r.role_id for r in roles]

        if role_ids:
            demo_users = db.query(models.User).filter(
                (models.User.role_id.in_(role_ids)) |
                (models.User.email.like("%@retailsphere.com"))
            ).filter(models.User.full_name != "admin").all()

            user_ids = [u.user_id for u in demo_users]

            if user_ids:
                # Delete linked customer profiles first
                db.query(models.Customer).filter(models.Customer.user_id.in_(user_ids)).delete(synchronize_session=False)
                # Delete staff users
                db.query(models.User).filter(models.User.user_id.in_(user_ids)).delete(synchronize_session=False)
                db.commit()
                print(f"[CLEAN SUCCESS] Removed {len(user_ids)} demo staff accounts from PostgreSQL database.")
            else:
                print("[CLEAN NOTICE] No demo staff users found.")
        else:
            print("[CLEAN NOTICE] No staff roles found in database.")

    except Exception as e:
        print(f"[CLEAN ERROR] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    remove_demo_staff()
