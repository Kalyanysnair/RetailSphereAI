"""
Isolated Test Suite for Raw Material Ledger and Customer-Supplied Material Workflow.
All tests run against a standalone, isolated SQLite database fixture (never touching production or Neon DB).
"""

import sys
import os
import unittest
from datetime import datetime, date
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import Base
from app import models
from app.utils.material_ledger import (
    record_business_material_transaction,
    record_customer_material_transaction
)
from app.utils.worker_assignment_validator import (
    validate_fabrication_assignment_prerequisites,
    validate_fabrication_material_prerequisite,
    validate_custom_order_assignment_prerequisites
)
from app.routers.materials import (
    CustomerMaterialRegisterPayload,
    register_customer_material,
    MaterialAllocatePayload,
    allocate_material_to_order,
    MaterialConsumePayload,
    record_material_consumption,
    MaterialReturnPayload,
    return_material_from_order
)
from app.routers.production import (
    MaterialReceivePayload,
    receive_customer_material,
    CustomOrderCreatePayload,
    create_custom_order
)
from app.routers.fabrication import (
    FabricationRequestCreatePayload,
    create_fabrication_request
)


class TestMaterialLedgerIsolated(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from sqlalchemy.pool import StaticPool
        # Create an in-memory SQLite database with StaticPool so all sessions share the in-memory schema
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool
        )
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionLocal()
        # Seed basic roles
        self.role_cust = models.Role(role_id=1, role_name="Customer")
        self.role_staff = models.Role(role_id=2, role_name="Production Staff")
        self.role_worker = models.Role(role_id=3, role_name="Worker")
        self.db.add_all([self.role_cust, self.role_staff, self.role_worker])

        # Seed users
        self.user_cust1 = models.User(
            user_id=10,
            full_name="Alice Customer",
            email="alice@example.com",
            phone="9876543210",
            role_id=1,
            status=True
        )
        self.user_cust2 = models.User(
            user_id=20,
            full_name="Bob Customer",
            email="bob@example.com",
            phone="9876543211",
            role_id=1,
            status=True
        )
        self.user_prod_staff = models.User(
            user_id=30,
            full_name="Staff Peter",
            email="peter@retailsphere.ai",
            phone="9876543212",
            role_id=2,
            status=True
        )
        self.user_worker = models.User(
            user_id=40,
            full_name="Artisan Sam",
            email="sam@retailsphere.ai",
            phone="9876543213",
            role_id=3,
            specialization="Woodwork & Carpentry",
            status=True
        )
        self.db.add_all([self.user_cust1, self.user_cust2, self.user_prod_staff, self.user_worker])
        self.db.commit()

        # Seed customer profiles
        self.cust_prof1 = models.Customer(customer_id=10, user_id=10, address="123 Wood St", city="Kottayam", state="Kerala", pincode="686001")
        self.cust_prof2 = models.Customer(customer_id=20, user_id=20, address="456 Timber Rd", city="Kottayam", state="Kerala", pincode="686002")
        self.db.add_all([self.cust_prof1, self.cust_prof2])
        self.db.commit()

    def tearDown(self):
        self.db.rollback()
        # Clear data from all tables
        for table in reversed(Base.metadata.sorted_tables):
            self.db.execute(table.delete())
        self.db.commit()
        self.db.close()

    def test_customer_material_declaration_and_validation(self):
        """Rule 1: Customer can declare material; quantity must be > 0 and units validated."""
        # Valid declaration
        payload = CustomerMaterialRegisterPayload(
            customer_email="alice@example.com",
            material_type="Timber Wood",
            wood_type="Teak Planks",
            quantity=15.0,
            unit="cu_ft",
            dimensions="8ft x 6in x 2in",
            condition="Good Seasoned",
            notes="Stored in dry warehouse"
        )
        res = register_customer_material(payload, db=self.db, current_user=self.user_cust1)
        self.assertIn("material_id", res)
        mat_id = res["material_id"]

        mat = self.db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == mat_id).first()
        self.assertIsNotNone(mat)
        self.assertEqual(mat.status, "REGISTERED")
        self.assertEqual(mat.quantity, 15.0)
        self.assertEqual(mat.remaining_quantity, 15.0)
        self.assertEqual(mat.wood_type, "Teak Planks")

        # Invalid quantity (<= 0) must be rejected
        payload_invalid = CustomerMaterialRegisterPayload(
            customer_email="alice@example.com",
            material_type="Timber Wood",
            quantity=0.0,
            unit="cu_ft"
        )
        with self.assertRaises(HTTPException) as ctx:
            register_customer_material(payload_invalid, db=self.db, current_user=self.user_cust1)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_material_ownership_separation(self):
        """Rule 3: Customer material never inflates tbl_raw_material.available_qty."""
        # Create business stock
        biz_mat = models.RawMaterial(
            category="Timber",
            material_name="Factory Teak",
            unit="cu_ft",
            available_qty=100.0,
            reserved_qty=0.0,
            reorder_level=20.0,
            unit_cost=1500.0
        )
        self.db.add(biz_mat)
        self.db.commit()

        # Customer registers material
        payload = CustomerMaterialRegisterPayload(
            customer_email="alice@example.com",
            material_type="Timber Wood",
            quantity=50.0,
            unit="cu_ft"
        )
        register_customer_material(payload, db=self.db, current_user=self.user_cust1)

        # Verify business raw material stock is UNCHANGED
        refreshed_biz = self.db.query(models.RawMaterial).filter(models.RawMaterial.material_id == biz_mat.material_id).first()
        self.assertEqual(refreshed_biz.available_qty, 100.0)

    def test_fabrication_request_material_linkage_and_cross_customer_guard(self):
        """Rule 4: Order linkage; customers cannot attach another customer's material lot."""
        # Customer 1 registers material
        payload = CustomerMaterialRegisterPayload(
            customer_email="alice@example.com",
            material_type="Timber Wood",
            quantity=20.0,
            unit="pieces"
        )
        res = register_customer_material(payload, db=self.db, current_user=self.user_cust1)
        alice_mat_id = res["material_id"]

        # Bob (Customer 2) tries to create a fabrication request linking Alice's material
        fab_payload = FabricationRequestCreatePayload(
            customer_id=20,
            customer_email="bob@example.com",
            service_type="Wood Cutting",
            material_source="Customer-Owned Material",
            customer_material_id=alice_mat_id,
            dimensions="1000mm x 500mm",
            quantity=5
        )
        with self.assertRaises(HTTPException) as ctx:
            create_fabrication_request(fab_payload, db=self.db, current_user=self.user_cust2)
        # Must be rejected with 403 Forbidden
        self.assertEqual(ctx.exception.status_code, 403)

        # Alice creates fabrication request linking her own material
        fab_payload_alice = FabricationRequestCreatePayload(
            customer_id=10,
            customer_email="alice@example.com",
            service_type="Wood Cutting",
            material_source="Customer-Owned Material",
            customer_material_id=alice_mat_id,
            dimensions="1000mm x 500mm",
            quantity=5
        )
        fab_res = create_fabrication_request(fab_payload_alice, db=self.db, current_user=self.user_cust1)
        self.assertIsNotNone(fab_res)
        self.assertEqual(fab_res.customer_material_id, alice_mat_id)

    def test_carrier_delivery_separation_from_inspection(self):
        """Rule 2: Carrier delivery marks DELIVERED_AT_HUB, NOT IN_PRODUCTION or APPROVED."""
        # Create customer material
        c_mat = models.CustomerMaterial(
            customer_id=10,
            material_type="Timber Wood",
            wood_type="Rosewood",
            quantity=10.0,
            remaining_quantity=10.0,
            unit="cu_ft",
            status="REGISTERED"
        )
        self.db.add(c_mat)
        self.db.commit()

        # Create fabrication request
        fab = models.FabricationRequest(
            customer_id=10,
            service_type="Wood Cutting",
            material_source="Customer-Owned Material",
            customer_material_id=c_mat.material_id,
            dimensions="Standard",
            quantity=5,
            status="PAID",
            payment_status="PAID"
        )
        self.db.add(fab)
        self.db.commit()

        # Create fulfillment
        ful = models.OrderFulfillment(
            fabrication_id=fab.fabrication_id,
            job_type="FABRICATION_PICKUP",
            fulfillment_status="In Transit",
            delivery_status="In Transit"
        )
        self.db.add(ful)
        self.db.commit()

        # Simulate carrier marking Delivered at hub
        ful.delivery_status = "Delivered"
        ful.delivered_at = datetime.utcnow()
        if ful.job_type == "FABRICATION_PICKUP" and ful.fabrication_request:
            ful.fabrication_request.status = "MATERIAL_DELIVERED_AT_HUB"
            if ful.fabrication_request.customer_material_id:
                mat = self.db.query(models.CustomerMaterial).filter(
                    models.CustomerMaterial.material_id == ful.fabrication_request.customer_material_id
                ).first()
                if mat:
                    mat.status = "DELIVERED_AT_HUB"
        self.db.commit()

        self.assertEqual(fab.status, "MATERIAL_DELIVERED_AT_HUB")
        self.assertEqual(c_mat.status, "DELIVERED_AT_HUB")
        # Ensure it is NOT automatically marked IN_PRODUCTION
        self.assertNotEqual(fab.status, "IN_PRODUCTION")

    def test_production_prerequisites_blocking(self):
        """Rule 5 & 8: Production action is blocked until customer material is received & inspected."""
        c_mat = models.CustomerMaterial(
            customer_id=10,
            material_type="Timber Wood",
            quantity=10.0,
            remaining_quantity=10.0,
            unit="cu_ft",
            status="DELIVERED_AT_HUB"  # Delivered at hub, but NOT yet inspected/received by staff!
        )
        self.db.add(c_mat)
        self.db.commit()

        fab = models.FabricationRequest(
            customer_id=10,
            service_type="Wood Cutting",
            material_source="Customer-Owned Material",
            customer_material_id=c_mat.material_id,
            dimensions="Standard",
            quantity=5,
            status="MATERIAL_DELIVERED_AT_HUB",
            payment_status="PAID"
        )
        self.db.add(fab)
        self.db.commit()

        # Worker assignment prerequisite check must FAIL because material is DELIVERED_AT_HUB, not RECEIVED/INSPECTED
        with self.assertRaises(HTTPException) as ctx:
            validate_fabrication_assignment_prerequisites(self.db, fab)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("has not been physically received and verified", ctx.exception.detail)

        # Material prerequisite check for starting stage must also FAIL
        with self.assertRaises(HTTPException) as ctx:
            validate_fabrication_material_prerequisite(self.db, fab)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("has not been physically received and inspected", ctx.exception.detail)

    def test_production_staff_material_receipt_and_ledger_audit(self):
        """Rule 2 & 9: Production staff records physical receipt; updates status & writes audit."""
        c_mat = models.CustomerMaterial(
            customer_id=10,
            material_type="Timber Wood",
            quantity=12.0,
            remaining_quantity=12.0,
            unit="cu_ft",
            status="DELIVERED_AT_HUB"
        )
        self.db.add(c_mat)
        self.db.commit()

        fab = models.FabricationRequest(
            customer_id=10,
            service_type="Wood Cutting",
            material_source="Customer-Owned Material",
            customer_material_id=c_mat.material_id,
            dimensions="Standard",
            quantity=5,
            status="MATERIAL_DELIVERED_AT_HUB",
            payment_status="PAID"
        )
        self.db.add(fab)
        self.db.commit()

        # Production Staff receives and inspects material
        rcv_payload = MaterialReceivePayload(
            order_type="Fabrication",
            order_id=fab.fabrication_id,
            condition="Good Seasoned",
            quantity=10.0,  # Actually received 10 cu_ft
            unit="cu_ft",
            notes="Inspected: Moisture 11%, grain pattern uniform."
        )
        res = receive_customer_material(rcv_payload, db=self.db, current_user=self.user_prod_staff)
        self.assertIn("successfully", res["message"])

        # Verify CustomerMaterial updated
        refreshed_mat = self.db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == c_mat.material_id).first()
        self.assertEqual(refreshed_mat.status, "RECEIVED")
        self.assertEqual(refreshed_mat.remaining_quantity, 10.0)
        self.assertEqual(refreshed_mat.condition, "Good Seasoned")

        # Verify audit transaction written to tbl_material_transaction
        tx = self.db.query(models.MaterialTransaction).filter(
            models.MaterialTransaction.customer_material_id == c_mat.material_id,
            models.MaterialTransaction.transaction_type == "RECEIVED"
        ).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.quantity, 10.0)
        self.assertEqual(tx.performed_by_id, self.user_prod_staff.user_id)

        # Now worker assignment & stage prerequisite check must PASS!
        try:
            validate_fabrication_assignment_prerequisites(self.db, fab)
            validate_fabrication_material_prerequisite(self.db, fab)
        except HTTPException:
            self.fail("Prerequisites should have passed after material receipt and verification.")

    def test_allocation_consumption_and_overconsumption_prevention(self):
        """Rule 10: Material allocation and consumption update balances atomically and prevent overspending."""
        # Setup verified customer material
        c_mat = models.CustomerMaterial(
            customer_id=10,
            material_type="Timber Wood",
            quantity=10.0,
            remaining_quantity=10.0,
            unit="cu_ft",
            status="RECEIVED"
        )
        self.db.add(c_mat)
        self.db.commit()

        # 1. Allocate 6 cu_ft
        alloc_payload = MaterialAllocatePayload(
            ownership="CUSTOMER",
            material_id=c_mat.material_id,
            order_id=101,
            order_type="Fabrication",
            quantity=6.0,
            notes="Allocated for Fab #101"
        )
        alloc_res = allocate_material_to_order(alloc_payload, db=self.db, current_user=self.user_prod_staff)
        self.assertIn("successfully", alloc_res["message"])

        # 2. Consume 4 cu_ft with 1 cu_ft wastage (total 5 cu_ft)
        consume_payload = MaterialConsumePayload(
            ownership="CUSTOMER",
            material_id=c_mat.material_id,
            order_id=101,
            order_type="Fabrication",
            quantity_consumed=4.0,
            quantity_wasted=1.0,
            notes="Cutting & shaping complete"
        )
        cons_res = record_material_consumption(consume_payload, db=self.db, current_user=self.user_prod_staff)
        self.assertEqual(cons_res["remaining_quantity"], 5.0)
        self.assertEqual(cons_res["status"], "PARTIALLY_USED")

        # 3. Attempting to consume 10 cu_ft (more than the remaining 5 cu_ft) must fail with 400
        over_consume = MaterialConsumePayload(
            ownership="CUSTOMER",
            material_id=c_mat.material_id,
            order_id=101,
            order_type="Fabrication",
            quantity_consumed=10.0
        )
        with self.assertRaises(HTTPException) as ctx:
            record_material_consumption(over_consume, db=self.db, current_user=self.user_prod_staff)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Cannot consume", ctx.exception.detail)

        # 4. Return 2 cu_ft back to usable lot balance
        return_payload = MaterialReturnPayload(
            ownership="CUSTOMER",
            material_id=c_mat.material_id,
            order_id=101,
            order_type="Fabrication",
            quantity_returned=2.0,
            notes="Offcut returned to customer balance"
        )
        ret_res = return_material_from_order(return_payload, db=self.db, current_user=self.user_prod_staff)
        self.assertEqual(ret_res["remaining_quantity"], 7.0)

        # 5. Check audit trail in tbl_material_transaction
        txs = self.db.query(models.MaterialTransaction).filter(
            models.MaterialTransaction.customer_material_id == c_mat.material_id
        ).all()
        # Should have ALLOCATED, CONSUMED, WASTAGE, RETURNED records
        tx_types = [t.transaction_type for t in txs]
        self.assertIn("ALLOCATED", tx_types)
        self.assertIn("CONSUMED", tx_types)
        self.assertIn("WASTAGE", tx_types)
        self.assertIn("RETURNED", tx_types)

    def test_custom_order_customer_material_workflow(self):
        """Rule 11: Support Customer-Supplied Materials for Customisation orders."""
        # 1. Customer 1 (Alice) registers material
        c_mat = models.CustomerMaterial(
            customer_id=self.cust_prof1.customer_id,
            material_type="Timber Wood",
            wood_type="Teak Wood",
            quantity=15.0,
            remaining_quantity=15.0,
            unit="cu_ft",
            dimensions="8ft x 4in x 2in planks",
            condition="Good",
            status="REGISTERED"
        )
        self.db.add(c_mat)
        self.db.commit()
        self.db.refresh(c_mat)

        # 2. Customer 2 (Bob) tries to create CustomOrder linking Alice's material -> Must be blocked (403)
        bob_order_payload = CustomOrderCreatePayload(
            furniture_type="Bespoke Coffee Table",
            material="Teak Wood",
            dimensions="4ft x 2ft",
            color="Natural Teak Finish",
            customer_material_id=c_mat.material_id
        )
        with self.assertRaises(HTTPException) as ctx:
            create_custom_order(bob_order_payload, db=self.db, current_user=self.user_cust2)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("cannot link another customer's material lot", ctx.exception.detail)

        # 3. Customer 1 (Alice) creates CustomOrder linking her own material -> Succeeded
        alice_order_payload = CustomOrderCreatePayload(
            furniture_type="Bespoke Dining Table",
            material="Teak Wood",
            dimensions="6ft x 3ft",
            color="Walnut Tinted",
            customer_material_id=c_mat.material_id
        )
        created_order = create_custom_order(alice_order_payload, db=self.db, current_user=self.user_cust1)
        self.assertEqual(created_order["customer_material_id"], c_mat.material_id)
        order_id = created_order["order_id"]

        # Fetch the created order from db
        ord_obj = self.db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == order_id).first()
        ord_obj.review_status = "APPROVED"
        ord_obj.payment_status = "Paid"
        self.db.commit()

        # 4. Prerequisite check before physical receipt must FAIL with 400
        with self.assertRaises(HTTPException) as ctx:
            validate_custom_order_assignment_prerequisites(ord_obj, db=self.db)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("has not been physically received and inspected", ctx.exception.detail)

        # 5. Production staff physically inspects and receives the customer material
        rec_payload = MaterialReceivePayload(
            order_type="Custom",
            order_id=order_id,
            received_by_id=self.user_prod_staff.user_id,
            condition="Good",
            quantity=15.0,
            unit="cu_ft",
            notes="Physical teak planks inspected. Moisture < 12%."
        )
        receive_customer_material(rec_payload, db=self.db)

        # 6. Prerequisite check now SUCCEEDS
        valid, msg = validate_custom_order_assignment_prerequisites(ord_obj, db=self.db)
        self.assertTrue(valid)

        # 7. Allocation & consumption for Custom Order
        alloc_payload = MaterialAllocatePayload(
            ownership="CUSTOMER",
            material_id=c_mat.material_id,
            order_id=order_id,
            order_type="Custom",
            quantity=8.0,
            notes="Allocated for Custom Dining Table"
        )
        alloc_res = allocate_material_to_order(alloc_payload, db=self.db, current_user=self.user_prod_staff)
        self.assertIn("successfully", alloc_res["message"])

        consume_payload = MaterialConsumePayload(
            ownership="CUSTOMER",
            material_id=c_mat.material_id,
            order_id=order_id,
            order_type="Custom",
            quantity_consumed=6.0,
            quantity_wasted=1.0,
            notes="Frame assembled"
        )
        cons_res = record_material_consumption(consume_payload, db=self.db, current_user=self.user_prod_staff)
        self.assertEqual(cons_res["remaining_quantity"], 8.0)  # 15 - 7 = 8


if __name__ == "__main__":
    unittest.main()
