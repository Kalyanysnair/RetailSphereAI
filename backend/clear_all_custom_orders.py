import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from sqlalchemy import text

def clear_custom_orders():
    db = SessionLocal()
    try:
        print("Clearing all custom orders and production progress records from DB...")

        try:
            db.execute(text("TRUNCATE TABLE tbl_production_progress CASCADE;"))
        except Exception as e:
            print(f"Notice truncating production progress: {e}")

        db.execute(text("TRUNCATE TABLE tbl_custom_order CASCADE;"))

        # Clear localStorage backup mock orders as well if needed
        db.commit()
        print("Successfully cleared all custom orders from DB! Database is clean and ready to start fresh.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing custom orders: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_custom_orders()
