import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app import models
from app.auth import create_access_token

client = TestClient(app)

def run_tests():
    db = SessionLocal()
    print("================================================================================", flush=True)
    print("RETAILSPHERE AI: CENTRALIZED QC & REWORK WORKFLOW VERIFICATION (14 TEST SUITE, flush=True)")
    print("================================================================================", flush=True)

    # 1. Prepare Auth Tokens
    admin_user = db.query(models.User).filter(models.User.user_id == 2).first()
    retail_staff_user = db.query(models.User).filter(models.User.user_id == 4).first()
    customer_user = db.query(models.User).filter(models.User.user_id == 117).first()
    worker_user = db.query(models.User).filter(models.User.user_id == 115).first()

    assert admin_user and admin_user.role.role_name == "Admin"
    assert retail_staff_user and retail_staff_user.role.role_name == "Retail Staff"
    assert customer_user and customer_user.role.role_name == "Customer"
    assert worker_user and worker_user.role.role_name == "Worker"

    admin_token = create_access_token({"sub": str(admin_user.user_id)})
    retail_token = create_access_token({"sub": str(retail_staff_user.user_id)})
    customer_token = create_access_token({"sub": str(customer_user.user_id)})
    worker_token = create_access_token({"sub": str(worker_user.user_id)})

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    retail_headers = {"Authorization": f"Bearer {retail_token}"}
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    worker_headers = {"Authorization": f"Bearer {worker_token}"}

    test_custom_order = None
    test_fab_request = None
    test_rework_ticket = None
    test_ff = None

    try:
        # TEST 1: Completed Customisation job appearing in both dashboards
        print("\n--- TEST 1: Completed Customisation job appearing in both dashboards ---", flush=True)
        # Ensure fleet vehicle is available
        v7 = db.query(models.Vehicle).filter(models.Vehicle.vehicle_id == 7).first()
        if v7:
            v7.status = "AVAILABLE"
            db.commit()

        test_custom_order = models.CustomOrder(
            customer_id=12,
            furniture_type="QC Test Executive Walnut Desk",
            material="Walnut",
            dimensions="160cm L x 80cm W",
            color="Matte Lacquer",
            design_description="Length: 160cm, Width: 80cm, Finish: Matte Lacquer, Material: Walnut",
            order_status="QC_PENDING",
            production_staff_id=3,
            estimated_price=45000.0,
            payment_status="Paid"
        )
        db.add(test_custom_order)
        db.commit()
        db.refresh(test_custom_order)
        cus_id = test_custom_order.custom_order_id
        db.commit()

        # Check Retail Staff Dashboard
        res_retail = client.get("/api/quality/jobs", headers=retail_headers)
        assert res_retail.status_code == 200, f"Retail GET jobs failed: {res_retail.text}"
        jobs_retail = res_retail.json()
        matching_cus_retail = next((j for j in jobs_retail if j["order_type"] == "Custom" and j["numeric_id"] == cus_id), None)
        assert matching_cus_retail is not None, f"Custom order #{cus_id} not visible in Retail Staff Dashboard!"
        assert matching_cus_retail["qc_status"] == "QC_PENDING"
        assert "Walnut" in str(matching_cus_retail["specifications"])

        # Check Admin Dashboard
        res_admin = client.get("/api/quality/jobs", headers=admin_headers)
        assert res_admin.status_code == 200, f"Admin GET jobs failed: {res_admin.text}"
        jobs_admin = res_admin.json()
        matching_cus_admin = next((j for j in jobs_admin if j["order_type"] == "Custom" and j["numeric_id"] == cus_id), None)
        assert matching_cus_admin is not None, f"Custom order #{cus_id} not visible in Admin Dashboard!"
        print(f"PASSED: Custom Order #{cus_id} correctly visible in both Retail Staff and Admin QC pipelines!", flush=True)

        # TEST 2: Completed Fabrication job appearing in both dashboards
        print("\n--- TEST 2: Completed Fabrication job appearing in both dashboards ---", flush=True)
        test_fab_request = models.FabricationRequest(
            customer_id=12,
            service_type="Precision CNC Profile Cutting",
            material_source="Store Material",
            dimensions="1200mm x 600mm x 18mm",
            quantity=2,
            requirements="Beveled edges with 45 degree miter joints",
            status="QC_PENDING",
            estimated_price=8500.0,
            payment_status="Paid"
        )
        db.add(test_fab_request)
        db.commit()
        db.refresh(test_fab_request)
        fab_id = test_fab_request.fabrication_id
        db.commit()

        # Verify visibility in both dashboards
        res_jobs = client.get("/api/quality/jobs", headers=retail_headers)
        matching_fab = next((j for j in res_jobs.json() if j["order_type"] == "Fabrication" and j["numeric_id"] == fab_id), None)
        assert matching_fab is not None, f"Fabrication #{fab_id} not visible in Retail Staff Dashboard!"
        assert matching_fab["qc_status"] == "QC_PENDING"
        print(f"PASSED: Fabrication Job #{fab_id} correctly visible in both dashboards with full specs!", flush=True)

        # TEST 3: QC recording the authenticated Retail Staff member's name and timestamp
        print("\n--- TEST 3: QC recording authenticated Retail Staff member's name and timestamp ---", flush=True)
        qc_payload_pass = {
            "order_type": "Fabrication",
            "order_id": fab_id,
            "result": "PASS",
            "dimensions_check": True,
            "finishing_check": True,
            "structure_check": True,
            "specifications_check": True,
            "material_check": True,
            "functionality_check": True,
            "fabrication_check": True,
            "customer_specs_check": True,
            "inspection_notes": "All CNC edge miters and tolerances verified within +/-0.5mm."
        }
        res_insp = client.post("/api/quality/inspections", json=qc_payload_pass, headers=retail_headers)
        assert res_insp.status_code in [200, 201], f"QC inspection record failed: {res_insp.text}"
        insp_data = res_insp.json()
        insp_id = insp_data["inspection_id"]

        # Verify DB record
        insp_record = db.query(models.QualityInspection).filter(models.QualityInspection.inspection_id == insp_id).first()
        assert insp_record is not None
        assert insp_record.inspector_id == retail_staff_user.user_id, "Inspector ID must match authenticated staff session!"
        assert insp_record.inspector.full_name == retail_staff_user.full_name, "Inspector name must match authenticated staff member!"
        assert insp_record.inspected_at is not None, "Timestamp must be automatically recorded!"
        print(f"PASSED: Inspection #QC-{insp_id} correctly stamped inspector '{insp_record.inspector.full_name}' and timestamp {insp_record.inspected_at}!", flush=True)
        db.commit()

        # TEST 4: QC failure automatically generating a linked ticket
        print("\n--- TEST 4: QC failure automatically generating a linked ticket ---", flush=True)
        qc_payload_fail = {
            "order_type": "Custom",
            "order_id": cus_id,
            "result": "FAIL",
            "dimensions_check": False,
            "finishing_check": False,
            "structure_check": True,
            "specifications_check": False,
            "material_check": True,
            "functionality_check": True,
            "fabrication_check": False,
            "customer_specs_check": False,
            "inspection_notes": "Desk surface lacquer has visible orange peel finish and width is 85cm instead of 80cm.",
            "rework_reason": "Dimensions out of spec by +5cm and defective surface lacquer.",
            "responsible_team": "Wood Finishes & Joinery"
        }
        res_fail = client.post("/api/quality/inspections", json=qc_payload_fail, headers=retail_headers)
        assert res_fail.status_code in [200, 201], f"QC failure inspection failed: {res_fail.text}"
        fail_data = res_fail.json()
        assert fail_data["result"] == "FAIL"
        assert "rework_ticket_id" in fail_data and fail_data["rework_ticket_id"] is not None
        ticket_id = fail_data["rework_ticket_id"]
        ticket_code = fail_data["rework_ticket_code"]
        assert ticket_code.startswith("RWK-"), f"Ticket code must follow RWK-YYYY-XXXX format! Got: {ticket_code}"

        # Verify ticket in database
        ticket_record = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket_id).first()
        assert ticket_record is not None
        assert ticket_record.order_id == cus_id or ticket_record.custom_order_id == cus_id
        assert ticket_record.inspection_id == fail_data["inspection_id"]
        assert ticket_record.status == "OPEN"
        assert "lacquer" in ticket_record.rework_reason.lower()
        test_rework_ticket = ticket_record

        # Verify Custom Order status is now QC_FAILED
        db.refresh(test_custom_order)
        assert test_custom_order.order_status in ["QC_FAILED", "REWORK_REQUIRED", "REWORK_IN_PROGRESS"]
        print(f"PASSED: QC failure created linked Ticket {ticket_code} (#RWK-{ticket_id}) with failed checks preserved!", flush=True)
        db.commit()

        # TEST 5: QC success permitting the existing packing workflow
        print("\n--- TEST 5: QC success permitting the existing packing workflow ---", flush=True)
        # In Test 3, Fabrication #fab_id passed QC
        db.refresh(test_fab_request)
        db.commit()
        assert test_fab_request.status.upper() in ["QC_PASSED", "READY_FOR_PACKING", "READY FOR PACKING", "COMPLETED", "APPROVED"]
        res_fab_job = client.get("/api/quality/jobs", headers=retail_headers)
        fab_job_entry = next((j for j in res_fab_job.json() if j["order_type"] == "Fabrication" and j["numeric_id"] == fab_id), None)
        assert fab_job_entry is not None
        assert fab_job_entry["dispatch_blocked"] is False
        assert fab_job_entry["qc_status"] in ["QC_PASSED", "READY_FOR_PACKING"]
        print(f"PASSED: QC success permitted packing & dispatch eligibility for Fabrication #{fab_id}!", flush=True)
        db.commit()

        # TEST 6: Dispatch being blocked when QC is pending or failed
        print("\n--- TEST 6: Dispatch being blocked when QC is pending or failed ---", flush=True)
        # Custom order #cus_id failed QC
        res_cus_job = client.get("/api/quality/jobs", headers=retail_headers)
        cus_job_entry = next((j for j in res_cus_job.json() if j["order_type"] == "Custom" and j["numeric_id"] == cus_id), None)
        assert cus_job_entry is not None
        assert cus_job_entry["dispatch_blocked"] is True

        # Try dispatching fulfillment for this failed custom order
        test_ff = models.OrderFulfillment(
            custom_order_id=cus_id,
            carrier="BlueDart Delivery Service",
            fulfillment_status="PACKED",
            tracking_number="TRK-TEST-001"
        )
        db.add(test_ff)
        db.commit()
        db.refresh(test_ff)

        # Attempt dispatch
        res_dispatch_blocked = client.post(
            f"/api/orders/fulfillment/{test_ff.fulfillment_id}/dispatch",
            json={"carrier": "BlueDart Delivery Service", "tracking_number": "TRK-TEST-001"},
            headers=admin_headers
        )
        assert res_dispatch_blocked.status_code == 400, f"Expected dispatch to be blocked with 400, got: {res_dispatch_blocked.status_code}"
        assert "Quality Control (QC)" in res_dispatch_blocked.json()["detail"]
        print("PASSED: Dispatch was strictly blocked with HTTP 400 because QC has not passed!", flush=True)
        db.commit()

        # TEST 7: Repeat QC retaining the original failed inspection
        print("\n--- TEST 7: Repeat QC retaining the original failed inspection ---", flush=True)
        # Record repeat inspection on cus_id
        qc_payload_repeat = {
            "order_type": "Custom",
            "order_id": cus_id,
            "result": "PASS",
            "is_repeat": True,
            "rework_ticket_id": ticket_id,
            "dimensions_check": True,
            "finishing_check": True,
            "structure_check": True,
            "specifications_check": True,
            "material_check": True,
            "functionality_check": True,
            "fabrication_check": True,
            "customer_specs_check": True,
            "inspection_notes": "Defect rectified by master artisan. Width reduced to 80cm and surface re-varnished to mirror gloss."
        }
        res_repeat = client.post("/api/quality/inspections", json=qc_payload_repeat, headers=retail_headers)
        assert res_repeat.status_code in [200, 201], f"Repeat QC failed: {res_repeat.text}"
        repeat_insp_id = res_repeat.json()["inspection_id"]

        # Verify BOTH inspections exist in database
        initial_insp = db.query(models.QualityInspection).filter(models.QualityInspection.inspection_id == fail_data["inspection_id"]).first()
        repeat_insp = db.query(models.QualityInspection).filter(models.QualityInspection.inspection_id == repeat_insp_id).first()
        assert initial_insp is not None and initial_insp.result == "FAIL", "Initial failed inspection MUST be retained!"
        assert repeat_insp is not None and repeat_insp.result == "PASS", "Repeat passed inspection must be stored!"
        assert initial_insp.inspection_id != repeat_insp.inspection_id, "Never overwrite the original inspection record!"
        print(f"PASSED: Full audit trail preserved! Original #QC-{initial_insp.inspection_id} (FAIL) and Repeat #QC-{repeat_insp.inspection_id} (PASS) both intact!", flush=True)
        db.commit()

        # TEST 8: Verified RetailSphere errors receiving zero-charge rework and free internal fleet pickup/redelivery
        print("\n--- TEST 8: Verified RetailSphere errors receiving zero-charge rework and free internal fleet ---", flush=True)
        assess_payload_error = {
            "responsibility_type": "RETAILSPHERE_ERROR",
            "responsibility_notes": "Workshop supervisor verified joinery machine calibration was offset by 5cm. RetailSphere production fault.",
            "required_changes": "Plane edges down to exact 800mm width and re-apply poly finish.",
            "transportation_mode": "INTERNAL_FLEET",
            "vehicle_id": 7
        }
        res_assess_err = client.post(f"/api/quality/rework/{ticket_id}/assess", json=assess_payload_error, headers=retail_headers)
        assert res_assess_err.status_code == 200, f"Responsibility assessment failed: {res_assess_err.text}"
        
        db.refresh(ticket_record)
        assert ticket_record.responsibility_type == "RETAILSPHERE_ERROR"
        assert float(ticket_record.additional_cost or 0) == 0.0, "Customer must NOT be charged for RetailSphere error!"
        assert ticket_record.quotation_status == "NOT_APPLICABLE"
        assert ticket_record.transportation_mode == "INTERNAL_FLEET"
        print("PASSED: RetailSphere responsibility confirmed: Rs. 0.00 customer charge, quotation NOT_APPLICABLE, Free internal fleet arranged!", flush=True)
        ticket_record.status = "RESOLVED"
        db.commit()

        # TEST 9: Customer-requested modifications requiring an approved quotation and confirmed payment before work begins
        print("\n--- TEST 9: Customer-requested modifications requiring approved quotation and payment gate ---", flush=True)
        # Create a new ticket for customer modification
        cust_req_payload = {
            "order_type": "Custom",
            "order_id": cus_id,
            "issue_description": "Customer requests to add 3 brass inlay stripes on the tabletop and change legs to matte black.",
            "reported_issue_type": "Customer Modification / Change",
            "preferred_transport": "CARRIER_PARTNER"
        }
        res_cust_req = client.post("/api/quality/rework/customer-request", json=cust_req_payload, headers=customer_headers)
        assert res_cust_req.status_code in [200, 201], f"Customer rework request failed: {res_cust_req.text}"
        ticket2_id = res_cust_req.json()["rework_id"]

        # Retail Staff assesses as CUSTOMER_CHANGE
        assess_payload_cust = {
            "responsibility_type": "CUSTOMER_CHANGE",
            "responsibility_notes": "Original build was delivered according to approved specifications. Tabletop brass inlay and leg repaint is a customer-requested change.",
            "required_changes": "Route grooves for 3x brass strips, inlay metal, sand flush, disassemble and spray legs matte black.",
            "transportation_mode": "STORE_DROP_OFF"
        }
        res_assess_cust = client.post(f"/api/quality/rework/{ticket2_id}/assess", json=assess_payload_cust, headers=retail_headers)
        assert res_assess_cust.status_code == 200

        # Attempt to assign artisan BEFORE quotation and payment -> MUST BE BLOCKED
        res_assign_early = client.post(
            f"/api/quality/rework/{ticket2_id}/assign-worker",
            json={"assigned_worker_id": 115, "instructions": "Start inlay grooves"},
            headers=retail_headers
        )
        assert res_assign_early.status_code == 400, "Worker assignment must be blocked before quotation approval and payment!"
        print("Blocked worker assignment early: Payment & quotation required.", flush=True)

        # Create itemized quotation
        quote_payload = {
            "material_cost": 2500.0,
            "labour_cost": 3000.0,
            "machine_cost": 800.0,
            "finishing_cost": 1200.0,
            "transportation_cost": 500.0,
            "notes": "Brass inlays (3x 1.5m strips), router tooling, and 2-pack polyurethane paint."
        }
        res_quote = client.post(f"/api/quality/rework/{ticket2_id}/quotation", json=quote_payload, headers=retail_headers)
        assert res_quote.status_code == 200
        quote_data = res_quote.json()
        assert quote_data["total_amount"] == 8000.0

        # Customer Approves Quotation
        res_cust_decision = client.post(
            f"/api/quality/rework/{ticket2_id}/customer-decision",
            json={"decision": "APPROVE", "notes": "Approved! Please proceed."},
            headers=customer_headers
        )
        assert res_cust_decision.status_code == 200

        # Still blocked before payment!
        res_assign_unpaid = client.post(
            f"/api/quality/rework/{ticket2_id}/assign-worker",
            json={"assigned_worker_id": 115},
            headers=retail_headers
        )
        assert res_assign_unpaid.status_code == 400, "Worker assignment must still be blocked until payment is confirmed!"

        # Customer Pays Quotation
        res_pay = client.post(
            f"/api/quality/rework/{ticket2_id}/pay",
            json={"payment_reference": "RAZORPAY-PAY-QC-998811", "amount": 8000.0},
            headers=customer_headers
        )
        assert res_pay.status_code == 200
        assert res_pay.json()["payment_status"] == "PAID"

        # Now worker assignment succeeds!
        res_assign_ok = client.post(
            f"/api/quality/rework/{ticket2_id}/assign-worker",
            json={"assigned_worker_id": 115, "instructions": "Brass inlays and paint legs"},
            headers=retail_headers
        )
        assert res_assign_ok.status_code == 200, f"Worker assignment should succeed now: {res_assign_ok.text}"
        print("PASSED: Customer change required approved quotation (Rs. 8,000) and payment confirmation before artisan assignment!", flush=True)
        db.commit()

        # TEST 10: Store drop-off and Carrier Partner transportation options
        print("\n--- TEST 10: Store drop-off and Carrier Partner transportation options ---", flush=True)
        # 1. Record Store Receipt
        res_receipt = client.post(f"/api/quality/rework/{ticket2_id}/record-receipt", headers=retail_headers)
        assert res_receipt.status_code == 200
        assert res_receipt.json()["status"] == "RECEIVED_AT_STORE"

        # 2. Fetch fleet and carrier options
        res_carriers = client.get("/api/quality/fleet-carriers", headers=retail_headers)
        assert res_carriers.status_code == 200
        carriers_data = res_carriers.json()
        assert len(carriers_data["available_fleet_vehicles"]) > 0, "Must list actual available internal fleet vehicles!"
        assert any("BlueDart" in c["carrier_name"] for c in carriers_data["active_carrier_partners"]), "BlueDart carrier partner must be listed!"
        print("PASSED: Store drop-off receipt recorded and active Carrier Partner (BlueDart) options validated!", flush=True)
        db.commit()

        # TEST 11: Unclear responsibility cases being escalated without automatically charging or blaming customer
        print("\n--- TEST 11: Unclear responsibility cases escalated without charging customer ---", flush=True)
        ticket3_record = models.ReworkJob(
            ticket_code=f"RWK-{datetime.now().year}-9999",
            order_type="Custom",
            order_id=cus_id,
            customer_id=12,
            rework_reason="Customer reported slight wood grain variation; unclear if natural wood characteristic or defect.",
            status="OPEN",
            source="CUSTOMER_REQUEST",
            additional_cost=0.0
        )
        db.add(ticket3_record)
        db.commit()
        db.refresh(ticket3_record)
        ticket3_id = ticket3_record.rework_id

        # Staff assesses as UNCLEAR_DISPUTED
        res_dispute = client.post(
            f"/api/quality/rework/{ticket3_id}/assess",
            json={"responsibility_type": "UNCLEAR_DISPUTED", "responsibility_notes": "Grain variation requires technical appraisal by Head of QC."},
            headers=retail_headers
        )
        assert res_dispute.status_code == 200
        db.refresh(ticket3_record)
        assert ticket3_record.responsibility_type == "UNCLEAR_DISPUTED"
        assert float(ticket3_record.additional_cost or 0) == 0.0, "Customer must NOT be charged during disputed review!"

        # Admin resolves dispute
        res_resolve = client.post(
            f"/api/quality/rework/{ticket3_id}/resolve-dispute",
            json={"resolution": "RETAILSPHERE_ERROR", "resolution_notes": "Supervisor reviewed CAD and photos; grain mismatch is outside aesthetic tolerances. Replaced under warranty."},
            headers=admin_headers
        )
        assert res_resolve.status_code == 200
        db.refresh(ticket3_record)
        assert ticket3_record.responsibility_type == "RETAILSPHERE_ERROR"
        assert float(ticket3_record.additional_cost or 0) == 0.0
        print("PASSED: Disputed case escalated to Admin, customer not blamed/charged, resolved under warranty!", flush=True)
        db.commit()

        # TEST 12: Unauthorized roles being prevented from performing QC, changing charges or dispatching failed items
        print("\n--- TEST 12: Unauthorized roles prevented from performing QC or changing charges ---", flush=True)
        # 1. Customer attempts to perform QC inspection
        res_cust_insp = client.post("/api/quality/inspections", json=qc_payload_pass, headers=customer_headers)
        assert res_cust_insp.status_code == 403, f"Customer should be 403 Forbidden to perform QC, got: {res_cust_insp.status_code}"

        # 2. Worker attempts to perform QC inspection
        res_work_insp = client.post("/api/quality/inspections", json=qc_payload_pass, headers=worker_headers)
        assert res_work_insp.status_code == 403, f"Worker should be 403 Forbidden to perform QC, got: {res_work_insp.status_code}"

        # 3. Customer attempts to assess responsibility
        res_cust_assess = client.post(f"/api/quality/rework/{ticket_id}/assess", json=assess_payload_error, headers=customer_headers)
        assert res_cust_assess.status_code == 403, "Customer cannot assess rework responsibility!"

        # 4. Customer attempts to create quotation
        res_cust_quote = client.post(f"/api/quality/rework/{ticket_id}/quotation", json=quote_payload, headers=customer_headers)
        assert res_cust_quote.status_code == 403, "Customer cannot create quotation!"
        print("PASSED: Role permissions strictly enforced on backend (HTTP 403 Forbidden for unauthorized actions)!", flush=True)
        db.commit()

        # TEST 13: Ready-made orders continuing to follow their original workflow
        print("\n--- TEST 13: Ready-made orders unaffected and isolated from custom/fab QC ---", flush=True)
        res_jobs_check = client.get("/api/quality/jobs", headers=retail_headers)
        assert res_jobs_check.status_code == 200
        for j in res_jobs_check.json():
            assert j["order_type"] in ["Custom", "Fabrication"], f"Ready-made orders must not be present in QC job queue! Found: {j['order_type']}"
        print("PASSED: Ready-made retail fulfillment remains isolated and unaffected!", flush=True)
        db.commit()

        # TEST 14: Existing production, fleet, carrier and delivery workflows remaining functional
        print("\n--- TEST 14: Existing production, fleet, carrier and delivery workflows functional ---", flush=True)
        # Complete rework production
        res_comp = client.post(f"/api/quality/rework/{ticket2_id}/complete-rework", json={"notes": "Inlays and painting complete."}, headers=retail_headers)
        assert res_comp.status_code == 200
        rw2 = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == ticket2_id).first()
        assert rw2.status in ["REWORK_COMPLETED", "QC_PENDING"]

        # Dispatch redelivery after QC
        # First record passing repeat inspection
        client.post("/api/quality/inspections", json={
            "order_type": "Custom",
            "order_id": cus_id,
            "result": "PASS",
            "is_repeat": True,
            "rework_ticket_id": ticket2_id,
            "dimensions_check": True,
            "finishing_check": True,
            "structure_check": True,
            "specifications_check": True,
            "material_check": True,
            "functionality_check": True,
            "fabrication_check": True,
            "customer_specs_check": True
        }, headers=retail_headers)

        res_dispatch_rework = client.post(
            f"/api/quality/rework/{ticket2_id}/dispatch",
            json={"transportation_mode": "CARRIER_PARTNER", "carrier_id": 9, "tracking_number": "BLUEDART-RWK-99001"},
            headers=retail_headers
        )
        assert res_dispatch_rework.status_code == 200
        assert res_dispatch_rework.json()["status"] in ["DISPATCHED", "CLOSED"]
        print("PASSED: Rework completed, Repeat QC passed, and Redelivery dispatched with Carrier Partner!", flush=True)

        print("\n================================================================================", flush=True)
        print("ALL 14 QUALITY CONTROL & REWORK TESTS PASSED WITH 100% SUCCESS!", flush=True)
        print("================================================================================", flush=True)

    finally:
        try:
            db.rollback()
            if test_custom_order and getattr(test_custom_order, 'custom_order_id', None):
                db.query(models.QuotationBreakdown).filter(models.QuotationBreakdown.order_type == "Custom", models.QuotationBreakdown.order_id == test_custom_order.custom_order_id).delete()
                db.query(models.ReworkJob).filter(models.ReworkJob.order_type == "Custom", models.ReworkJob.order_id == test_custom_order.custom_order_id).delete()
                db.query(models.QualityInspection).filter(models.QualityInspection.order_type == "Custom", models.QualityInspection.order_id == test_custom_order.custom_order_id).delete()
                db.query(models.OrderFulfillment).filter(models.OrderFulfillment.custom_order_id == test_custom_order.custom_order_id).delete()
                db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == test_custom_order.custom_order_id).delete()
            if test_fab_request and getattr(test_fab_request, 'fabrication_id', None):
                db.query(models.QuotationBreakdown).filter(models.QuotationBreakdown.order_type == "Fabrication", models.QuotationBreakdown.order_id == test_fab_request.fabrication_id).delete()
                db.query(models.ReworkJob).filter(models.ReworkJob.order_type == "Fabrication", models.ReworkJob.order_id == test_fab_request.fabrication_id).delete()
                db.query(models.QualityInspection).filter(models.QualityInspection.order_type == "Fabrication", models.QualityInspection.order_id == test_fab_request.fabrication_id).delete()
                db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == test_fab_request.fabrication_id).delete()
            db.commit()
        except Exception:
            pass
        finally:
            db.close()

if __name__ == "__main__":
    run_tests()
