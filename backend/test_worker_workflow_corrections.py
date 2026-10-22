import sys
import os
import json
os.environ["ALLOW_SQLITE_FALLBACK"] = "1"
import functools
from datetime import datetime, date, timedelta

print = functools.partial(print, flush=True)

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, get_db
from app import models, auth

# Isolated SQLite Test Database Configuration
TEST_DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_worker_isolated.db")
test_engine = create_engine(f"sqlite:///{TEST_DB_FILE.replace('\\', '/')}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def run_all_tests():
    print("=" * 75)
    print("RETAILSPHERE AI — 15 WORKER WORKFLOW & QC SUITE VERIFICATION")
    print("TARGET: ISOLATED DISPOSABLE TEST DATABASE (SQLite: test_worker_isolated.db)")
    print("=" * 75)

    # Re-initialize clean isolated schema
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()
    cleanups = []

    # Pre-seed system roles in isolated database
    roles = [
        (1, "Customer"),
        (2, "Admin"),
        (3, "Retail Staff"),
        (4, "Production Staff"),
        (5, "Worker"),
        (6, "Carrier Partner"),
        (7, "Delivery Personnel"),
    ]
    for r_id, r_name in roles:
        db.add(models.Role(role_id=r_id, role_name=r_name))
    db.commit()

    try:
        # 1. SETUP TEST USERS & ROLES
        # Roles: 1: Customer, 2: Admin, 3: Production Staff, 4: Worker / Artisan Worker
        staff_user = db.query(models.User).filter(models.User.email == "test_staff_qc@example.com").first()
        if not staff_user:
            staff_user = models.User(
                email="test_staff_qc@example.com",
                full_name="QC Test Supervisor",
                role_id=4,
                status=True
            )
            db.add(staff_user)
        else:
            staff_user.role_id = 4
            staff_user.status = True
        db.commit()
        db.refresh(staff_user)
        cleanups.append(("User", staff_user.user_id))

        customer_user = db.query(models.User).filter(models.User.email == "test_cust_qc@example.com").first()
        if not customer_user:
            customer_user = models.User(
                email="test_cust_qc@example.com",
                full_name="QC Test Customer",
                role_id=1,
                status=True
            )
            db.add(customer_user)
        else:
            customer_user.role_id = 1
            customer_user.status = True
        db.commit()
        db.refresh(customer_user)
        cleanups.append(("User", customer_user.user_id))

        cust_profile = db.query(models.Customer).filter(models.Customer.user_id == customer_user.user_id).first()
        if not cust_profile:
            cust_profile = models.Customer(
                user_id=customer_user.user_id,
                address="45 QC Road, Sector 5",
                city="Kottayam",
                state="Kerala",
                pincode="686001"
            )
            db.add(cust_profile)
            db.commit()
            db.refresh(cust_profile)
        cleanups.append(("Customer", cust_profile.customer_id))

        worker_carpenter = db.query(models.User).filter(models.User.email == "test_carpenter_qc@example.com").first()
        if not worker_carpenter:
            worker_carpenter = models.User(
                email="test_carpenter_qc@example.com",
                full_name="QC Master Carpenter",
                role_id=5,
                status=True,
                specialization="Woodwork & Carpentry"
            )
            db.add(worker_carpenter)
        else:
            worker_carpenter.role_id = 5
            worker_carpenter.status = True
            worker_carpenter.specialization = "Woodwork & Carpentry"
        db.commit()
        db.refresh(worker_carpenter)
        cleanups.append(("User", worker_carpenter.user_id))

        worker_upholsterer = db.query(models.User).filter(models.User.email == "test_upholsterer_qc@example.com").first()
        if not worker_upholsterer:
            worker_upholsterer = models.User(
                email="test_upholsterer_qc@example.com",
                full_name="QC Master Upholsterer",
                role_id=5,
                status=True,
                specialization="Upholstery"
            )
            db.add(worker_upholsterer)
        else:
            worker_upholsterer.role_id = 5
            worker_upholsterer.status = True
            worker_upholsterer.specialization = "Upholstery"
        db.commit()
        db.refresh(worker_upholsterer)
        cleanups.append(("User", worker_upholsterer.user_id))

        # Generate tokens
        staff_token = auth.create_access_token(data={"sub": str(staff_user.user_id)})
        carpenter_token = auth.create_access_token(data={"sub": str(worker_carpenter.user_id)})
        customer_token = auth.create_access_token(data={"sub": str(customer_user.user_id)})

        staff_headers = {"Authorization": f"Bearer {staff_token}"}
        carpenter_headers = {"Authorization": f"Bearer {carpenter_token}"}
        customer_headers = {"Authorization": f"Bearer {customer_token}"}

        print("\nSetup test users & authentication tokens completed.")

        # =========================================================================
        # TEST 1 & 2: Sequential Stage Completion & Parent Order QC_PENDING
        # =========================================================================
        print("\n--- TEST 1 & 2: Stage 1 Completion Unlocks Stage 2, Final Stage Moves to QC_PENDING ---")
        order1 = models.CustomOrder(
            customer_id=cust_profile.customer_id,
            furniture_type="QC Teak Armchair",
            material="Teak Wood",
            dimensions="80x80x90",
            color="Walnut",
            order_status="In Production",
            review_status="APPROVED",
            payment_status="Paid",
            estimated_price=25000.0
        )
        db.add(order1)
        db.commit()
        db.refresh(order1)
        cleanups.append(("CustomOrder", order1.custom_order_id))

        stage1 = models.ProductionStage(
            order_type="Custom",
            order_id=order1.custom_order_id,
            stage_name="Woodwork & Carpentry",
            sequence_order=1,
            required_skill="Woodwork & Carpentry",
            assigned_worker_id=worker_carpenter.user_id,
            status="IN_PROGRESS",
            progress_percentage=50
        )
        stage2 = models.ProductionStage(
            order_type="Custom",
            order_id=order1.custom_order_id,
            stage_name="Assembly",
            sequence_order=2,
            required_skill="Assembly",
            status="LOCKED",
            progress_percentage=0
        )
        db.add_all([stage1, stage2])
        db.commit()
        db.refresh(stage1)
        db.refresh(stage2)
        cleanups.append(("ProductionStage", stage1.stage_id))
        cleanups.append(("ProductionStage", stage2.stage_id))

        # Complete Stage 1 via Worker Dashboard endpoint
        res = client.post(
            f"/api/worker/my-tasks/stg-{stage1.stage_id}/complete",
            json={"notes": "Framing and joints completed successfully.", "progress_percentage": 100},
            headers=carpenter_headers
        )
        assert res.status_code == 200, f"Stage 1 completion failed: {res.text}"
        data = res.json()
        assert data["task_status"] == "COMPLETED"

        db.refresh(stage1)
        db.refresh(stage2)
        assert stage1.status == "COMPLETED", "Stage 1 not marked COMPLETED"
        assert stage2.status == "READY_FOR_ASSIGNMENT", f"Stage 2 status is {stage2.status}, expected READY_FOR_ASSIGNMENT"
        print("[PASS] Verified: Completing Stage 1 successfully unlocked Stage 2 to READY_FOR_ASSIGNMENT.")

        # Now assign carpenter to Stage 2 and complete Stage 2 (final stage)
        stage2.assigned_worker_id = worker_carpenter.user_id
        stage2.status = "IN_PROGRESS"
        db.commit()

        res2 = client.post(
            f"/api/worker/my-tasks/stg-{stage2.stage_id}/complete",
            json={"notes": "Final assembly complete.", "progress_percentage": 100},
            headers=carpenter_headers
        )
        assert res2.status_code == 200, f"Stage 2 completion failed: {res2.text}"
        db.refresh(order1)
        assert order1.order_status == "QC_PENDING", f"Expected order_status QC_PENDING, got {order1.order_status}"
        print("[PASS] Verified: Completing the final stage transitioned the order to QC_PENDING.")

        # =========================================================================
        # TEST 3: Passing QC Inspection Completes Order
        # =========================================================================
        print("\n--- TEST 3: Passing QC Inspection Transitions Order to COMPLETED ---")
        qc_payload = {
            "order_type": "Custom",
            "order_id": order1.custom_order_id,
            "inspector_id": staff_user.user_id,
            "result": "PASS",
            "dimensions_check": True,
            "finishing_check": True,
            "structure_check": True,
            "specifications_check": True,
            "inspection_notes": "Passed all QC standards with excellent craftsmanship."
        }
        res_qc = client.post("/api/quality/inspections", json=qc_payload)
        assert res_qc.status_code == 201, f"QC PASS inspection failed: {res_qc.text}"
        db.refresh(order1)
        assert order1.order_status == "COMPLETED", f"Expected order COMPLETED after QC pass, got {order1.order_status}"
        print("[PASS] Verified: Quality inspection PASS successfully completed the order through authorized QC path.")

        # =========================================================================
        # TEST 4: Failed QC Inspection Creates Rework Record & Preserves Reinspection
        # =========================================================================
        print("\n--- TEST 4: Failed QC Inspection Creates Rework Job & Preserves Reinspection ---")
        order2 = models.CustomOrder(
            customer_id=cust_profile.customer_id,
            furniture_type="QC Dining Table",
            material="Teak",
            dimensions="180x90x75",
            color="Natural",
            order_status="QC_PENDING",
            review_status="APPROVED",
            payment_status="Paid",
            estimated_price=45000.0
        )
        db.add(order2)
        db.commit()
        db.refresh(order2)
        cleanups.append(("CustomOrder", order2.custom_order_id))

        qc_fail_payload = {
            "order_type": "Custom",
            "order_id": order2.custom_order_id,
            "inspector_id": staff_user.user_id,
            "result": "FAIL",
            "dimensions_check": True,
            "finishing_check": False,
            "structure_check": True,
            "specifications_check": False,
            "inspection_notes": "Table surface finish uneven. Requires sanding and re-polishing.",
            "rework_worker_id": worker_carpenter.user_id
        }
        res_fail = client.post("/api/quality/inspections", json=qc_fail_payload)
        assert res_fail.status_code == 201, f"QC FAIL inspection recording failed: {res_fail.text}"
        db.refresh(order2)
        assert order2.order_status == "REWORK_REQUIRED", f"Expected REWORK_REQUIRED, got {order2.order_status}"

        # Check rework job created
        rework_job = db.query(models.ReworkJob).filter(
            models.ReworkJob.assigned_worker_id == worker_carpenter.user_id
        ).order_by(models.ReworkJob.rework_id.desc()).first()
        assert rework_job is not None, "Rework job record was not created"
        assert rework_job.status == "ASSIGNED"
        cleanups.append(("ReworkJob", rework_job.rework_id))

        # Resolve rework job
        res_resolve = client.put(f"/api/quality/rework/{rework_job.rework_id}/resolve", json={"notes": "Surface re-sanded and polished."})
        assert res_resolve.status_code == 200
        db.refresh(order2)
        assert order2.order_status == "In Production", f"Expected order reset to 'In Production' after rework resolve, got {order2.order_status}"
        print("[PASS] Verified: Failed QC generated rework record; resolving rework reset order to 'In Production' for reinspection.")

        # =========================================================================
        # TEST 5: Legacy Worker Completion & Progress Updates Cannot Bypass QC
        # =========================================================================
        print("\n--- TEST 5: Legacy Completion & Progress Updates Cannot Bypass QC ---")
        order3 = models.CustomOrder(
            customer_id=cust_profile.customer_id,
            furniture_type="QC Coffee Table",
            material="Oak",
            dimensions="100x60x45",
            color="Honey Oak",
            order_status="In Production",
            review_status="APPROVED",
            payment_status="Paid",
            estimated_price=18000.0
        )
        db.add(order3)
        db.commit()
        db.refresh(order3)
        cleanups.append(("CustomOrder", order3.custom_order_id))

        # Progress update with 100% and Ready for Dispatch
        res_prog = client.post("/api/production/update-progress", json={
            "custom_order_id": order3.custom_order_id,
            "stage": "Ready for Dispatch",
            "progress_percentage": 100,
            "remarks": "Workshop manufacturing finished."
        })
        assert res_prog.status_code == 200
        db.refresh(order3)
        assert order3.order_status == "QC_PENDING", f"Progress update bypassed QC! Status: {order3.order_status}"

        # Manual attempt to force "Completed" without passing QC inspection must fail (even by authorized staff)
        res_force = client.put(
            f"/api/production/custom-orders/{order3.custom_order_id}/status",
            json={
                "order_status": "Completed",
                "remarks": "Attempting manual bypass"
            },
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert res_force.status_code == 400, f"Expected 400 for manual bypass attempt without QC, got {res_force.status_code}"
        print("[PASS] Verified: Progress update moves order to QC_PENDING; manual status transition to Completed without passing QC is strictly blocked.")

        # =========================================================================
        # TEST 6: Task Cannot Be Completed Before Starting or Completed Repeatedly
        # =========================================================================
        print("\n--- TEST 6: Task State Machine Enforced (Cannot Complete Before Starting or Duplicate Complete) ---")
        stage_sm = models.ProductionStage(
            order_type="Custom",
            order_id=order1.custom_order_id,
            stage_name="Woodwork & Carpentry",
            sequence_order=10,
            required_skill="Woodwork & Carpentry",
            assigned_worker_id=worker_carpenter.user_id,
            status="ASSIGNED",
            progress_percentage=0
        )
        db.add(stage_sm)
        db.commit()
        db.refresh(stage_sm)
        cleanups.append(("ProductionStage", stage_sm.stage_id))

        # Attempt to complete while still ASSIGNED (unstarted)
        res_unstarted = client.post(
            f"/api/worker/my-tasks/stg-{stage_sm.stage_id}/complete",
            json={"notes": "Trying to complete without starting", "progress_percentage": 100},
            headers=carpenter_headers
        )
        assert res_unstarted.status_code == 400, f"Expected 400 for unstarted completion, got {res_unstarted.status_code}"

        # Start the stage
        res_start = client.post(f"/api/worker/my-tasks/stg-{stage_sm.stage_id}/start", headers=carpenter_headers)
        assert res_start.status_code == 200

        # Complete the stage
        res_comp1 = client.post(
            f"/api/worker/my-tasks/stg-{stage_sm.stage_id}/complete",
            json={"notes": "Now completed validly", "progress_percentage": 100},
            headers=carpenter_headers
        )
        assert res_comp1.status_code == 200

        # Attempt repeated completion
        res_comp2 = client.post(
            f"/api/worker/my-tasks/stg-{stage_sm.stage_id}/complete",
            json={"notes": "Duplicate complete attempt", "progress_percentage": 100},
            headers=carpenter_headers
        )
        assert res_comp2.status_code == 400, f"Expected 400 for duplicate complete, got {res_comp2.status_code}"
        print("[PASS] Verified: Cannot complete an ASSIGNED task before starting; repeated completion of COMPLETED stage rejected.")

        # =========================================================================
        # TEST 7: Locked Stage Cannot Be Started
        # =========================================================================
        print("\n--- TEST 7: Locked Stage Cannot Be Started ---")
        stage_locked = models.ProductionStage(
            order_type="Custom",
            order_id=order1.custom_order_id,
            stage_name="Assembly",
            sequence_order=11,
            required_skill="Assembly",
            assigned_worker_id=worker_carpenter.user_id,
            status="LOCKED",
            progress_percentage=0
        )
        db.add(stage_locked)
        db.commit()
        db.refresh(stage_locked)
        cleanups.append(("ProductionStage", stage_locked.stage_id))

        res_locked_start = client.post(f"/api/worker/my-tasks/stg-{stage_locked.stage_id}/start", headers=carpenter_headers)
        assert res_locked_start.status_code == 400, f"Expected 400 when starting LOCKED stage, got {res_locked_start.status_code}"
        print("[PASS] Verified: Starting a LOCKED stage was rejected.")

        # =========================================================================
        # TEST 8: Unauthenticated Users Cannot Call Assignment Endpoints
        # =========================================================================
        print("\n--- TEST 8: Unauthenticated Requests to Assignment Endpoints Blocked ---")
        endpoints = [
            ("/api/production/assign-worker", {"custom_order_id": order1.custom_order_id, "worker_id": worker_carpenter.user_id}),
            ("/api/production/assign-stage-worker", {"stage_id": stage_sm.stage_id, "worker_id": worker_carpenter.user_id}),
            ("/api/production/onsite/assign-worker", {"service_id": 1, "worker_id": worker_carpenter.user_id}),
            ("/api/production/fabrication/assign-worker", {"fabrication_id": 1, "worker_id": worker_carpenter.user_id}),
            ("/api/services/jobs/assign", {"service_id": 1, "worker_id": worker_carpenter.user_id}),
        ]
        for ep, pl in endpoints:
            r = client.post(ep, json=pl)
            assert r.status_code == 401, f"Expected 401 for unauthenticated {ep}, got {r.status_code}"
        print("[PASS] Verified: All 5 assignment endpoints return HTTP 401 when called without authentication.")

        # =========================================================================
        # TEST 9: Non-Staff Users Cannot Assign Workers
        # =========================================================================
        print("\n--- TEST 9: Authenticated Non-Staff Users Blocked with HTTP 403 ---")
        for ep, pl in endpoints:
            print(f"  Testing non-staff rejection on {ep}...")
            r = client.post(ep, json=pl, headers=customer_headers)
            assert r.status_code == 403, f"Expected 403 for non-staff user on {ep}, got {r.status_code} ({r.text})"
        print("[PASS] Verified: Customer/Worker users attempting worker assignment are rejected with HTTP 403.")

        # =========================================================================
        # TEST 10: Incompatible Worker Specialization Is Rejected
        # =========================================================================
        print("\n--- TEST 10: Incompatible Worker Specialization Rejected ---")
        order_assign = models.CustomOrder(
            customer_id=cust_profile.customer_id,
            furniture_type="QC Special Sofa",
            material="Teak & Velvet",
            dimensions="200x90x85",
            color="Navy Blue",
            order_status="Approved",
            review_status="APPROVED",
            payment_status="Paid",
            estimated_price=42000.0
        )
        db.add(order_assign)
        db.commit()
        db.refresh(order_assign)
        cleanups.append(("CustomOrder", order_assign.custom_order_id))

        stage_uph = models.ProductionStage(
            order_type="Custom",
            order_id=order_assign.custom_order_id,
            stage_name="Upholstery",
            sequence_order=1,
            required_skill="Upholstery",
            status="READY_FOR_ASSIGNMENT"
        )
        db.add(stage_uph)
        db.commit()
        db.refresh(stage_uph)
        cleanups.append(("ProductionStage", stage_uph.stage_id))

        # Assign carpenter (Woodwork & Carpentry) to Upholstery stage
        res_incomp = client.post(
            "/api/production/assign-stage-worker",
            json={"stage_id": stage_uph.stage_id, "worker_id": worker_carpenter.user_id},
            headers=staff_headers
        )
        assert res_incomp.status_code == 400, f"Expected 400 for skill mismatch, got {res_incomp.status_code} ({res_incomp.text})"
        assert "specialization" in res_incomp.text.lower() or "skill" in res_incomp.text.lower(), f"Unexpected error detail: {res_incomp.text}"
        print("[PASS] Verified: Worker with incompatible specialization ('Woodwork & Carpentry' for 'Upholstery') was rejected.")

        # =========================================================================
        # TEST 11: Invalid Worker Availability or Leave Conditions Rejected
        # =========================================================================
        print("\n--- TEST 11: Worker on Approved Leave Rejected ---")
        leave_rec = models.WorkerLeave(
            worker_id=worker_upholsterer.user_id,
            leave_type="Sick Leave",
            start_date=date.today() - timedelta(days=1),
            end_date=date.today() + timedelta(days=2),
            reason="Medical recovery",
            status="Approved"
        )
        db.add(leave_rec)
        db.commit()
        db.refresh(leave_rec)
        cleanups.append(("WorkerLeave", leave_rec.leave_id))

        avail = db.query(models.WorkerAvailability).filter(models.WorkerAvailability.worker_id == worker_upholsterer.user_id).first()
        if not avail:
            avail = models.WorkerAvailability(
                worker_id=worker_upholsterer.user_id,
                status="ON_LEAVE",
                active_jobs_count=0
            )
            db.add(avail)
        else:
            avail.status = "ON_LEAVE"
        db.commit()
        cleanups.append(("WorkerAvailability", avail.availability_id))

        res_leave = client.post(
            "/api/production/assign-stage-worker",
            json={"stage_id": stage_uph.stage_id, "worker_id": worker_upholsterer.user_id},
            headers=staff_headers
        )
        assert res_leave.status_code == 400, f"Expected 400 for worker on leave, got {res_leave.status_code} ({res_leave.text})"
        assert "leave" in res_leave.text.lower()
        print("[PASS] Verified: Worker on approved leave was rejected.")

        # Reset availability back to AVAILABLE and cleanup leave
        avail.status = "AVAILABLE"
        db.query(models.WorkerLeave).filter(models.WorkerLeave.leave_id == leave_rec.leave_id).delete()
        db.commit()

        # =========================================================================
        # TEST 12: Fabrication Cannot Start Before Customer-Owned Material Received
        # =========================================================================
        print("\n--- TEST 12: Fabrication Cannot Start Before Customer-Owned Material Is Received ---")
        c_mat = models.CustomerMaterial(
            customer_id=cust_profile.customer_id,
            material_type="Timber",
            wood_type="Rosewood",
            quantity=15.0,
            unit="sq_ft",
            status="REGISTERED"
        )
        db.add(c_mat)
        db.commit()
        db.refresh(c_mat)
        cleanups.append(("CustomerMaterial", c_mat.material_id))

        fab_req = models.FabricationRequest(
            customer_id=cust_profile.customer_id,
            service_type="Wood Cutting",
            material_source="Customer-Owned",
            customer_material_id=c_mat.material_id,
            dimensions="120x60",
            quantity=2,
            status="PAID",
            payment_status="Paid",
            review_status="APPROVED",
            material_arrival_mode="CUSTOMER_BRINGS"
        )
        db.add(fab_req)
        db.commit()
        db.refresh(fab_req)
        cleanups.append(("FabricationRequest", fab_req.fabrication_id))

        fab_stage = models.ProductionStage(
            order_type="Fabrication",
            order_id=fab_req.fabrication_id,
            stage_name="Precision Wood Cutting",
            sequence_order=1,
            required_skill="Woodwork & Carpentry",
            assigned_worker_id=worker_carpenter.user_id,
            status="ASSIGNED",
            progress_percentage=0
        )
        db.add(fab_stage)
        db.commit()
        db.refresh(fab_stage)
        cleanups.append(("ProductionStage", fab_stage.stage_id))

        # Attempt to start fabrication stage while customer material is still REGISTERED
        res_fab_start = client.post(f"/api/worker/my-tasks/stg-{fab_stage.stage_id}/start", headers=carpenter_headers)
        assert res_fab_start.status_code == 400, f"Expected 400 when starting fabrication without material, got {res_fab_start.status_code}"
        assert "material" in res_fab_start.text.lower()
        print("[PASS] Verified: Worker cannot start fabrication before customer-owned material is received.")

        # Receive the customer material
        c_mat.status = "RECEIVED"
        fab_req.status = "MATERIAL_RECEIVED"
        db.commit()

        # Now start should succeed
        res_fab_start_ok = client.post(f"/api/worker/my-tasks/stg-{fab_stage.stage_id}/start", headers=carpenter_headers)
        assert res_fab_start_ok.status_code == 200, f"Starting fabrication stage after material received failed: {res_fab_start_ok.text}"
        print("[PASS] Verified: Fabrication stage started successfully after customer material was marked received.")

        # =========================================================================
        # TEST 13: Reassigning On-Site Service Job Prevents Duplicate Jobs
        # =========================================================================
        print("\n--- TEST 13: Reassigning On-Site Job Does Not Create Duplicate Records ---")
        srv_req = models.ServiceRequest(
            customer_id=cust_profile.customer_id,
            service_category="Carpentry",
            description="Fix broken cupboard hinges",
            address="45 QC Road",
            city="Kottayam",
            pincode="686001",
            preferred_date=date.today() + timedelta(days=5),
            preferred_time="Morning",
            status="PAID",
            payment_status="Paid",
            review_status="APPROVED"
        )
        db.add(srv_req)
        db.commit()
        db.refresh(srv_req)
        cleanups.append(("ServiceRequest", srv_req.service_id))

        # First assignment to Carpenter
        res_srv1 = client.post(
            "/api/services/jobs/assign",
            json={"service_id": srv_req.service_id, "worker_id": worker_carpenter.user_id},
            headers=staff_headers
        )
        assert res_srv1.status_code == 200
        job1_id = res_srv1.json()["job_id"]
        cleanups.append(("ServiceJob", job1_id))

        # Reassign to another carpenter
        worker_carpenter2 = db.query(models.User).filter(models.User.email == "test_carpenter2_qc@example.com").first()
        if not worker_carpenter2:
            worker_carpenter2 = models.User(
                email="test_carpenter2_qc@example.com",
                full_name="QC Second Carpenter",
                role_id=5,
                status=True,
                specialization="Woodwork & Carpentry"
            )
            db.add(worker_carpenter2)
        else:
            worker_carpenter2.role_id = 5
            worker_carpenter2.status = True
            worker_carpenter2.specialization = "Woodwork & Carpentry"
        db.commit()
        db.refresh(worker_carpenter2)
        cleanups.append(("User", worker_carpenter2.user_id))

        res_srv2 = client.post(
            "/api/services/jobs/assign",
            json={"service_id": srv_req.service_id, "worker_id": worker_carpenter2.user_id},
            headers=staff_headers
        )
        assert res_srv2.status_code == 200
        job2_id = res_srv2.json()["job_id"]
        assert job1_id == job2_id, f"Duplicate job created! job1: {job1_id}, job2: {job2_id}"

        jobs_count = db.query(models.ServiceJob).filter(models.ServiceJob.service_id == srv_req.service_id).count()
        assert jobs_count == 1, f"Expected 1 ServiceJob, found {jobs_count}"
        reassigned_job = db.query(models.ServiceJob).filter(models.ServiceJob.job_id == job1_id).first()
        assert reassigned_job.worker_id == worker_carpenter2.user_id
        print("[PASS] Verified: Reassigning service job updated the existing job record without creating duplicate rows.")

        # =========================================================================
        # TEST 14: Custom-Order Overview Aggregates Stage & Legacy Workers Without Duplicates
        # =========================================================================
        print("\n--- TEST 14: Custom Order Overview Merges Stage Workers & Deduplicates ---")
        # Add legacy assignment for worker_carpenter
        asgn_leg = models.WorkerAssignment(
            custom_order_id=order1.custom_order_id,
            worker_id=worker_carpenter.user_id,
            assigned_date=date.today(),
            task_status="Woodwork & Carpentry: Completed"
        )
        db.add(asgn_leg)
        db.commit()
        cleanups.append(("WorkerAssignment", asgn_leg.assignment_id))

        # Now worker_carpenter is in both WorkerAssignment and ProductionStage
        res_orders = client.get("/api/production/custom-orders")
        assert res_orders.status_code == 200
        found_order = next((o for o in res_orders.json() if o["custom_order_id"] == order1.custom_order_id), None)
        assert found_order is not None
        assigned_w = found_order["assigned_workers"]
        worker_ids = [w["worker_id"] for w in assigned_w]
        assert worker_ids.count(worker_carpenter.user_id) == 1, f"Worker ID {worker_carpenter.user_id} duplicated in assigned_workers: {worker_ids}"
        print("[PASS] Verified: Custom order overview aggregates stage workers with legacy assignments without duplicate entries.")

        # =========================================================================
        # TEST 15: Readymade Order Fulfillment, Driver & Delivery Preserved
        # =========================================================================
        print("\n--- TEST 15: Readymade Delivery, Driver Assignments Preserved ---")
        readymade_order = models.ReadymadeOrder(
            customer_id=cust_profile.customer_id,
            total_amount=12000.0,
            order_status="Processing",
            payment_status="Paid",
            delivery_address="45 QC Road, Sector 5"
        )
        db.add(readymade_order)
        db.commit()
        db.refresh(readymade_order)
        cleanups.append(("ReadymadeOrder", readymade_order.order_id))

        driver_user = db.query(models.User).filter(models.User.email == "test_driver_qc@example.com").first()
        if not driver_user:
            driver_user = models.User(
                email="test_driver_qc@example.com",
                full_name="QC Express Driver",
                role_id=5,
                status=True,
                is_driver=True
            )
            db.add(driver_user)
        else:
            driver_user.role_id = 5
            driver_user.status = True
            driver_user.is_driver = True
        db.commit()
        db.refresh(driver_user)
        cleanups.append(("User", driver_user.user_id))

        fulfillment = models.OrderFulfillment(
            order_id=readymade_order.order_id,
            job_type="DELIVERY",
            driver_id=driver_user.user_id,
            carrier="RetailSphere Fleet",
            fulfillment_status="In Transit",
            delivery_status="Out for Delivery"
        )
        db.add(fulfillment)
        db.commit()
        db.refresh(fulfillment)
        cleanups.append(("OrderFulfillment", fulfillment.fulfillment_id))

        # Verify driver deliveries query in worker_ops
        driver_token = auth.create_access_token(data={"sub": str(driver_user.user_id)})
        res_driver = client.get(
            f"/api/worker/my-deliveries",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert res_driver.status_code == 200
        deliveries = res_driver.json()
        assert any(d["fulfillment_id"] == fulfillment.fulfillment_id for d in deliveries), "Driver delivery not listed"
        print("[PASS] Verified: Readymade order fulfillment and driver logistics workflows are fully preserved.")

        # =========================================================================
        # 16. REGRESSION: PRODUCTION STAFF STAGE COMPLETION CONTRACT & PERSISTENCE
        # =========================================================================
        print("\n--- 16. REGRESSION: PRODUCTION STAFF STAGE COMPLETION CONTRACT & PERSISTENCE ---")
        reg_order = models.CustomOrder(
            customer_id=cust_profile.customer_id,
            furniture_type="Regression Dining Table",
            dimensions="180x90x75 cm",
            material="Teak Wood",
            color="Natural Teak",
            order_status="In Production",
            review_status="APPROVED",
            payment_status="Paid",
            priority="HIGH",
            order_date=datetime.utcnow()
        )
        db.add(reg_order)
        db.commit()
        db.refresh(reg_order)
        cleanups.append(("CustomOrder", reg_order.custom_order_id))

        stg_reg_1 = models.ProductionStage(
            order_type="Custom",
            order_id=reg_order.custom_order_id,
            stage_name="Rough Mill & Shaping",
            sequence_order=1,
            assigned_worker_id=worker_carpenter.user_id,
            status="IN_PROGRESS",
            progress_percentage=50,
            remarks='{"completed_sections": ["sec-1"], "user_notes": "Rough cuts ready"}'
        )
        stg_reg_2 = models.ProductionStage(
            order_type="Custom",
            order_id=reg_order.custom_order_id,
            stage_name="Fine Assembly & Joinery",
            sequence_order=2,
            assigned_worker_id=None,
            status="LOCKED",
            progress_percentage=0
        )
        db.add_all([stg_reg_1, stg_reg_2])
        db.commit()
        db.refresh(stg_reg_1)
        db.refresh(stg_reg_2)
        cleanups.append(("ProductionStage", stg_reg_2.stage_id))
        cleanups.append(("ProductionStage", stg_reg_1.stage_id))

        # Action: COMPLETE via production route with photos parameter
        complete_payload = {
            "action": "COMPLETE",
            "remarks": "Completed shaping with precision",
            "photos": "https://storage.retailsphere.ai/photos/stage1_done.jpg",
            "progress_percentage": 100
        }
        res_comp = client.put(f"/api/production/worker/stages/{stg_reg_1.stage_id}/action", json=complete_payload)
        assert res_comp.status_code == 200, f"Expected 200, got {res_comp.status_code}: {res_comp.text}"
        comp_json = res_comp.json()
        # Verify no TypeError (photos accepted) and no KeyError (message present)
        assert "message" in comp_json, "Response missing 'message' key"
        assert comp_json.get("status") == "COMPLETED", f"Expected status COMPLETED, got {comp_json.get('status')}"
        assert comp_json.get("next_stage_id") == stg_reg_2.stage_id, "Response missing next_stage_id"

        # Verify DB persistence in fresh query
        db.expire_all()
        refreshed_stg1 = db.query(models.ProductionStage).filter(models.ProductionStage.stage_id == stg_reg_1.stage_id).first()
        refreshed_stg2 = db.query(models.ProductionStage).filter(models.ProductionStage.stage_id == stg_reg_2.stage_id).first()
        assert refreshed_stg1.status == "COMPLETED", f"Stage 1 status not persisted: {refreshed_stg1.status}"
        assert refreshed_stg1.progress_percentage == 100
        assert refreshed_stg2.status == "READY_FOR_ASSIGNMENT", f"Stage 2 not unlocked: {refreshed_stg2.status}"

        # Verify photo and remarks preserved
        meta_parsed = json.loads(refreshed_stg1.remarks)
        assert meta_parsed.get("photos") == "https://storage.retailsphere.ai/photos/stage1_done.jpg", "Photos not preserved in remarks"
        assert "Completed shaping" in meta_parsed.get("user_notes"), "Remarks not preserved"

        # Verify ProductionHistory logged
        hist_entry = db.query(models.ProductionHistory).filter(
            models.ProductionHistory.order_id == reg_order.custom_order_id,
            models.ProductionHistory.action == "COMPLETE_STAGE"
        ).first()
        assert hist_entry is not None, "ProductionHistory not recorded"
        print("[PASS] Verified: Production staff stage completion executed without TypeError/KeyError, persisted to DB, and unlocked next stage.")

        # =========================================================================
        # 17. REGRESSION: ORDER-TYPE CASING NORMALIZATION (CUSTOM, FABRICATION, Customization)
        # =========================================================================
        print("\n--- 17. REGRESSION: ORDER-TYPE CASING NORMALIZATION ---")
        # 17a. Order type "CUSTOM" (uppercase)
        custom_upper_order = models.CustomOrder(
            customer_id=cust_profile.customer_id,
            furniture_type="Uppercase Custom Chair",
            material="Teak Wood",
            dimensions="60x60x85 cm",
            color="Brown",
            order_status="In Production",
            priority="NORMAL",
            order_date=datetime.utcnow()
        )
        db.add(custom_upper_order)
        db.commit()
        db.refresh(custom_upper_order)
        cleanups.append(("CustomOrder", custom_upper_order.custom_order_id))

        stg_upper_custom = models.ProductionStage(
            order_type="CUSTOM",  # Uppercase
            order_id=custom_upper_order.custom_order_id,
            stage_name="Solo Stage",
            sequence_order=1,
            assigned_worker_id=worker_carpenter.user_id,
            status="IN_PROGRESS"
        )
        db.add(stg_upper_custom)
        db.commit()
        db.refresh(stg_upper_custom)
        cleanups.append(("ProductionStage", stg_upper_custom.stage_id))

        res_uc = client.put(
            f"/api/production/worker/stages/{stg_upper_custom.stage_id}/action",
            json={"action": "COMPLETE", "remarks": "Solo stage completed"}
        )
        assert res_uc.status_code == 200, f"Upper CUSTOM complete failed: {res_uc.text}"
        db.expire_all()
        refreshed_cu = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == custom_upper_order.custom_order_id).first()
        assert refreshed_cu.order_status == "QC_PENDING", f"Expected QC_PENDING for CUSTOM order, got {refreshed_cu.order_status}"

        # 17b. Order type "FABRICATION" (uppercase)
        fab_upper_order = models.FabricationRequest(
            customer_id=cust_profile.customer_id,
            service_type="Wood Cutting",
            dimensions="120x60 cm",
            material_source="Customer-Owned",
            status="IN_PRODUCTION",
            priority="NORMAL",
            created_at=datetime.utcnow()
        )
        db.add(fab_upper_order)
        db.commit()
        db.refresh(fab_upper_order)
        cleanups.append(("FabricationRequest", fab_upper_order.fabrication_id))

        stg_upper_fab = models.ProductionStage(
            order_type="FABRICATION",  # Uppercase
            order_id=fab_upper_order.fabrication_id,
            stage_name="Fabrication Solo Stage",
            sequence_order=1,
            assigned_worker_id=worker_carpenter.user_id,
            status="IN_PROGRESS"
        )
        db.add(stg_upper_fab)
        db.commit()
        db.refresh(stg_upper_fab)
        cleanups.append(("ProductionStage", stg_upper_fab.stage_id))

        res_uf = client.put(
            f"/api/production/worker/stages/{stg_upper_fab.stage_id}/action",
            json={"action": "COMPLETE", "remarks": "Fab solo stage completed"}
        )
        assert res_uf.status_code == 200, f"Upper FABRICATION complete failed: {res_uf.text}"
        db.expire_all()
        refreshed_fu = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == fab_upper_order.fabrication_id).first()
        assert refreshed_fu.status == "QC_PENDING", f"Expected QC_PENDING for FABRICATION order, got {refreshed_fu.status}"

        # 17c. Order type "Customization"
        customization_order = models.CustomOrder(
            customer_id=cust_profile.customer_id,
            furniture_type="Customization Bench",
            material="Oak Wood",
            dimensions="120x40x45 cm",
            color="Natural Oak",
            order_status="In Production",
            priority="NORMAL",
            order_date=datetime.utcnow()
        )
        db.add(customization_order)
        db.commit()
        db.refresh(customization_order)
        cleanups.append(("CustomOrder", customization_order.custom_order_id))

        stg_customization = models.ProductionStage(
            order_type="Customization",
            order_id=customization_order.custom_order_id,
            stage_name="Customization Finish Stage",
            sequence_order=1,
            assigned_worker_id=worker_carpenter.user_id,
            status="IN_PROGRESS"
        )
        db.add(stg_customization)
        db.commit()
        db.refresh(stg_customization)
        cleanups.append(("ProductionStage", stg_customization.stage_id))

        res_cz = client.put(
            f"/api/production/worker/stages/{stg_customization.stage_id}/action",
            json={"action": "COMPLETE", "remarks": "Customization finish done"}
        )
        assert res_cz.status_code == 200, f"Customization complete failed: {res_cz.text}"
        db.expire_all()
        refreshed_cz = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == customization_order.custom_order_id).first()
        assert refreshed_cz.order_status == "QC_PENDING", f"Expected QC_PENDING for Customization order, got {refreshed_cz.order_status}"
        print("[PASS] Verified: Final custom and fabrication stages transition to QC_PENDING regardless of casing (CUSTOM, FABRICATION, Customization).")

        # =========================================================================
        # 18. REGRESSION: TRANSACTION ROLLBACK & NO PARTIAL STATE ON FAILURE
        # =========================================================================
        print("\n--- 18. REGRESSION: TRANSACTION ROLLBACK ON FAILURE ---")
        stg_locked = models.ProductionStage(
            order_type="Custom",
            order_id=reg_order.custom_order_id,
            stage_name="Locked Future Stage",
            sequence_order=99,
            status="LOCKED",
            progress_percentage=0
        )
        db.add(stg_locked)
        db.commit()
        db.refresh(stg_locked)
        cleanups.append(("ProductionStage", stg_locked.stage_id))

        hist_count_before = db.query(models.ProductionHistory).filter(models.ProductionHistory.order_id == reg_order.custom_order_id).count()

        # Attempting to complete a LOCKED stage must fail and rollback
        res_fail = client.put(
            f"/api/production/worker/stages/{stg_locked.stage_id}/action",
            json={"action": "COMPLETE", "remarks": "Invalid attempt"}
        )
        assert res_fail.status_code == 400, f"Expected 400 for completing locked stage, got {res_fail.status_code}"

        db.expire_all()
        stg_locked_after = db.query(models.ProductionStage).filter(models.ProductionStage.stage_id == stg_locked.stage_id).first()
        assert stg_locked_after.status == "LOCKED", "Stage status mutated despite failure"
        hist_count_after = db.query(models.ProductionHistory).filter(models.ProductionHistory.order_id == reg_order.custom_order_id).count()
        assert hist_count_after == hist_count_before, "Partial history records left after failed completion"
        print("[PASS] Verified: Completion failure leaves no partial database updates (clean rollback).")

        # =========================================================================
        # 19. REGRESSION: SECURE WORKER UNASSIGNMENT (401 & 403 REJECTIONS)
        # =========================================================================
        print("\n--- 19. REGRESSION: SECURE WORKER UNASSIGNMENT ---")
        unassign_url = "/api/production/unassign-worker"
        unassign_body = {"custom_order_id": reg_order.custom_order_id, "worker_id": worker_carpenter.user_id}

        # 19a. Unauthenticated -> 401
        res_unauth = client.post(unassign_url, json=unassign_body)
        assert res_unauth.status_code == 401, f"Expected 401 for unauthenticated unassign, got {res_unauth.status_code}"

        # 19b. Customer -> 403
        res_cust_unassign = client.post(unassign_url, json=unassign_body, headers={"Authorization": f"Bearer {customer_token}"})
        assert res_cust_unassign.status_code == 403, f"Expected 403 for customer unassign, got {res_cust_unassign.status_code}"

        # 19c. Worker -> 403
        res_worker_unassign = client.post(unassign_url, json=unassign_body, headers={"Authorization": f"Bearer {carpenter_token}"})
        assert res_worker_unassign.status_code == 403, f"Expected 403 for worker unassign, got {res_worker_unassign.status_code}"
        print("[PASS] Verified: Unauthenticated and unauthorized requests to unassign workers rejected with HTTP 401/403.")

        # =========================================================================
        # 20. REGRESSION: SECURE CUSTOM-ORDER STATUS MUTATION (401 & 403 REJECTIONS)
        # =========================================================================
        print("\n--- 20. REGRESSION: SECURE CUSTOM-ORDER STATUS MUTATION ---")
        status_url = f"/api/production/custom-orders/{reg_order.custom_order_id}/status"
        status_body = {"order_status": "Approved", "remarks": "Unauthorized status attempt"}

        # 20a. Unauthenticated -> 401
        res_stat_unauth = client.put(status_url, json=status_body)
        assert res_stat_unauth.status_code == 401, f"Expected 401 for unauthenticated status update, got {res_stat_unauth.status_code}"

        # 20b. Customer -> 403
        res_stat_cust = client.put(status_url, json=status_body, headers={"Authorization": f"Bearer {customer_token}"})
        assert res_stat_cust.status_code == 403, f"Expected 403 for customer status update, got {res_stat_cust.status_code}"

        # 20c. Worker -> 403
        res_stat_worker = client.put(status_url, json=status_body, headers={"Authorization": f"Bearer {carpenter_token}"})
        assert res_stat_worker.status_code == 403, f"Expected 403 for worker status update, got {res_stat_worker.status_code}"
        print("[PASS] Verified: Unauthenticated and unauthorized custom-order status updates rejected with HTTP 401/403.")

        # =========================================================================
        # 21. REGRESSION: AUTHORIZED STAFF VALID OPERATIONS (STATUS & UNASSIGN)
        # =========================================================================
        print("\n--- 21. REGRESSION: AUTHORIZED STAFF VALID OPERATIONS ---")
        # 21a. Staff updates custom-order status to Approved
        res_staff_status = client.put(
            f"/api/production/custom-orders/{reg_order.custom_order_id}/status",
            json={"order_status": "Approved", "remarks": "Staff approved for production"},
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert res_staff_status.status_code == 200, f"Expected 200, got {res_staff_status.status_code}: {res_staff_status.text}"
        db.expire_all()
        refreshed_reg_order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == reg_order.custom_order_id).first()
        assert refreshed_reg_order.order_status == "Approved"

        # Verify initial progress entry recorded staff_user.user_id
        init_p = db.query(models.ProductionProgress).filter(
            models.ProductionProgress.custom_order_id == reg_order.custom_order_id,
            models.ProductionProgress.stage == "Material Sourcing"
        ).first()
        assert init_p is not None, "Initial progress not created on staff approval"
        assert init_p.updated_by == staff_user.user_id, f"Expected updated_by={staff_user.user_id}, got {init_p.updated_by}"

        # 21b. Assign worker, then staff unassigns worker
        res_asgn = client.post(
            "/api/production/assign-worker",
            json={"custom_order_id": reg_order.custom_order_id, "worker_id": worker_carpenter.user_id, "department": "Woodwork & Carpentry"},
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert res_asgn.status_code == 200

        res_staff_unassign = client.post(
            "/api/production/unassign-worker",
            json={"custom_order_id": reg_order.custom_order_id, "worker_id": worker_carpenter.user_id},
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert res_staff_unassign.status_code == 200, f"Expected 200, got {res_staff_unassign.status_code}: {res_staff_unassign.text}"
        unassign_json = res_staff_unassign.json()
        assert "unassigned successfully" in unassign_json.get("message", "").lower()

        # Verify ProductionHistory logged unassign with staff_user.user_id
        unassign_hist = db.query(models.ProductionHistory).filter(
            models.ProductionHistory.order_id == reg_order.custom_order_id,
            models.ProductionHistory.action == "Worker Unassigned"
        ).order_by(models.ProductionHistory.timestamp.desc()).first()
        assert unassign_hist is not None, "Worker Unassigned history entry missing"
        assert unassign_hist.action_by_id == staff_user.user_id, f"Expected action_by_id={staff_user.user_id}, got {unassign_hist.action_by_id}"
        print("[PASS] Verified: Authorized staff can successfully perform custom order status update and worker unassignment.")

        # =========================================================================
        # 22. REGRESSION: QC GATE RESTRICTION PRESERVED ON STATUS MUTATION
        # =========================================================================
        print("\n--- 22. REGRESSION: QC GATE RESTRICTION PRESERVED ON STATUS MUTATION ---")
        # Attempting to set order_status directly to COMPLETED without passing QC inspection must fail
        res_comp_no_qc = client.put(
            f"/api/production/custom-orders/{reg_order.custom_order_id}/status",
            json={"order_status": "COMPLETED", "remarks": "Direct complete attempt without QC"},
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert res_comp_no_qc.status_code == 400, f"Expected 400 for completing without QC, got {res_comp_no_qc.status_code}"
        assert "quality inspection" in res_comp_no_qc.text.lower(), "Error message did not mention quality inspection"
        print("[PASS] Verified: Direct transition to COMPLETED without passing QC is strictly rejected with HTTP 400.")

        print("\n" + "=" * 75)
        print("ALL 15 ORIGINAL TESTS + 7 REGRESSION SUITES PASSED SUCCESSFULLY!")
        print("=" * 75)

    finally:
        # CLEANUP TEST DATA IN REVERSE ORDER TO RESPECT FOREIGN KEYS
        print("\nCleaning up test artifacts...")
        for model_name, record_id in reversed(cleanups):
            try:
                if model_name == "OrderFulfillment":
                    db.query(models.OrderFulfillment).filter(models.OrderFulfillment.fulfillment_id == record_id).delete()
                elif model_name in ["Order", "ReadymadeOrder"]:
                    db.query(models.ReadymadeOrder).filter(models.ReadymadeOrder.order_id == record_id).delete()
                elif model_name == "WorkerAssignment":
                    db.query(models.WorkerAssignment).filter(models.WorkerAssignment.assignment_id == record_id).delete()
                elif model_name == "ServiceJob":
                    db.query(models.ServiceJob).filter(models.ServiceJob.job_id == record_id).delete()
                elif model_name == "ServiceRequest":
                    db.query(models.ServiceRequest).filter(models.ServiceRequest.service_id == record_id).delete()
                elif model_name == "FabricationRequest":
                    db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == record_id).delete()
                elif model_name == "CustomerMaterial":
                    db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == record_id).delete()
                elif model_name == "WorkerLeave":
                    db.query(models.WorkerLeave).filter(models.WorkerLeave.leave_id == record_id).delete()
                elif model_name == "WorkerAvailability":
                    db.query(models.WorkerAvailability).filter(models.WorkerAvailability.availability_id == record_id).delete()
                elif model_name == "ReworkJob":
                    db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == record_id).delete()
                elif model_name == "ProductionStage":
                    db.query(models.ProductionStage).filter(models.ProductionStage.stage_id == record_id).delete()
                elif model_name == "CustomOrder":
                    db.query(models.QualityInspection).filter(
                        models.QualityInspection.order_type.in_(["Custom", "CUSTOM"]),
                        models.QualityInspection.order_id == record_id
                    ).delete()
                    db.query(models.ProductionProgress).filter(models.ProductionProgress.custom_order_id == record_id).delete()
                    db.query(models.ProductionHistory).filter(
                        models.ProductionHistory.order_type.in_(["Custom", "CUSTOM"]),
                        models.ProductionHistory.order_id == record_id
                    ).delete()
                    db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == record_id).delete()
                elif model_name == "Customer":
                    db.query(models.Customer).filter(models.Customer.customer_id == record_id).delete()
                elif model_name == "User":
                    db.query(models.Notification).filter(models.Notification.user_id == record_id).delete()
                    db.query(models.User).filter(models.User.user_id == record_id).delete()
                db.commit()
            except Exception as e:
                db.rollback()
        db.close()
        print("Cleanup completed.")

if __name__ == "__main__":
    run_all_tests()
