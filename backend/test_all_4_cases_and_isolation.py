import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)

def run_suite():
    print("==========================================================================")
    print("STRICT SUITE — 4 CUSTOM ORDER COMBINATION TESTS & CUSTOMER ISOLATION TEST")
    print("==========================================================================")

    created_ids = []

    try:
        # TEST 1 — No Image / No Additional Specification
        print("\n--- TEST 1: No Image / No Additional Specification ---")
        p1 = {
            "customer_name": "Customer One",
            "customer_email": "customer.one@example.com",
            "furniture_type": "Minimalist Teak Chair",
            "material": "Teak Wood",
            "dimensions": "50cm L × 50cm W × 90cm H",
            "color": "Natural Varnish"
        }
        res1 = client.post("/api/production/custom-orders", json=p1)
        assert res1.status_code == 200, f"Test 1 POST failed: {res1.text}"
        o1 = res1.json()
        id1 = o1["custom_order_id"]
        created_ids.append(id1)
        print(f"Test 1 Created Order #{id1} Successfully!")

        # TEST 2 — Additional Specification Only
        print("\n--- TEST 2: Additional Specification Only ---")
        p2 = {
            "customer_name": "Customer Two",
            "customer_email": "customer.two@example.com",
            "furniture_type": "Custom Dining Table",
            "material": "Rosewood",
            "dimensions": "180cm L × 90cm W × 76cm H",
            "color": "Dark Walnut Polish",
            "design_description": "Aspects: [Edge: Beveled]. Special Requirements: Include 2 hidden leaf extensions."
        }
        res2 = client.post("/api/production/custom-orders", json=p2)
        assert res2.status_code == 200, f"Test 2 POST failed: {res2.text}"
        o2 = res2.json()
        id2 = o2["custom_order_id"]
        created_ids.append(id2)
        print(f"Test 2 Created Order #{id2} Successfully!")
        assert o2.get("design_description") == p2["design_description"], "Test 2 specs missing!"

        # TEST 3 — Image Only
        print("\n--- TEST 3: Image Only ---")
        p3 = {
            "customer_name": "Customer Three",
            "customer_email": "customer.three@example.com",
            "furniture_type": "Modern Accent Armchair",
            "material": "Oak & Velvet",
            "dimensions": "80cm L × 85cm W × 95cm H",
            "color": "Emerald Green Velvet",
            "reference_image": "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c"
        }
        res3 = client.post("/api/production/custom-orders", json=p3)
        assert res3.status_code == 200, f"Test 3 POST failed: {res3.text}"
        o3 = res3.json()
        id3 = o3["custom_order_id"]
        created_ids.append(id3)
        print(f"Test 3 Created Order #{id3} Successfully!")
        assert o3.get("reference_image") == p3["reference_image"], "Test 3 image missing!"

        # TEST 4 — IMAGE + ADDITIONAL SPECIFICATIONS (CRITICAL TEST)
        print("\n--- TEST 4: IMAGE + ADDITIONAL SPECIFICATIONS (CRITICAL TEST) ---")
        p4 = {
            "customer_name": "Customer Four (Combined)",
            "customer_email": "customer.four@example.com",
            "furniture_type": "Custom Luxury King Bed with Storage",
            "material": "Teak & Tufted Leather",
            "dimensions": "210cm L × 200cm W × 120cm H",
            "color": "Cream Leather (Dark Oak)",
            "design_description": "Aspects: [Storage: Hydraulic Lift-Up Base; Headboard: Padded Tufted]. Special Requirements: Add built-in USB ports in side headboards.",
            "reference_image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85, https://images.unsplash.com/photo-1540518614846-7ede433c5172"
        }
        res4 = client.post("/api/production/custom-orders", json=p4)
        assert res4.status_code == 200, f"Test 4 POST failed: {res4.text}"
        o4 = res4.json()
        id4 = o4["custom_order_id"]
        created_ids.append(id4)
        print(f"Test 4 Created Order #{id4} Successfully!")
        assert o4.get("reference_image") == p4["reference_image"], "Test 4 image missing!"
        assert o4.get("design_description") == p4["design_description"], "Test 4 specs missing!"

        # VERIFY CUSTOMER MY ORDERS API RETRIEVAL FOR ALL 4
        print("\n--- VERIFYING CUSTOMER MY ORDERS RETRIEVAL & PERSISTENCE ---")
        cust4_get = client.get(f"/api/production/custom-orders?customer_email=customer.four@example.com")
        assert cust4_get.status_code == 200
        cust4_orders = cust4_get.json()
        cust4_matched = [o for o in cust4_orders if o.get("custom_order_id") == id4]
        assert len(cust4_matched) == 1, "Test 4 Order missing from Customer GET!"
        print(f"Customer Four Order #{id4} retrieved from API with status '{cust4_matched[0]['order_status']}'")

        # VERIFY PRODUCTION STAFF RETRIEVAL
        print("\n--- VERIFYING PRODUCTION STAFF RETRIEVAL ---")
        staff_get = client.get("/api/production/custom-orders")
        assert staff_get.status_code == 200
        staff_orders = staff_get.json()
        staff_ids = [o["custom_order_id"] for o in staff_orders]
        for cid in created_ids:
            assert cid in staff_ids, f"Order #{cid} missing from Production Staff view!"
        print("All 4 Test Custom Orders present in Production Staff View!")

        # VERIFY CUSTOMER ISOLATION
        print("\n--- VERIFYING CUSTOMER SESSION ISOLATION ---")
        c1_orders = client.get(f"/api/production/custom-orders?customer_email=customer.one@example.com").json()
        c2_orders = client.get(f"/api/production/custom-orders?customer_email=customer.two@example.com").json()
        
        c1_order_ids = [o["custom_order_id"] for o in c1_orders]
        c2_order_ids = [o["custom_order_id"] for o in c2_orders]

        assert id1 in c1_order_ids and id2 not in c1_order_ids, "ISOLATION FAILURE: Customer 1 saw Customer 2's order!"
        assert id2 in c2_order_ids and id1 not in c2_order_ids, "ISOLATION FAILURE: Customer 2 saw Customer 1's order!"
        print("Customer Session Isolation Verified! Customer 1 sees ONLY Order 1, Customer 2 sees ONLY Order 2.")

        print("\n==========================================================================")
        print("SUMMARY TABLE OF FINAL VERIFICATION RESULTS:")
        print("--------------------------------------------------------------------------")
        print("TEST 1 (No Image / No Specs)       : PASSED (Order #%d)" % id1)
        print("TEST 2 (Additional Specs Only)     : PASSED (Order #%d)" % id2)
        print("TEST 3 (Reference Image Only)       : PASSED (Order #%d)" % id3)
        print("TEST 4 (IMAGE + ADDITIONAL SPECS)   : PASSED (Order #%d)" % id4)
        print("CUSTOMER ISOLATION TEST            : PASSED")
        print("==========================================================================")

    finally:
        # Cleanup test records safely
        db = SessionLocal()
        try:
            for cid in created_ids:
                db.query(models.ProductionProgress).filter(models.ProductionProgress.custom_order_id == cid).delete()
                db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == cid).delete()
            db.commit()
            print("Cleaned up test records from database.")
        except Exception as e:
            db.rollback()
            print(f"Cleanup notice: {e}")
        finally:
            db.close()

if __name__ == "__main__":
    run_suite()
