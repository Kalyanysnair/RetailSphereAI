from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, admin, production, coupons

# Initialize FastAPI application
app = FastAPI(
    title="RetailSphere AI Backend",
    description="FastAPI Backend for RetailSphere AI E-Commerce & Custom Furniture Platform",
    version="1.0.0"
)

# CORS configuration to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to auto-create database tables
@app.on_event("startup")
def startup_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully.")
    except Exception as e:
        print(f"Warning: Could not automatically initialize database tables: {e}")
        print("Please ensure PostgreSQL server is running and database exists.")

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
