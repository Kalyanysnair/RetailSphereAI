import os
import urllib.parse
from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings


from sqlalchemy.pool import NullPool

def init_engine():
    db_url = settings.DATABASE_URL
    is_production = bool(os.environ.get("VERCEL") or os.environ.get("ENVIRONMENT") == "production")

    if db_url:
        db_url = db_url.strip().strip("'\"")
        # Normalize legacy postgres:// scheme to postgresql:// for SQLAlchemy compatibility
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)

        if db_url.startswith("postgresql"):
            try:
                # Robustly parse URL using SQLAlchemy make_url to preserve credentials, host, and SSL query params
                url_obj = make_url(db_url)
                if url_obj.database:
                    url_obj = url_obj.set(database=urllib.parse.unquote(url_obj.database))

                engine_kwargs = {
                    "connect_args": {
                        "connect_timeout": 20,
                        "options": "-c timezone=Asia/Kolkata"
                    }
                }
                if is_production:
                    # In serverless environments, NullPool prevents connection leaks across frozen lambda invocations
                    engine_kwargs["poolclass"] = NullPool
                else:
                    engine_kwargs["pool_size"] = 10
                    engine_kwargs["max_overflow"] = 10
                    engine_kwargs["pool_recycle"] = 300
                    engine_kwargs["pool_timeout"] = 30
                    engine_kwargs["pool_pre_ping"] = True

                pg_engine = create_engine(url_obj, **engine_kwargs)

                import time
                last_err = None
                for attempt in range(3):
                    try:
                        with pg_engine.connect():
                            pass
                        print(f"[DATABASE] Connected to PostgreSQL database '{url_obj.database}' successfully (Timezone: Asia/Kolkata).")
                        return pg_engine
                    except Exception as conn_err:
                        last_err = conn_err
                        if attempt < 2:
                            print(f"[DATABASE NOTICE] Connection attempt {attempt + 1} failed: {conn_err}. Retrying in 1.5s...")
                            time.sleep(1.5)
                if last_err:
                    raise last_err
            except Exception as e:
                err_msg = f"PostgreSQL database connection failed ({type(e).__name__}: {e})"
                if is_production or not os.environ.get("ALLOW_SQLITE_FALLBACK"):
                    print(f"[DATABASE ERROR] {err_msg}. Silent fallback to SQLite is disabled.")
                    raise RuntimeError(
                        f"{err_msg}. Refusing silent fallback to SQLite. "
                        "Verify your DATABASE_URL / network connection or set ALLOW_SQLITE_FALLBACK=1 if offline development is intended."
                    ) from e
                print(f"[DATABASE NOTICE] {err_msg}. Falling back to local SQLite database.")
        elif is_production:
            raise RuntimeError(
                "[DATABASE ERROR] DATABASE_URL must start with 'postgresql://' or 'postgres://' in production/Vercel."
            )
    elif is_production:
        raise RuntimeError(
            "[DATABASE ERROR] DATABASE_URL environment variable is required in production/Vercel environment."
        )

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
