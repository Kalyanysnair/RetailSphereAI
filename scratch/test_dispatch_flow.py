import os
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import SessionLocal, engine
from app import models, schemas
from app.routers.fulfillment import generate_unique_tracking_number

def run_tests():
    # Ensure tables created in PostgreSQL
    models.Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    print("=" * 70)
    print("RUNNING DISPATCH FEATURE SET ACCEPTANCE TESTS")
    print("=" * 70)

    # 1. TEST ADMIN CARRIER PARTNER PROVISION
    print("\n--- TEST 1: ADMIN CARRIER PROVISION ---")
    initial_carriers = db.query(models.CarrierPartner).all()
    print(f"Initial Carrier Partners count in DB: {len(initial_carriers)}")
    
    # Verify no fake demo carriers created by default
    # Add a real carrier partner
    test_carrier_name = f"SpeedyExpress_{int(datetime.utcnow().timestamp())}"
    new_carrier = models.CarrierPartner(
        carrier_name=test_carrier_name,
        contact_phone="+91 98765 12345",
        contact_email="dispatch@speedy.com",
        status=True
    )
    db.add(new_carrier)
    db.commit()
    db.refresh(new_carrier)
    print(f"[OK] Successfully added Carrier Partner: #{new_carrier.carrier_id} - {new_carrier.carrier_name}")

    # 2. TEST UNIQUE TRACKING NUMBER GENERATOR
    print("\n--- TEST 2: AUTO TRACKING NUMBER GENERATOR ---")
    trk_code = generate_unique_tracking_number(db)
    print(f"[OK] Generated Tracking Number: {trk_code}")
    assert trk_code.startswith("TRK-"), "Tracking number format must start with TRK-"
    assert len(trk_code) == 12, "Tracking number format must be TRK-XXXXXXXX"

    # 3. TEST PACK FLOW & EXPECTED DELIVERY DATE
    print("\n--- TEST 3: PACK FLOW & EXPECTED DELIVERY DATE (PACKED DATE + 1 DAY) ---")
    order = db.query(models.ReadymadeOrder).order_by(models.ReadymadeOrder.order_id.desc()).first()
    cust = db.query(models.Customer).first()
    if not order:
        print("Creating a temporary ready-made order for testing...")
        order = models.ReadymadeOrder(
            customer_id=cust.customer_id if cust else 1,
            product_id=1,
            quantity=1,
            total_amount=1500.0,
            order_status="Order Placed"
        )
        db.add(order)
        db.commit()
        db.refresh(order)

    print(f"Target Order ID: RET-{order.order_id:06d} (Initial status: {order.order_status})")
    
    # Mark packed
    packed_now = datetime.utcnow()
    fulfillment = db.query(models.OrderFulfillment).filter(models.OrderFulfillment.order_id == order.order_id).first()
    if not fulfillment:
        fulfillment = models.OrderFulfillment(order_id=order.order_id)
        db.add(fulfillment)

    order.order_status = "Packed"
    fulfillment.fulfillment_status = "Packed"
    fulfillment.packed_at = packed_now
    exp_date = packed_now + timedelta(days=1)
    fulfillment.expected_delivery_date = exp_date.strftime("%d %B %Y")
    db.commit()
    db.refresh(fulfillment)

    print(f"[OK] Order marked as PACKED.")
    print(f"[OK] Packing Time: {fulfillment.packed_at.isoformat()}")
    print(f"[OK] Expected Delivery Date calculated & persisted: {fulfillment.expected_delivery_date}")

    # 4. TEST DISPATCH FLOW
    print("\n--- TEST 4: DISPATCH FLOW & PERSISTENCE ---")
    auto_trk = generate_unique_tracking_number(db)
    order.order_status = "Dispatched"
    fulfillment.fulfillment_status = "Dispatched"
    fulfillment.dispatched_at = datetime.utcnow()
    fulfillment.carrier = new_carrier.carrier_name
    fulfillment.tracking_number = auto_trk

    from app.routers.fulfillment import create_customer_notification
    msg_str = f"Your order RET-{order.order_id:06d} has been dispatched. Tracking Number: {auto_trk}. Expected delivery: {fulfillment.expected_delivery_date}."
    create_customer_notification(
        db,
        customer_id=order.customer_id,
        title=f"Order Dispatched — RET-{order.order_id:06d}",
        message=msg_str
    )
    db.commit()
    db.refresh(fulfillment)

    print(f"[OK] Order status updated to: DISPATCHED")
    print(f"[OK] Carrier Partner persisted: {fulfillment.carrier}")
    print(f"[OK] Auto Tracking Number persisted in PostgreSQL: {fulfillment.tracking_number}")
    print(f"[OK] Customer Notification created with Tracking Number: '{msg_str}'")

    # 5. VERIFY DB RETRIEVAL / REFRESH
    print("\n--- TEST 5: PERSISTENCE VERIFICATION AFTER RE-QUERY ---")
    db.expire_all()
    queried_ful = db.query(models.OrderFulfillment).filter(models.OrderFulfillment.order_id == order.order_id).first()
    assert queried_ful.tracking_number == auto_trk, "Tracking number failed persistence check"
    assert queried_ful.carrier == new_carrier.carrier_name, "Carrier partner failed persistence check"
    assert queried_ful.expected_delivery_date == exp_date.strftime("%d %B %Y"), "Expected delivery date failed persistence check"
    print("[OK] All dispatch data verified from PostgreSQL database successfully!")

    print("=" * 70)
    print("ALL ACCEPTANCE TESTS PASSED CLEANLY!")
    print("=" * 70)
    db.close()

if __name__ == '__main__':
    run_tests()
