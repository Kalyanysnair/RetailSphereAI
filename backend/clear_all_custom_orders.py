import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app import models

def clear_custom_orders():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Clearing all custom orders and production progress records from DB...")

        try:
            db.query(models.WorkerAssignment).delete(synchronize_session=False)
        except Exception as e:
            print(f"Notice clearing worker assignments: {e}")

        try:
            db.query(models.ProductionProgress).delete(synchronize_session=False)
        except Exception as e:
            print(f"Notice clearing production progress: {e}")

        db.query(models.CustomOrder).delete(synchronize_session=False)
        db.commit()
        print("Successfully cleared all custom orders from DB! Database is clean and ready to start fresh.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing custom orders: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_custom_orders()
