import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app import models

def delete_custom_order_13():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        order_id = 13
        print(f"Deleting Custom Order #{order_id} from database...")

        # Delete dependent worker assignments
        try:
            asgns = db.query(models.WorkerAssignment).filter(models.WorkerAssignment.custom_order_id == order_id).all()
            for a in asgns:
                db.delete(a)
            print(f"Deleted worker assignments for Order #{order_id}.")
        except Exception as e:
            print(f"Notice worker assignments: {e}")

        # Delete production progress records
        try:
            progs = db.query(models.ProductionProgress).filter(models.ProductionProgress.custom_order_id == order_id).all()
            for p in progs:
                db.delete(p)
            print(f"Deleted production progress records for Order #{order_id}.")
        except Exception as e:
            print(f"Notice production progress: {e}")

        # Delete payments if any
        try:
            pmts = db.query(models.Payment).filter(
                models.Payment.order_type == "Custom",
                models.Payment.order_id == order_id
            ).all()
            for p in pmts:
                db.delete(p)
            print(f"Deleted payment records for Order #{order_id}.")
        except Exception as e:
            print(f"Notice payments: {e}")

        # Delete the custom order
        custom_orders = db.query(models.CustomOrder).filter(
            (models.CustomOrder.custom_order_id == order_id) | (models.CustomOrder.furniture_type.ilike("%Custom 3-Seater Sofa%"))
        ).all()

        deleted_count = 0
        for ord_obj in custom_orders:
            print(f"Deleting Custom Order #{ord_obj.custom_order_id} - {ord_obj.furniture_type}")
            db.delete(ord_obj)
            deleted_count += 1

        db.commit()
        print(f"Successfully deleted {deleted_count} custom order(s) from database!")
    except Exception as e:
        db.rollback()
        print(f"Error deleting custom order #{order_id}: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_custom_order_13()
