import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import CarrierPartner, DeliveryPersonnel, User, OrderFulfillment

def run():
    db = SessionLocal()
    try:
        blue_dart = db.query(CarrierPartner).filter(CarrierPartner.carrier_id == 9).first()
        if not blue_dart:
            blue_dart = db.query(CarrierPartner).filter(CarrierPartner.carrier_name.ilike('%bluedart%')).first()
        print(f"BlueDart Carrier ID: {blue_dart.carrier_id}, Name: {blue_dart.carrier_name}")

        p_d = db.query(DeliveryPersonnel).filter(DeliveryPersonnel.email == 'deepthidpk004@gmail.com').first()
        if p_d:
            p_d.name = 'deepthi d'
            p_d.carrier_id = blue_dart.carrier_id
            if p_d.user:
                p_d.user.full_name = 'deepthi d'
            print(f"Updated deepthi d (ID: {p_d.personnel_id}) under {blue_dart.carrier_name}")

        p_cd = db.query(DeliveryPersonnel).filter(DeliveryPersonnel.email == 'deepthicd2027@mca.ajce.in').first()
        if p_cd:
            p_cd.name = 'deepthi cd'
            p_cd.carrier_id = blue_dart.carrier_id
            if p_cd.user:
                p_cd.user.full_name = 'deepthi cd'
            print(f"Updated deepthi cd (ID: {p_cd.personnel_id}) under {blue_dart.carrier_name}")

        # Remove all other personnel from Carrier ID 1 (Delivery Times)
        del_times_personnel = db.query(DeliveryPersonnel).filter(DeliveryPersonnel.carrier_id == 1).all()
        for p in del_times_personnel:
            if p.email not in ['deepthidpk004@gmail.com', 'deepthicd2027@mca.ajce.in']:
                print(f"Removing personnel {p.name} ({p.email}) from Delivery Times")
                # Remove or reset any fulfillment assigned to this personnel
                db.query(OrderFulfillment).filter(OrderFulfillment.assigned_personnel_id == p.personnel_id).update({"assigned_personnel_id": None})
                db.delete(p)

        # Reassign fulfillment 11 to BlueDart and deepthi cd
        for f in db.query(OrderFulfillment).filter(OrderFulfillment.carrier_id == 1).all():
            f.carrier_id = blue_dart.carrier_id
            f.carrier = blue_dart.carrier_name

        if p_cd:
            f11 = db.query(OrderFulfillment).filter(OrderFulfillment.fulfillment_id == 11).first()
            if f11:
                f11.assigned_personnel_id = p_cd.personnel_id
                f11.carrier_id = blue_dart.carrier_id
                f11.carrier = blue_dart.carrier_name

            f8 = db.query(OrderFulfillment).filter(OrderFulfillment.fulfillment_id == 8).first()
            if f8:
                f8.assigned_personnel_id = p_cd.personnel_id

        db.commit()

        print("\n--- ALL PERSONNEL NOW ---")
        for p in db.query(DeliveryPersonnel).all():
            c = db.query(CarrierPartner).filter(CarrierPartner.carrier_id == p.carrier_id).first()
            c_name = c.carrier_name if c else 'None'
            print(f"ID: {p.personnel_id} | Name: '{p.name}' | Carrier: '{c_name}' (ID: {p.carrier_id}) | Email: {p.email}")

        dt_count = db.query(DeliveryPersonnel).filter(DeliveryPersonnel.carrier_id == 1).count()
        print(f"\nDelivery Times (Carrier 1) Personnel Count: {dt_count}")

        bd_count = db.query(DeliveryPersonnel).filter(DeliveryPersonnel.carrier_id == blue_dart.carrier_id).count()
        print(f"BlueDart (Carrier {blue_dart.carrier_id}) Personnel Count: {bd_count}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    run()
