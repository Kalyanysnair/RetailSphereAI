import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, date, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app import models, auth

def run_carrier_migration():
    """
    Initializes new carrier tables and performs the one-time migration/linking
    for the single existing Carrier Partner record.
    """
    # 1. Add missing columns to existing tables safely
    with engine.connect() as conn:
        alter_statements = [
            "ALTER TABLE tbl_carrier_partner ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES tbl_users(user_id);",
            "ALTER TABLE tbl_carrier_partner ADD COLUMN IF NOT EXISTS coverage_areas VARCHAR(255);",
            "ALTER TABLE tbl_order_fulfillment ADD COLUMN IF NOT EXISTS carrier_id INTEGER REFERENCES tbl_carrier_partner(carrier_id);",
            "ALTER TABLE tbl_order_fulfillment ADD COLUMN IF NOT EXISTS assigned_personnel_id INTEGER;",
            "ALTER TABLE tbl_order_fulfillment ADD COLUMN IF NOT EXISTS transportation_provider VARCHAR(30) DEFAULT 'INTERNAL_FLEET';",
            "ALTER TABLE tbl_order_fulfillment ADD COLUMN IF NOT EXISTS pickup_address TEXT;",
            "ALTER TABLE tbl_order_fulfillment ADD COLUMN IF NOT EXISTS destination_address TEXT;",
            "ALTER TABLE tbl_order_fulfillment ADD COLUMN IF NOT EXISTS distance_km NUMERIC(8, 2);",
            "ALTER TABLE tbl_order_fulfillment ADD COLUMN IF NOT EXISTS transportation_charge NUMERIC(10, 2);",
            "ALTER TABLE tbl_order_fulfillment ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) DEFAULT 'FURNITURE_DELIVERY';",
            "ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS material_arrival_mode VARCHAR(50) DEFAULT 'CUSTOMER_BRINGS';",
            "ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS material_pickup_address TEXT;",
            "ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS material_pickup_distance_km NUMERIC(8, 2);",
            "ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS material_pickup_charge NUMERIC(10, 2) DEFAULT 0.0;",
            "ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS return_delivery_mode VARCHAR(50) DEFAULT 'CUSTOMER_COLLECTS';",
            "ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS return_delivery_address TEXT;",
            "ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS return_delivery_distance_km NUMERIC(8, 2);",
            "ALTER TABLE tbl_fabrication_request ADD COLUMN IF NOT EXISTS return_delivery_charge NUMERIC(10, 2) DEFAULT 0.0;",
        ]
        for stmt in alter_statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                print(f"[SQL MIGRATION NOTICE] {stmt}: {e}")

    # 2. Create newly declared tables
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # 3. Ensure 'Carrier Partner' role exists in tbl_role
        carrier_role = db.query(models.Role).filter(
            (models.Role.role_name == "Carrier Partner") |
            (models.Role.role_name == "CARRIER_PARTNER")
        ).first()

        if not carrier_role:
            carrier_role = models.Role(role_name="Carrier Partner")
            db.add(carrier_role)
            db.commit()
            db.refresh(carrier_role)
            print(f"[MIGRATION] Created 'Carrier Partner' role (ID: {carrier_role.role_id})")

        # 4. Ensure default Rate Cards exist in tbl_transportation_rate_card
        default_rate_cards = [
            ("STANDARD_DELIVERY", 100.0, 15.0, 100.0),
            ("FABRICATION_PICKUP", 120.0, 15.0, 120.0),
            ("FABRICATION_RETURN", 120.0, 15.0, 120.0),
        ]
        for s_type, base_c, rate_k, min_c in default_rate_cards:
            existing_rc = db.query(models.TransportationRateCard).filter(
                models.TransportationRateCard.service_type == s_type
            ).first()
            if not existing_rc:
                db.add(models.TransportationRateCard(
                    service_type=s_type,
                    base_charge=base_c,
                    rate_per_km=rate_k,
                    min_charge=min_c,
                    is_active=True
                ))
        db.commit()

        # 5. Handle verification/linking for registered Carrier Partners
        carriers = db.query(models.CarrierPartner).all()
        for carrier in carriers:
            if carrier.contact_email:
                target_email = carrier.contact_email.strip().lower()
                carrier_user = db.query(models.User).filter(
                    (models.User.email == target_email) | (models.User.user_id == carrier.user_id)
                ).first()

                if not carrier_user:
                    temp_pwd = "Carrier@123"
                    hashed_pwd = auth.get_password_hash(temp_pwd)
                    carrier_user = models.User(
                        role_id=carrier_role.role_id,
                        full_name=carrier.carrier_name or "Carrier Partner Agency",
                        email=target_email,
                        phone=carrier.contact_phone or "+919876543210",
                        password=hashed_pwd,
                        status=True,
                        must_change_password=True
                    )
                    db.add(carrier_user)
                    db.commit()
                    db.refresh(carrier_user)
                    print(f"[MIGRATION] Linked User ID #{carrier_user.user_id} created for Carrier Partner '{carrier.carrier_name}'")
                else:
                    carrier_user.email = target_email
                    carrier_user.full_name = carrier.carrier_name
                    carrier_user.role_id = carrier_role.role_id
                    carrier_user.status = True
                    db.commit()

                carrier.user_id = carrier_user.user_id
                db.commit()

                # Ensure active formal business agreement exists for this partner
                existing_agr = db.query(models.CarrierAgreement).filter(
                    models.CarrierAgreement.carrier_id == carrier.carrier_id
                ).first()

                if not existing_agr:
                    admin_user = db.query(models.User).join(models.Role).filter(models.Role.role_name == "Admin").first()
                    new_agr = models.CarrierAgreement(
                        agreement_number=f"AGR-RS-2026-00{carrier.carrier_id}",
                        carrier_id=carrier.carrier_id,
                        title="RetailSphere Commercial Transportation & Consignment Agreement",
                    effective_date=date.today() - timedelta(days=30),
                    expiry_date=date.today() + timedelta(days=335),
                    services_covered="Ready-Made Furniture Deliveries, Custom Furniture Consignments, Raw Material Inbound Pickups, Post-Fabrication Customer Handover",
                    transportation_terms="Guaranteed pickup within 4 hours of dispatch confirmation; GPS route compliance; signature proof of delivery required on delivery completion.",
                    settlement_terms="Weekly electronic settlement cycle with consolidated invoice generation. Margin deduction: 10% platform facilitation fee.",
                    coverage_area="Kottayam, Ernakulam, Alappuzha, Pathanamthitta, Idukki Districts",
                    base_payout_rate=100.0,
                    per_km_payout_rate=15.0,
                    status="ACTIVE",
                    created_by_id=admin_user.user_id if admin_user else None
                )
                db.add(new_agr)
                db.commit()
                print(f"[MIGRATION] Master Service Agreement created for Carrier Partner #{carrier.carrier_id}")

        print("[MIGRATION] Carrier Partner migration check completed successfully.")
    except Exception as e:
        print(f"[MIGRATION ERROR] {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    run_carrier_migration()
