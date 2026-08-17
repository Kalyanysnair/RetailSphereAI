import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app import models

def clear_all_orders_and_requests():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Clearing all custom orders, ready-made purchases, and requests from DB...")

        # 1. Worker assignments
        try:
            db.query(models.WorkerAssignment).delete(synchronize_session=False)
            print("Cleared WorkerAssignments.")
        except Exception as e:
            print(f"Notice clearing worker assignments: {e}")

        # 2. Production progress
        try:
            db.query(models.ProductionProgress).delete(synchronize_session=False)
            print("Cleared ProductionProgress.")
        except Exception as e:
            print(f"Notice clearing production progress: {e}")

        # 3. Custom orders
        try:
            db.query(models.CustomOrder).delete(synchronize_session=False)
            print("Cleared CustomOrders.")
        except Exception as e:
            print(f"Notice clearing custom orders: {e}")

        # 4. Readymade order items & orders
        try:
            db.query(models.ReadymadeOrderItem).delete(synchronize_session=False)
            print("Cleared ReadymadeOrderItems.")
        except Exception as e:
            print(f"Notice clearing readymade order items: {e}")

        try:
            db.query(models.ReadymadeOrder).delete(synchronize_session=False)
            print("Cleared ReadymadeOrders.")
        except Exception as e:
            print(f"Notice clearing readymade orders: {e}")

        # 5. Cart items
        try:
            db.query(models.CartItem).delete(synchronize_session=False)
            print("Cleared CartItems.")
        except Exception as e:
            print(f"Notice clearing cart items: {e}")

        db.commit()
        print("Successfully cleared all purchases, custom requests, and orders from database! DB is completely clean.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing database orders: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_all_orders_and_requests()
