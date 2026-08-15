from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, admin, production, coupons

# Initialize FastAPI application
# RetailSphere AI Backend Service
app = FastAPI(
    title="RetailSphere AI Backend",
    description="FastAPI Backend for RetailSphere AI E-Commerce & Custom Furniture Platform",
    version="1.0.0"
)

# CORS configuration to allow frontend access from all local ports and origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("=" * 60)
    print(f"[UNHANDLED EXCEPTION] Path: {request.url.path} Method: {request.method}")
    print(f"[UNHANDLED EXCEPTION] Error: {exc}")
    traceback.print_exc()
    print("=" * 60)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# Startup event to auto-create database tables
@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE tbl_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE tbl_users ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);"))
                conn.commit()
                print("[MIGRATION] Added must_change_password and specialization columns to tbl_users.")
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE tbl_users ADD COLUMN must_change_password BOOLEAN DEFAULT 0;"))
                    conn.execute(text("ALTER TABLE tbl_users ADD COLUMN specialization VARCHAR(100);"))
                    conn.commit()
                    print("[MIGRATION] Added must_change_password and specialization columns to tbl_users.")
                except Exception:
                    pass
        print("Database tables initialized successfully.")
        from seed_admin import seed_admin_user
        seed_admin_user()
    except Exception as e:
        print(f"Warning: Could not automatically initialize database tables: {e}")

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(production.router)
app.include_router(coupons.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "RetailSphere AI Backend",
        "docs": "/docs"
    }
