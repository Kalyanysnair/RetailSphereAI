import time
import requests
import json
from app.database import SessionLocal
from app import models
from app.auth import create_access_token

BASE_URL = "http://127.0.0.1:8000"

def get_tokens():
    db = SessionLocal()
    roles = {
        "admin": "admin@retailsphere.com",
        "production": "kalyany.nikunjam@gmail.com",
        "retail": "kalyanysanal@gmail.com",
        "worker": "kalyanysnairgenai2024@gmail.com",
        "delivery": "deepthicd2027@mca.ajce.in",
        "carrier": "mariyageorge2027@mca.ajce.in",
        "customer": "kalyanysnair2027@mca.ajce.in"
    }
    tokens = {}
    for role, email in roles.items():
        user = db.query(models.User).filter_by(email=email).first()
        if user:
            role_name = user.role.role_name if user.role else role
            # sub must be str(user_id)
            tokens[role] = create_access_token({"sub": str(user.user_id), "role": role_name, "email": user.email})
        else:
            tokens[role] = None
    db.close()
    return tokens

def run_benchmarks():
    print("=" * 88)
    print("RETAILSPHERE AI: APPLICATION-WIDE MULTI-ROLE ACCURATE TIMING BENCHMARK")
    print("=" * 88)

    tokens = get_tokens()
    
    test_cases = [
        # Customer Portal
        ("Customer", "Product Inventory Catalog", "/api/admin/inventory", "customer"),
        ("Customer", "My Fabrication Requests", "/api/fabrication/requests", "customer"),
        ("Customer", "My Custom Orders", "/api/production/custom-orders", "customer"),
        
        # Retail Staff Portal
        ("Retail Staff", "Request Inbox Overview", "/api/retail-staff/request-inbox", "retail"),
        ("Retail Staff", "Workload Recommendations", "/api/retail-staff/workload-recommendations", "retail"),
        ("Retail Staff", "Orders Operations Overview", "/api/retail-staff/orders", "retail"),
        
        # Production Staff Portal
        ("Production Staff", "Active Custom Orders", "/api/production/custom-orders", "production"),
        ("Production Staff", "Worker Directory", "/api/production/workers", "production"),
        ("Production Staff", "Raw Material Stock", "/api/materials/raw-materials", "production"),
        
        # Worker Portal
        ("Worker", "Workspace Summary KPIs", "/api/worker/my-summary", "worker"),
        ("Worker", "Assigned Work Tasks", "/api/worker/my-tasks", "worker"),
        
        # Delivery Personnel Portal
        ("Delivery Personnel", "Driver Summary KPIs", "/api/delivery-personnel/summary", "delivery"),
        ("Delivery Personnel", "Assigned Delivery Tasks", "/api/delivery-personnel/tasks", "delivery"),
        
        # Carrier Partner Portal
        ("Carrier Partner", "Partner Fleet Summary", "/api/carrier/summary", "carrier"),
        ("Carrier Partner", "Active Carrier Deliveries", "/api/carrier/deliveries", "carrier"),
        
        # Admin Portal
        ("Admin", "BI Executive Dashboard Summary", "/api/admin/dashboard-summary", "admin"),
        ("Admin", "Full Product Inventory", "/api/admin/inventory", "admin"),
        ("Admin", "Platform User Roster", "/api/admin/users", "admin"),
    ]

    results = []

    for role, label, endpoint, token_key in test_cases:
        token = tokens.get(token_key)
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        url = f"{BASE_URL}{endpoint}"
        
        # 1. Cold Call
        t0 = time.time()
        try:
            r1 = requests.get(url, headers=headers, timeout=15)
            cold_time = (time.time() - t0) * 1000
            cold_status = r1.status_code
            cold_size = len(r1.content)
        except Exception as e:
            cold_time = -1
            cold_status = 500
            cold_size = 0

        # 2. Warm Call (Repeat Navigation)
        t0 = time.time()
        try:
            r2 = requests.get(url, headers=headers, timeout=15)
            warm_time = (time.time() - t0) * 1000
            warm_status = r2.status_code
        except Exception as e:
            warm_time = -1
            warm_status = 500

        # 3. Repeat Navigation 2
        t0 = time.time()
        try:
            r3 = requests.get(url, headers=headers, timeout=15)
            repeat_time = (time.time() - t0) * 1000
        except Exception as e:
            repeat_time = -1

        results.append({
            "role": role,
            "label": label,
            "endpoint": endpoint,
            "cold_ms": round(cold_time, 2),
            "warm_ms": round(warm_time, 2),
            "repeat_ms": round(repeat_time, 2),
            "status": cold_status,
            "payload_bytes": cold_size
        })

        status_str = f"HTTP {cold_status}" if cold_status == 200 else f"ERR {cold_status}"
        print(f"[{role:18}] {label:30} | Cold: {cold_time:7.2f}ms | Warm: {warm_time:7.2f}ms | Repeat: {repeat_time:7.2f}ms | {status_str} | {cold_size} B")

    print("=" * 88)
    with open("benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("Benchmark complete. Results saved to backend/benchmark_results.json")

if __name__ == "__main__":
    run_benchmarks()
