import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models

def seed_database():
    db = SessionLocal()
    try:
        print("Updating product database images...")

        # Ensure admin user exists for added_by
        admin_user = db.query(models.User).filter(models.User.email == "admin@retailsphere.com").first()
        if not admin_user:
            admin_role = db.query(models.Role).filter(models.Role.role_name == "Admin").first()
            if not admin_role:
                admin_role = models.Role(role_name="Admin")
                db.add(admin_role)
                db.commit()
                db.refresh(admin_role)
            
            admin_user = models.User(
                role_id=admin_role.role_id,
                full_name="System Admin",
                email="admin@retailsphere.com",
                status=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # Ensure supplier exists
        supplier = db.query(models.Supplier).first()
        if not supplier:
            supplier = models.Supplier(
                supplier_name="Artisan Crafts & Timber Co.",
                contact_person="Master Woodworker Marcus",
                phone="+91 9876543210",
                email="supplier@retailsphere.com",
                address="124 Furniture Industrial Estate, Bengaluru, India"
            )
            db.add(supplier)
            db.commit()
            db.refresh(supplier)

        categories_data = [
            {
                "name": "Living Room",
                "desc": "Luxury lounge sofas, coffee tables, and contemporary living space furniture.",
                "image": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
                "subcategories": [
                    {
                        "name": "Sofas & Couches",
                        "desc": "Curved bouclé sofas, modular sectionals, and luxury lounge seating.",
                        "products": [
                            {
                                "name": "Nordic Bouclé Curved Lounge Sofa",
                                "material": "Bouclé Fabric & Teak",
                                "color": "Cream White / Warm Walnut",
                                "dimensions": "260cm x 110cm x 75cm",
                                "price": 145000.0,
                                "stock": 12,
                                "image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
                                "desc": "Hand-upholstered organic curved lounge sofa in premium stain-resistant textured bouclé fabric."
                            },
                            {
                                "name": "Italian Velvet Modular Sectional Sofa",
                                "material": "Italian Velvet & American Walnut",
                                "color": "Deep Emerald Green",
                                "dimensions": "320cm x 180cm x 80cm",
                                "price": 220000.0,
                                "stock": 5,
                                "image": "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80",
                                "desc": "Luxe modular deep-seated sectional sofa with high-density foam cushions and solid walnut feet."
                            }
                        ]
                    },
                    {
                        "name": "Coffee & Accent Tables",
                        "desc": "Italian marble tables, solid teak accent pieces, and brass inlays.",
                        "products": [
                            {
                                "name": "Calacatta Italian Marble Coffee Table",
                                "material": "Italian Marble & Brushed Brass",
                                "color": "White Calacatta / Antique Brass",
                                "dimensions": "120cm x 70cm x 40cm",
                                "price": 42500.0,
                                "stock": 18,
                                "image": "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80",
                                "desc": "Polished natural Calacatta marble top with solid brushed brass geometric metal frame."
                            },
                            {
                                "name": "Minimalist Teak Wood Side Table",
                                "material": "Solid Teak Wood",
                                "color": "Natural Smoked Oak",
                                "dimensions": "50cm x 50cm x 55cm",
                                "price": 18500.0,
                                "stock": 15,
                                "image": "https://images.unsplash.com/photo-1532372576444-dda954194ad0?auto=format&fit=crop&w=800&q=80",
                                "desc": "Artisanal hand-turned solid teak accent table finished in protective matte organic oil."
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Dining Room",
                "desc": "Solid timber dining tables, hand-carved chairs, and dining room storage.",
                "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
                "subcategories": [
                    {
                        "name": "Dining Tables",
                        "desc": "6-seater solid teak and smoked walnut dining tables.",
                        "products": [
                            {
                                "name": "Minimalist Teak Wood 6-Seater Dining Set",
                                "material": "Solid Teak Wood",
                                "color": "Warm Honey Teak",
                                "dimensions": "210cm x 95cm x 76cm",
                                "price": 98000.0,
                                "stock": 8,
                                "image": "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80",
                                "desc": "Sustainably sourced solid teak dining table crafted with chamfered joinery legs."
                            },
                            {
                                "name": "Smoked Walnut Solid Wood Dining Table",
                                "material": "American Walnut & Brass",
                                "color": "Smoked Dark Walnut",
                                "dimensions": "240cm x 100cm x 76cm",
                                "price": 112000.0,
                                "stock": 4,
                                "image": "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80",
                                "desc": "Premium smoked dark walnut dining table featuring hand-inlaid matte brass corners."
                            }
                        ]
                    },
                    {
                        "name": "Dining Chairs",
                        "desc": "Ergonomic dining chairs with natural linen and leather upholstery.",
                        "products": [
                            {
                                "name": "Artisan Upholstered Oak Dining Chair (Set of 2)",
                                "material": "FSC Oak & Natural Linen",
                                "color": "Natural Oak / Oatmeal",
                                "dimensions": "52cm x 55cm x 82cm",
                                "price": 34000.0,
                                "stock": 14,
                                "image": "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80",
                                "desc": "Handcrafted FSC-certified solid oak dining chairs upholstered in stain-resistant woven linen."
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Bedroom",
                "desc": "Upholstered king beds, solid teak platform beds, and contemporary dressers.",
                "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
                "subcategories": [
                    {
                        "name": "Beds & Headboards",
                        "desc": "Upholstered headboards and platform bedframes.",
                        "products": [
                            {
                                "name": "Empress Velvet Upholstered King Bed",
                                "material": "Italian Velvet & Hardwood",
                                "color": "Royal Navy Blue",
                                "dimensions": "200cm x 215cm x 135cm",
                                "price": 125000.0,
                                "stock": 6,
                                "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80",
                                "desc": "Tall channel-tufted king headboard wrapped in plush velvet with reinforced hardwood frame."
                            },
                            {
                                "name": "Scandi Solid Teak Platform Bed",
                                "material": "Solid Teak Wood & Natural Rattan",
                                "color": "Natural Blonde Teak",
                                "dimensions": "195cm x 210cm x 110cm",
                                "price": 85000.0,
                                "stock": 10,
                                "image": "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
                                "desc": "Minimalist Scandinavian platform bed frame with hand-woven organic cane headboard."
                            }
                        ]
                    },
                    {
                        "name": "Nightstands & Dressers",
                        "desc": "Bedside tables, chest of drawers, and vanity storage.",
                        "products": [
                            {
                                "name": "Contemporary Walnut 3-Drawer Dresser",
                                "material": "Walnut Veneer & Brushed Brass",
                                "color": "Smoked Walnut / Gold",
                                "dimensions": "110cm x 50cm x 85cm",
                                "price": 48000.0,
                                "stock": 9,
                                "image": "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80",
                                "desc": "Soft-closing 3-drawer storage chest featuring soft walnut grain and brushed brass bar pulls."
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Home Office",
                "desc": "Ergonomic leather chairs, executive writing desks, and shelving.",
                "image": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80",
                "subcategories": [
                    {
                        "name": "Desks & Workstations",
                        "desc": "Executive writing desks and modern work tables.",
                        "products": [
                            {
                                "name": "Executive Smoked Walnut Writing Desk",
                                "material": "Smoked Walnut & Black Steel",
                                "color": "Dark Walnut / Matte Black",
                                "dimensions": "160cm x 75cm x 76cm",
                                "price": 56000.0,
                                "stock": 7,
                                "image": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80",
                                "desc": "Sleek executive writing desk with dual wire management ports and integrated drawer storage."
                            }
                        ]
                    },
                    {
                        "name": "Ergonomic Seating",
                        "desc": "High-back leather executive chairs and desk seating.",
                        "products": [
                            {
                                "name": "Ergonomic Executive Genuine Leather Chair",
                                "material": "Top-Grain Leather & Aluminium",
                                "color": "Cognac Brown / Chrome",
                                "dimensions": "65cm x 65cm x 120cm",
                                "price": 36500.0,
                                "stock": 12,
                                "image": "https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80",
                                "desc": "Ergonomic high-back desk chair in full top-grain cognac leather with pneumatic height adjust."
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Custom Studio",
                "desc": "Bespoke custom furniture concepts made to client specifications.",
                "image": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
                "subcategories": [
                    {
                        "name": "Custom Furniture Concepts",
                        "desc": "Made-to-order custom studio armchairs and sectionals.",
                        "products": [
                            {
                                "name": "Bespoke Curved Architectural Lounge Chair",
                                "material": "Textured Bouclé & Brass Swivel",
                                "color": "Terracotta Rust / Brushed Gold",
                                "dimensions": "90cm x 88cm x 82cm",
                                "price": 78000.0,
                                "stock": 3,
                                "image": "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80",
                                "desc": "Custom architectural accent chair featuring 360-degree smooth brass swivel and high-density foam."
                            }
                        ]
                    }
                ]
            }
        ]

        for cat_info in categories_data:
            category = db.query(models.Category).filter(models.Category.category_name == cat_info["name"]).first()
            if not category:
                category = models.Category(
                    category_name=cat_info["name"],
                    description=cat_info["desc"],
                    image=cat_info["image"],
                    status=True
                )
                db.add(category)
                db.commit()
                db.refresh(category)

            for sub_info in cat_info["subcategories"]:
                subcat = db.query(models.Subcategory).filter(
                    models.Subcategory.category_id == category.category_id,
                    models.Subcategory.subcategory_name == sub_info["name"]
                ).first()

                if not subcat:
                    subcat = models.Subcategory(
                        category_id=category.category_id,
                        subcategory_name=sub_info["name"],
                        description=sub_info["desc"],
                        status=True
                    )
                    db.add(subcat)
                    db.commit()
                    db.refresh(subcat)

                for prod_info in sub_info["products"]:
                    existing_prod = db.query(models.Product).filter(
                        models.Product.product_name == prod_info["name"]
                    ).first()

                    if existing_prod:
                        existing_prod.image = prod_info["image"]
                        db.commit()

                        prod_img = db.query(models.ProductImage).filter(models.ProductImage.product_id == existing_prod.product_id).first()
                        if prod_img:
                            prod_img.image_url = prod_info["image"]
                            db.commit()
                        else:
                            new_img = models.ProductImage(product_id=existing_prod.product_id, image_url=prod_info["image"])
                            db.add(new_img)
                            db.commit()
                        print(f"Updated Image: '{existing_prod.product_name}' -> {prod_info['image']}")
                    else:
                        new_prod = models.Product(
                            category_id=category.category_id,
                            subcategory_id=subcat.subcategory_id,
                            supplier_id=supplier.supplier_id,
                            added_by=admin_user.user_id,
                            product_name=prod_info["name"],
                            description=prod_info["desc"],
                            material=prod_info["material"],
                            color=prod_info["color"],
                            dimensions=prod_info["dimensions"],
                            price=prod_info["price"],
                            stock_quantity=prod_info["stock"],
                            image=prod_info["image"],
                            status="Approved",
                            availability_status="Available" if prod_info["stock"] > 0 else "Out of Stock"
                        )
                        db.add(new_prod)
                        db.commit()

        print("\nAll database product image URLs successfully updated!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
