import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app import models

def delete_3_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user_ids = [119, 120, 121]
        emails = [
            "kalyany,.nikunjam@gmail.com",
            "ramesh.worker@retailsphere.ai",
            "suresh.worker@retailsphere.ai"
        ]

        print(f"Deleting user records with IDs {user_ids} or emails {emails} from DB...")

        # Delete dependent customer profiles
        for uid in user_ids:
            customers = db.query(models.Customer).filter(models.Customer.user_id == uid).all()
            for c in customers:
                db.delete(c)

        # Delete notifications for these users
        for uid in user_ids:
            notifs = db.query(models.Notification).filter(models.Notification.user_id == uid).all()
            for n in notifs:
                db.delete(n)

        # Delete worker assignments for these users
        for uid in user_ids:
            asgns = db.query(models.WorkerAssignment).filter(models.WorkerAssignment.worker_id == uid).all()
            for a in asgns:
                db.delete(a)

        # Delete users by ID or Email
        deleted_count = 0
        users_to_delete = db.query(models.User).filter(
            (models.User.user_id.in_(user_ids)) | (models.User.email.in_(emails))
        ).all()

        for u in users_to_delete:
            print(f"Deleting User #{u.user_id} - {u.full_name} ({u.email})")
            db.delete(u)
            deleted_count += 1

        db.commit()
        print(f"Successfully deleted {deleted_count} user record(s) from database!")
    except Exception as e:
        db.rollback()
        print(f"Error deleting user records: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_3_users()
