import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def alter_columns():
    print("Altering PostgreSQL tbl_custom_order column types to TEXT...")
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE tbl_custom_order ALTER COLUMN reference_image TYPE TEXT;"))
        conn.execute(text("ALTER TABLE tbl_custom_order ALTER COLUMN color TYPE TEXT;"))
        conn.execute(text("ALTER TABLE tbl_custom_order ALTER COLUMN furniture_type TYPE VARCHAR(255);"))
        conn.execute(text("ALTER TABLE tbl_custom_order ALTER COLUMN material TYPE VARCHAR(255);"))
        conn.execute(text("ALTER TABLE tbl_custom_order ALTER COLUMN dimensions TYPE VARCHAR(255);"))
        conn.commit()
    print("Successfully altered tbl_custom_order column types to TEXT!")

if __name__ == "__main__":
    alter_columns()
