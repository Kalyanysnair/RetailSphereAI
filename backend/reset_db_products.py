import sys
import os
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models

def reset_and_clean_products():
    db = SessionLocal()
    try:
        print("Cleaning duplicate products and resetting database to canonical 13 products...")

        # Canonical 13 products data
        canonical_products = [
            {
                "id": 1,
                "name": "Emerald Green Velvet Lounge Sofa",
                "category": "Living Room",
                "subcategory": "Sofas & Couches",
                "material": "Italian Velvet & Solid Wood",
                "color": "Emerald Green",
                "dimensions": "260cm x 110cm x 75cm",
                "price": 145000.0,
                "stock": 12,
                "image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
                "desc": "Hand-upholstered luxury lounge sofa in premium deep emerald green velvet with solid wood legs."
            },
            {
                "id": 2,
                "name": "Nordic Minimalist Modular Sofa",
                "category": "Living Room",
                "subcategory": "Sofas & Couches",
                "material": "Woven Linen & Oak Wood",
                "color": "Warm Beige",
                "dimensions": "320cm x 180cm x 80cm",
                "price": 220000.0,
                "stock": 5,
                "image": "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80",
                "desc": "Luxe modular deep-seated sectional sofa in warm beige woven linen with high-density foam cushions."
            },
            {
                "id": 3,
                "name": "Calacatta Italian Marble Coffee Table",
                "category": "Living Room",
                "subcategory": "Coffee & Accent Tables",
                "material": "Italian Marble & Brushed Brass",
                "color": "White Calacatta / Antique Brass",
                "dimensions": "120cm x 70cm x 40cm",
                "price": 42500.0,
                "stock": 18,
                "image": "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80",
                "desc": "Polished natural Calacatta marble top with solid brushed brass geometric metal frame."
            },
            {
                "id": 4,
                "name": "Minimalist Teak Wood Side Table",
                "category": "Living Room",
                "subcategory": "Coffee & Accent Tables",
                "material": "Solid Teak Wood",
                "color": "Natural Smoked Oak",
                "dimensions": "50cm x 50cm x 55cm",
                "price": 18500.0,
                "stock": 15,
                "image": "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80",
                "desc": "Artisanal hand-turned solid teak accent table finished in protective matte organic oil."
            },
            {
                "id": 5,
                "name": "Minimalist Teak Wood 6-Seater Dining Set",
                "category": "Dining Room",
                "subcategory": "Dining Tables",
                "material": "Solid Teak Wood",
                "color": "Warm Honey Teak",
                "dimensions": "210cm x 95cm x 76cm",
                "price": 98000.0,
                "stock": 8,
                "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
                "desc": "Sustainably sourced solid teak dining table crafted with chamfered joinery legs."
            },
            {
                "id": 6,
                "name": "Smoked Walnut Solid Wood Dining Table",
                "category": "Dining Room",
                "subcategory": "Dining Tables",
                "material": "American Walnut & Brass",
                "color": "Smoked Dark Walnut",
                "dimensions": "240cm x 100cm x 76cm",
                "price": 112000.0,
                "stock": 4,
                "image": "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80",
                "desc": "Premium smoked dark walnut dining table featuring hand-inlaid matte brass corners."
            },
            {
                "id": 7,
                "name": "Artisan Upholstered Oak Dining Chair (Set of 2)",
                "category": "Dining Room",
                "subcategory": "Dining Chairs",
                "material": "FSC Oak & Natural Linen",
                "color": "Natural Oak / Oatmeal",
                "dimensions": "52cm x 55cm x 82cm",
                "price": 34000.0,
                "stock": 14,
                "image": "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80",
                "desc": "Handcrafted FSC-certified solid oak dining chairs upholstered in stain-resistant woven linen."
            },
            {
                "id": 8,
                "name": "Japanese Oak Minimalist Bed Frame",
                "category": "Bedroom",
                "subcategory": "Beds & Headboards",
                "material": "FSC-Certified Solid Oak",
                "color": "Natural Japanese Oak",
                "dimensions": "200cm x 215cm x 115cm",
                "price": 125000.0,
                "stock": 6,
                "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
                "desc": "Minimalist Japanese solid oak platform bed frame with organic clean joinery."
            },
            {
                "id": 9,
                "name": "Scandi Solid Teak Platform Bed",
                "category": "Bedroom",
                "subcategory": "Beds & Headboards",
                "material": "Solid Teak Wood & Natural Rattan",
                "color": "Natural Blonde Teak",
                "dimensions": "195cm x 210cm x 110cm",
                "price": 85000.0,
                "stock": 10,
                "image": "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
                "desc": "Minimalist Scandinavian platform bed frame with hand-woven organic cane headboard."
            },
            {
                "id": 10,
                "name": "Contemporary Walnut 3-Drawer Dresser",
                "category": "Bedroom",
                "subcategory": "Wardrobes & Storage",
                "material": "Walnut Veneer & Brushed Brass",
                "color": "Smoked Walnut / Gold",
                "dimensions": "110cm x 50cm x 85cm",
                "price": 48000.0,
                "stock": 9,
                "image": "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80",
                "desc": "Soft-closing 3-drawer storage chest featuring soft walnut grain and brushed brass bar pulls."
            },
            {
                "id": 11,
                "name": "Executive Smoked Walnut Writing Desk",
                "category": "Home Office",
                "subcategory": "Desks & Workstations",
                "material": "Smoked Walnut & Black Steel",
                "color": "Dark Walnut / Matte Black",
                "dimensions": "160cm x 75cm x 76cm",
                "price": 56000.0,
                "stock": 7,
                "image": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80",
                "desc": "Sleek executive writing desk with dual wire management ports and integrated drawer storage."
            },
            {
                "id": 12,
                "name": "Ergonomic Executive Genuine Leather Chair",
                "category": "Home Office",
                "subcategory": "Ergonomic Seating",
                "material": "Top-Grain Leather & Aluminium",
                "color": "Cognac Brown / Chrome",
                "dimensions": "65cm x 65cm x 120cm",
                "price": 36500.0,
                "stock": 12,
                "image": "https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80",
                "desc": "Ergonomic high-back desk chair in full top-grain cognac leather with pneumatic height adjust."
            },
            {
                "id": 13,
                "name": "Bespoke Curved Architectural Lounge Chair",
                "category": "Custom Studio",
                "subcategory": "Custom Furniture Concepts",
                "material": "Black Ash & Steel",
                "color": "Charcoal Black",
                "dimensions": "90cm x 88cm x 82cm",
                "price": 78000.0,
                "stock": 3,
                "image": "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80",
                "desc": "Custom architectural accent chair featuring high-density foam and matte black steel frame."
            }
        ]

        # Delete any product in DB whose ID > 13
        extra_prods = db.query(models.Product).filter(models.Product.product_id > 13).all()
        for p in extra_prods:
            db.query(models.ProductImage).filter(models.ProductImage.product_id == p.product_id).delete()
            db.delete(p)
        db.commit()
        print(f"Deleted {len(extra_prods)} duplicate/extra product entries (ID > 13).")

        # Update IDs 1 to 13 in DB
        for item in canonical_products:
            prod_id = item["id"]
            p = db.query(models.Product).filter(models.Product.product_id == prod_id).first()
            
            # Find category and subcategory
            cat = db.query(models.Category).filter(models.Category.category_name == item["category"]).first()
            if not cat:
                cat = models.Category(category_name=item["category"], status=True)
                db.add(cat)
                db.commit()
                db.refresh(cat)

            subcat = db.query(models.Subcategory).filter(
                models.Subcategory.category_id == cat.category_id,
                models.Subcategory.subcategory_name == item["subcategory"]
            ).first()
            if not subcat:
                subcat = models.Subcategory(category_id=cat.category_id, subcategory_name=item["subcategory"], status=True)
                db.add(subcat)
                db.commit()
                db.refresh(subcat)

            if p:
                p.product_name = item["name"]
                p.category_id = cat.category_id
                p.subcategory_id = subcat.subcategory_id
                p.material = item["material"]
                p.color = item["color"]
                p.dimensions = item["dimensions"]
                p.price = item["price"]
                p.stock_quantity = item["stock"]
                p.image = item["image"]
                p.description = item["desc"]
                p.status = "Approved"
                p.availability_status = "Available"
                db.commit()

                # Update ProductImage
                prod_img = db.query(models.ProductImage).filter(models.ProductImage.product_id == prod_id).first()
                if prod_img:
                    prod_img.image_url = item["image"]
                    db.commit()
                else:
                    new_img = models.ProductImage(product_id=prod_id, image_url=item["image"])
                    db.add(new_img)
                    db.commit()
                print(f"Updated Product #{prod_id}: {item['name']}")
            else:
                # Insert if missing
                new_p = models.Product(
                    product_id=prod_id,
                    category_id=cat.category_id,
                    subcategory_id=subcat.subcategory_id,
                    product_name=item["name"],
                    material=item["material"],
                    color=item["color"],
                    dimensions=item["dimensions"],
                    price=item["price"],
                    stock_quantity=item["stock"],
                    image=item["image"],
                    description=item["desc"],
                    status="Approved",
                    availability_status="Available"
                )
                db.add(new_p)
                db.commit()
                print(f"Created Product #{prod_id}: {item['name']}")

        print("\nDatabase product clean-up completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error resetting database products: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_clean_products()
