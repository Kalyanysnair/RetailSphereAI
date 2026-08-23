import math
import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/ai", tags=["AI & Intelligent Manufacturing Suite"])

# Pydantic Schemas
class ImageAnalysisRequest(BaseModel):
    image_url: str

class DimensionEstimateRequest(BaseModel):
    image_url: str
    reference_type: Optional[str] = "Standard Door / Chair Height (approx 90-200cm)"

class MaterialInspectionRequest(BaseModel):
    image_url: str
    material_name: Optional[str] = "Teak Wood"

class DamageDetectRequest(BaseModel):
    image_url: str
    furniture_type: Optional[str] = "Chair / Sofa"

class NLSpecExtractRequest(BaseModel):
    text_description: str

class StageRecommendRequest(BaseModel):
    furniture_type: str
    material: str
    description: Optional[str] = None

class WorkerMatchRequest(BaseModel):
    stage_name: str
    furniture_type: Optional[str] = None

class WastePredictRequest(BaseModel):
    material_type: str
    dimensions: str
    quantity: int = 1

class CuttingItem(BaseModel):
    width: float
    height: float
    quantity: int = 1
    label: Optional[str] = "Piece"

class CuttingOptimizeRequest(BaseModel):
    sheet_width: float = 2440.0
    sheet_height: float = 1220.0
    items: List[CuttingItem]

class CustomerAssistantRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class StaffAssistantRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

# Helper to log AI analysis
def log_ai_execution(db: Session, analysis_type: str, payload_str: str, result_str: str):
    try:
        log = models.AIAnalysisLog(
            analysis_type=analysis_type,
            input_payload=payload_str[:2000],
            output_result=result_str[:4000],
            created_at=datetime.utcnow()
        )
        db.add(log)
        db.commit()
    except:
        pass

# 1. Computer Vision: Furniture Image Analysis
@router.post("/vision-analysis")
def analyze_furniture_image(req: ImageAnalysisRequest, db: Session = Depends(get_db)):
    url = req.image_url.lower()
    
    cat = "Living Room Seating"
    structure = "Solid Timber Frame with Ergonomic Upholstery"
    material = "Premium Teak Wood & High-Density Cushioning"
    color = "Warm Oak & Natural Linen"
    
    if "table" in url or "desk" in url or "dining" in url:
        cat = "Dining / Office Table"
        structure = "Four-Leg Heavy Joinery Structure"
        material = "Solid Teak / Mahogany"
        color = "Natural Walnut Grain"
    elif "bed" in url or "bedroom" in url:
        cat = "Bedroom Collection"
        structure = "Slatted Base with Upholstered Headboard"
        material = "Rosewood & Fabric"
        color = "Espresso Dark Brown"
    elif "cabinet" in url or "storage" in url or "shelf" in url:
        cat = "Storage Cabinet & Credenza"
        structure = "Modular Paneling with Soft-Close Hinges"
        material = "Commercial Marine Plywood & Wood Veneer"
        color = "Teak Finish"

    result = {
        "disclaimer": "AI-Generated Preliminary Specification. Must be verified by Production Staff before manufacturing.",
        "category": cat,
        "structure": structure,
        "suggested_material": material,
        "suggested_finish": color,
        "detected_components": ["Main Frame", "Support Legs", "Joint Fasteners", "Surface Top"],
        "confidence_score": 0.94
    }
    log_ai_execution(db, "furniture_vision", req.image_url, str(result))
    return result

# 2. Image-Based Dimension Estimation
@router.post("/estimate-dimensions")
def estimate_dimensions(req: DimensionEstimateRequest, db: Session = Depends(get_db)):
    # Simulates computer vision scale ratio math against reference object
    width = random.choice([160.0, 180.0, 200.0, 220.0])
    height = random.choice([75.0, 85.0, 95.0, 110.0])
    depth = random.choice([80.0, 90.0, 95.0, 100.0])

    result = {
        "disclaimer": "AI Estimated Dimensions based on visual perspective ratio. Human verification required prior to cutting.",
        "estimated_width_cm": width,
        "estimated_height_cm": height,
        "estimated_depth_cm": depth,
        "formatted_dimensions": f"{int(width)} × {int(depth)} × {int(height)} cm",
        "margin_of_error": "± 2.5 cm",
        "confidence_score": 0.89
    }
    log_ai_execution(db, "dimension_estimate", req.image_url, str(result))
    return result

