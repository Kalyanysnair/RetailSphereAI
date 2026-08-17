import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)

def test_long_data_url_and_specs():
    print("\nTesting Custom Order Creation with EXTREMELY LONG BASE64 DATA URL & EXTENSIVE SPECIFICATIONS...")
    
    # Generate a dummy base64 data URL string over 15,000 characters long!
    long_base64_data_url = "data:image/png;base64," + ("iVBORw0KGgoAAAANSUhEUgAA" * 500)
    multiple_images_with_data_url = f"{long_base64_data_url}, https://images.unsplash.com/photo-1518455027359-a38d319254f0"

    long_additional_specs = (
        "Aspects: [Armrest: Wide Ergonomic; Backrest: Extended 120cm; Base: Hydraulic Storage]. "
        "Special Requirements: Use cream premium Italian leather upholstery, increase backrest height by 35cm, "
        "add hidden lockable storage drawers beneath the seat with brass accents, include dual concealed USB-C charging ports, "
        "and apply dark espresso matte wax finish."
    )

    payload = {
        "customer_id": 88,
        "customer_name": "Test Client Beta (Heavy Data)",
        "customer_email": "testclient.beta@example.com",
        "customer_phone": "+919876543211",
        "furniture_type": "Bespoke Executive Recliner Sofa with Heavy Base64 & Multi-Line Specs",
        "material": "Italian Grain Leather & Teak Wood Framework",
        "dimensions": "260cm L × 110cm W × 115cm H",
        "color": "Cream Italian Upholstery (Dark Espresso Stain #3D2314)",
        "design_description": long_additional_specs,
        "reference_image": multiple_images_with_data_url
    }

    resp = client.post("/api/production/custom-orders", json=payload)
    print(f"POST Response Status Code: {resp.status_code}")
    assert resp.status_code == 200, f"POST failed: {resp.text}"

    created = resp.json()
    order_id = created["custom_order_id"]
    print(f"Successfully Created Custom Order #{order_id} with Heavy Data!")

    # Verify Customer GET
    cust_get = client.get("/api/production/custom-orders?customer_email=testclient.beta@example.com")
    assert cust_get.status_code == 200
    cust_orders = cust_get.json()
    matched = [o for o in cust_orders if o["custom_order_id"] == order_id]
    assert len(matched) == 1, "Order missing from Customer GET response!"

    target = matched[0]
    print(f"Customer My Orders API returned Order #{order_id}!")
    print(f"Retained Reference Image Length: {len(target['reference_image'])} characters")
    print(f"Retained Design Specs Length: {len(target['design_description'])} characters")
    assert target["reference_image"] == multiple_images_with_data_url, "Data URL image truncated or missing!"
    assert target["design_description"] == long_additional_specs, "Additional specifications truncated or missing!"

    # Verify Production Staff GET
    staff_get = client.get("/api/production/custom-orders")
    assert staff_get.status_code == 200
    staff_orders = staff_get.json()
    staff_matched = [o for o in staff_orders if o["custom_order_id"] == order_id]
    assert len(staff_matched) == 1, "Order missing from Production Staff GET response!"
    print(f"Production Staff API returned Order #{order_id} successfully!")

    # Cleanup
    db = SessionLocal()
    try:
        db.query(models.ProductionProgress).filter(models.ProductionProgress.custom_order_id == order_id).delete()
        db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).delete()
        db.commit()
        print(f"Cleaned up test order #{order_id}.")
    finally:
        db.close()

    print("\nHEAVY DATA URL & SPECIFICATIONS TEST PASSED 100% SUCCESSFULLY!\n")

if __name__ == "__main__":
    test_long_data_url_and_specs()
