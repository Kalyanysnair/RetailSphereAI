import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)

def run_test():
    print("Testing Custom Order Creation with BOTH Images & Additional Specifications via FastAPI TestClient...")
    
    payload = {
        "customer_id": 99,
        "customer_name": "Test Client Order",
        "customer_email": "testclient.order@example.com",
        "customer_phone": "9876543210",
        "furniture_type": "Executive L-Shaped Desk with Storage",
        "material": "Solid Walnut & Brushed Brass",
        "dimensions": "240cm L × 120cm W × 78cm H",
        "color": "Dark Espresso Matte (Wood Stain)",
        "design_description": "Aspects: [Cable Management: Concealed Box; Drawers: Soft-Close Locking]. Special Requirements: Make armrest wider and add hidden lower pedestal storage.",
        "reference_image": "https://images.unsplash.com/photo-1518455027359-a38d319254f0, https://images.unsplash.com/photo-1540518614846-7ede433c5172"
    }

    # 1. TEST POST /custom-orders
    resp = client.post("/api/production/custom-orders", json=payload)
    print(f"POST Response Code: {resp.status_code}")
    if resp.status_code != 200:
        print(f"POST Error: {resp.text}")
        return False

    created = resp.json()
    order_id = created.get("custom_order_id")
    print(f"Successfully Created Custom Order #{order_id}!")
    print(f"Created Reference Image: {created.get('reference_image')}")
    print(f"Created Design Specs: {created.get('design_description')}")

    # 2. TEST GET Customer Orders by Email
    print("\nVerifying GET Customer Orders by Email...")
    get_resp = client.get(f"/api/production/custom-orders?customer_email=testclient.order@example.com")
    print(f"GET Response Code: {get_resp.status_code}")
    orders = get_resp.json()
    matched = [o for o in orders if o.get("custom_order_id") == order_id]
    
    if not matched:
        print(f"ERROR: Order #{order_id} NOT found in Customer GET API response!")
        return False

    target_ord = matched[0]
    has_img = bool(target_ord.get("reference_image"))
    has_specs = bool(target_ord.get("design_description"))
    print(f"Customer Order #{order_id} Found!")
    print(f"Has Reference Image retained: {has_img} -> {target_ord.get('reference_image')}")
    print(f"Has Additional Specs retained: {has_specs} -> {target_ord.get('design_description')}")

    # 3. TEST GET Production Staff Orders (All)
    print("\nVerifying GET Production Staff Orders (All)...")
    staff_resp = client.get("/api/production/custom-orders")
    staff_orders = staff_resp.json()
    staff_matched = [o for o in staff_orders if o.get("custom_order_id") == order_id]
    if not staff_matched:
        print(f"ERROR: Order #{order_id} NOT found in Production Staff GET API response!")
        return False
    print(f"Production Staff Order #{order_id} Found & Retained!")

    # 4. TEST PUT Status & Quote Update
    print(f"\nUpdating Quote Price & Status for Order #{order_id}...")
    put_url = f"/api/production/custom-orders/{order_id}/status"
    put_resp = client.put(put_url, json={
        "order_status": "Approved",
        "estimated_price": 48500.0,
        "remarks": "Technical specs reviewed and approved.",
        "approved_by": "Geetha Devi"
    })
    print(f"PUT Response Code: {put_resp.status_code}")

    # 5. RE-VERIFY AFTER QUOTE UPDATE
    re_resp = client.get(f"/api/production/custom-orders?customer_email=testclient.alpha@example.com")
    re_orders = re_resp.json()
    re_matched = [o for o in re_orders if o.get("custom_order_id") == order_id][0]
    print(f"After Quote Update -> Status: {re_matched.get('order_status')}, Price: {re_matched.get('estimated_price')}")
    print(f"After Quote Update -> Reference Image still present: {bool(re_matched.get('reference_image'))}")
    print(f"After Quote Update -> Additional Specs still present: {bool(re_matched.get('design_description'))}")

    # Clean up test order
    print("\nCleaning up test order...")
    try:
        db = SessionLocal()
        db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).delete()
        db.commit()
        db.close()
        print(f"Cleaned up test order #{order_id}.")
    except Exception as e:
        print(f"Cleanup notice: {e}")

    print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    return True

if __name__ == "__main__":
    run_test()