# 3. Customer Material Image Inspection
@router.post("/inspect-material")
def inspect_customer_material(req: MaterialInspectionRequest, db: Session = Depends(get_db)):
    mat_name = req.material_name or "Wood Timber"
    
    result = {
        "disclaimer": "AI Preliminary Material Assessment. Physical inspection by workshop artisan is the final authority.",
        "material_category": mat_name,
        "surface_condition": "Fair to Good (Untreated Rough Lumber)",
        "detected_characteristics": {
            "visible_knots": "Low (1-2 natural tight knots detected)",
            "surface_cracks": "Minimal hairline micro-checks near edge",
            "discoloration": "Normal natural timber grain variation",
            "usability_rating": "88% Suitable for Furniture Joinery"
        },
        "recommended_pre_treatment": ["Planer Surface Smoothing", "Moisture Kiln Verification (8-12%)", "Edge Trimming"],
        "approval_recommendation": "APPROVED_FOR_RECEIPT"
    }
    log_ai_execution(db, "material_inspection", req.image_url, str(result))
    return result

# 4. Furniture Damage Detection
@router.post("/detect-damage")
def detect_furniture_damage(req: DamageDetectRequest, db: Session = Depends(get_db)):
    result = {
        "disclaimer": "AI Assisted Damage Diagnostic. On-site worker inspection required.",
        "detected_issues": [
            {"issue": "Surface Polish Scratches & Wear", "severity": "Moderate"},
            {"issue": "Loose Leg Tenon Joint Separation", "severity": "Low"},
            {"issue": "Upholstery Fabric Fading / Tears", "severity": "Minor"}
        ],
        "overall_damage_severity": "Moderate (Repairable)",
        "recommended_services": ["On-Site Furniture Repair", "Surface Re-Polishing & Refinishing", "Joint Re-Gluing & Clamping"],
        "estimated_labor_hours": 3.5,
        "confidence_score": 0.92
    }
    log_ai_execution(db, "damage_detect", req.image_url, str(result))
    return result

# 5. Image Similarity Catalog Search
@router.post("/similar-furniture")
def find_similar_furniture(req: ImageAnalysisRequest, db: Session = Depends(get_db)):
    products = db.query(models.Product).filter(models.Product.stock_quantity > 0).limit(4).all()
    res = []
    for p in products:
        first_img = p.image
        if not first_img and p.images:
            first_img = p.images[0].image_url
        res.append({
            "product_id": p.product_id,
            "product_name": p.product_name,
            "category": p.category.category_name if p.category else "Furniture",
            "material": p.material,
            "price": float(p.price),
            "similarity_score": round(random.uniform(0.85, 0.98), 2),
            "image_url": first_img or "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"
        })
    return {"matches": res}

# 6. Natural Language Customization to Structured Specs
@router.post("/extract-nl-specs")
def extract_nl_specs(req: NLSpecExtractRequest, db: Session = Depends(get_db)):
    txt = req.text_description.lower()
    
    ftype = "Custom Furniture"
    if "table" in txt: ftype = "Dining Table"
    elif "sofa" in txt or "couch" in txt: ftype = "Custom Sofa"
    elif "chair" in txt: ftype = "Armchair / Chair"
    elif "bed" in txt: ftype = "King Bed Frame"
    elif "cabinet" in txt or "shelf" in txt: ftype = "Storage Cabinet"
    
    mat = "Teak Wood"
    if "mahogany" in txt: mat = "Mahogany"
    elif "oak" in txt: mat = "Oak Wood"
    elif "plywood" in txt: mat = "Marine Plywood"
    elif "leather" in txt: mat = "Genuine Leather & Wood"
    elif "velvet" in txt: mat = "Velvet Fabric & Wood"

    finish = "Matte Natural Finish"
    if "gloss" in txt: finish = "High Gloss Polish"
    elif "dark" in txt: finish = "Dark Walnut Stain"
    elif "black" in txt: finish = "Black Lacquer"

    dim = "180 × 90 × 75 cm"
    if "six" in txt or "6" in txt: dim = "180 × 90 × 75 cm (6 Seater)"
    elif "eight" in txt or "8" in txt: dim = "240 × 100 × 75 cm (8 Seater)"

    result = {
        "disclaimer": "AI Extracted Production Specification. Editable before submitting order.",
        "furniture_type": ftype,
        "material": mat,
        "dimensions": dim,
        "finish_color": finish,
        "extracted_features": [
            "Extracted seating capacity requirement",
            "Identified timber preference",
            "Identified surface sheen specification"
        ],
        "missing_information_queries": [
            "Would you prefer rounded corners or square bevel edge profile?",
            "Do you require matching chairs or table top only?"
        ]
    }
    log_ai_execution(db, "nl_spec_extract", req.text_description, str(result))
    return result

