import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

def init_engine():
    db_url = settings.DATABASE_URL
    if db_url and db_url.startswith("postgresql"):
        try:
            pg_engine = create_engine(
                db_url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3}
            )
            with pg_engine.connect() as conn:
                pass
            print("[DATABASE] Connected to PostgreSQL database successfully.")
            return pg_engine
        except Exception as e:
            print(f"[DATABASE NOTICE] PostgreSQL connection failed ({e}). Falling back to local SQLite database.")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, "retailsphere.db").replace("\\", "/")
    sqlite_url = f"sqlite:///{db_path}"
    return create_engine(sqlite_url, connect_args={"check_same_thread": False})

engine = init_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