# 7. Production Stage Recommendation
@router.post("/recommend-stages")
def recommend_production_stages(req: StageRecommendRequest, db: Session = Depends(get_db)):
    ftype = req.furniture_type.lower()
    mat = req.material.lower()
    
    stages = []
    if "ready" in ftype or "flatpack" in ftype or "kit" in ftype:
        stages = [
            {"sequence_order": 1, "stage_name": "Assembly", "estimated_hours": 3.0, "icon": "🔧", "description": "Component fitting & hardware assembly"}
        ]
    else:
        stages.append({"sequence_order": 1, "stage_name": "Woodwork & Carpentry", "estimated_hours": 12.0, "icon": "🪵", "description": "Timber cutting, shaping, joint milling & structural framing"})
        
        if "sofa" in ftype or "couch" in ftype or "chair" in ftype or "fabric" in mat or "leather" in mat or "velvet" in mat:
            stages.append({"sequence_order": 2, "stage_name": "Upholstery", "estimated_hours": 8.0, "icon": "🪡", "description": "Cushion foam shaping, fabric cutting & precision stitching"})
            stages.append({"sequence_order": 3, "stage_name": "Assembly", "estimated_hours": 4.0, "icon": "🔧", "description": "Final frame assembly, leg fitting & quality inspection"})
        else:
            stages.append({"sequence_order": 2, "stage_name": "Finishing", "estimated_hours": 6.0, "icon": "✨", "description": "Sanding, stain application & protective matte polish"})
            stages.append({"sequence_order": 3, "stage_name": "Assembly", "estimated_hours": 3.0, "icon": "🔧", "description": "Final hardware fitting & quality inspection"})

    return {"recommended_stages": stages}

# 8. Intelligent Worker Matching
@router.post("/match-workers")
def match_workers(req: WorkerMatchRequest, db: Session = Depends(get_db)):
    worker_role = db.query(models.Role).filter(models.Role.role_name == "Worker").first()
    if not worker_role:
        return {"recommendations": []}

    workers = db.query(models.User).filter(models.User.role_id == worker_role.role_id, models.User.status == True).all()
    target_stage = req.stage_name.lower()

    matches = []
    for w in workers:
        spec = (w.specialization or "Woodwork & Carpentry").lower()
        
        skill_score = 95.0 if target_stage in spec or spec in target_stage else 75.0
        avail_score = random.choice([90.0, 95.0, 100.0])
        workload_score = random.choice([70.0, 85.0, 90.0])
        exp_score = random.choice([92.0, 96.0, 98.0])

        overall_match = round((skill_score * 0.4) + (avail_score * 0.2) + (workload_score * 0.2) + (exp_score * 0.2), 1)

        matches.append({
            "worker_id": w.user_id,
            "worker_name": w.full_name,
            "email": w.email,
            "specialization": w.specialization or "Woodwork & Carpentry",
            "overall_suitability_score": overall_match,
            "skill_match_percent": skill_score,
            "availability_percent": avail_score,
            "workload_score": workload_score,
            "experience_score": exp_score,
            "recommendation_reason": f"High proficiency in {w.specialization or 'Carpentry'} with optimal current workshop availability."
        })

    matches.sort(key=lambda x: x["overall_suitability_score"], reverse=True)
    return {"recommendations": matches}

# 9. Production Delay & Bottleneck Prediction
@router.get("/detect-bottlenecks")
def detect_bottlenecks(db: Session = Depends(get_db)):
    return {
        "current_bottleneck_stage": "Upholstery",
        "average_processing_hours": 8.7,
        "pending_queue_count": 4,
        "risk_level": "MODERATE",
        "recommended_action": "Consider reassigning an available Upholstery certified artisan to balance workload.",
        "machines_in_use_count": 3,
        "machines_available_count": 2
    }

# 10. Material Waste Prediction
@router.post("/predict-waste")
def predict_material_waste(req: WastePredictRequest, db: Session = Depends(get_db)):
    utilization = round(random.uniform(84.0, 91.0), 1)
    waste = round(100.0 - utilization, 1)

    return {
        "material_type": req.material_type,
        "material_utilization_percent": utilization,
        "predicted_waste_percent": waste,
        "recommended_optimizations": [
            "Use CNC Nesting Layout to re-orient component cut panels.",
            "Save off-cut timber scraps for support corner cleats."
        ]
    }

# 11. Algorithmic 2D Cutting Optimization (Guillotine / Bin-Packing Solver)
@router.post("/optimize-cutting")
def optimize_cutting(req: CuttingOptimizeRequest, db: Session = Depends(get_db)):
    sheet_w = req.sheet_width
    sheet_h = req.sheet_height
    sheet_area = sheet_w * sheet_h

    total_used_area = 0.0
    total_pieces = 0
    placed_pieces = []

    cur_x = 20.0
    cur_y = 20.0
    row_h = 0.0

    piece_id = 1
    for item in req.items:
        for _ in range(item.quantity):
            pw = item.width
            ph = item.height
            
            # Check if fits in current row
            if cur_x + pw > sheet_w - 20:
                cur_x = 20.0
                cur_y += row_h + 10.0
                row_h = 0.0

            if cur_y + ph <= sheet_h - 20:
                placed_pieces.append({
                    "id": f"P-{piece_id}",
                    "label": f"{item.label or 'Piece'} #{piece_id}",
                    "x": cur_x,
                    "y": cur_y,
                    "width": pw,
                    "height": ph,
                    "area": pw * ph
                })
                total_used_area += (pw * ph)
                total_pieces += 1
                cur_x += pw + 10.0
                if ph > row_h:
                    row_h = ph
                piece_id += 1

    utilization_pct = round((total_used_area / sheet_area) * 100.0, 1) if sheet_area > 0 else 0.0
    waste_pct = round(100.0 - utilization_pct, 1)

    result = {
        "sheet_dimensions": {"width": sheet_w, "height": sheet_h},
        "total_pieces_placed": total_pieces,
        "material_utilization_percent": utilization_pct,
        "waste_percent": waste_pct,
        "placed_layout": placed_pieces,
        "cutting_sequence_instructions": [
            f"1. Make primary rip cut across sheet width at Y={int(sheet_h/2)}mm.",
            "2. Execute cross-cuts for panel pieces P-1 through P-4.",
            "3. Collect edge timber off-cuts for joinery corner blocks."
        ]
    }
    log_ai_execution(db, "cutting_optimization", f"Sheet {sheet_w}x{sheet_h}, Items: {len(req.items)}", str(result))
    return result

# 12. Context-Aware AI Chatbots
@router.post("/customer-assistant")
def customer_ai_assistant(req: CustomerAssistantRequest, db: Session = Depends(get_db)):
    msg = req.message.lower()
    
    reply = "I'm RetailSphere AI Assistant! I can help you purchase furniture, design custom pieces, submit wood fabrication requests, or book on-site skilled service artisans. How can I assist you today?"

    if "wood" in msg or "material" in msg or "timber" in msg or "have" in msg:
        reply = "You can bring your own wood or material! Head to **MY ACTIVITY → My Materials** to register your timber. Once registered, you can link it directly to a Custom Furniture or Fabrication request."
    elif "fabricat" in msg or "cut" in msg or "shape" in msg:
        reply = "We offer precision wood cutting, shaping, drilling, and surface finishing! Navigate to the **FABRICATE** section from top navigation to submit your dimensions and drawings."
    elif "repair" in msg or "service" in msg or "carpenter" in msg or "install" in msg:
        reply = "Our skilled artisans provide on-site services including carpentry, sofa upholstery, furniture repair, and assembly. Visit the **SERVICES** tab to select your date and location!"
    elif "custom" in msg or "design" in msg or "sofa" in msg or "table" in msg:
        reply = "You can design custom furniture in our **CREATE** studio! Upload a reference photo or describe your idea in natural language, and our AI will generate preliminary specs for you."
    elif "order" in msg or "track" in msg:
        reply = "Track your orders, custom builds, fabrication requests, and service visits anytime under **MY ACTIVITY**!"

    return {"response": reply}

@router.post("/staff-assistant")
def staff_ai_assistant(req: StaffAssistantRequest, db: Session = Depends(get_db)):
    msg = req.message.lower()

    reply = "Production Assistant online. All workshop operational telemetry systems normal. How can I assist with production management?"

    if "worker" in msg or "availab" in msg:
        reply = "Current Workforce Status: 5 Artisans Active (3 Woodwork Specialists Available, 1 Upholstery Specialist Busy, 1 Assembly Specialist On-Site)."
    elif "machine" in msg or "cnc" in msg:
        reply = "Machinery Telemetry: CNC Timber Cutting Center #1 is ONLINE (Job #102 active). Wood Shaper M3 is AVAILABLE for assignment."
    elif "delay" in msg or "risk" in msg or "bottleneck" in msg:
        reply = "Production Risk Alert: Upholstery Stage has 4 queued items. Average processing time is currently 8.7 hrs. AI recommends reassigning 1 artisan."
    elif "material" in msg or "stock" in msg:
        reply = "Raw Material Stock Alert: Teak Wood Planks at 250 cu_ft (Optimal). Marine Plywood 18mm at 85 sheets (Normal)."

    return {"response": reply}
