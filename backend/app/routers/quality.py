from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/quality", tags=["Quality Control & Rework"])

class QualityInspectionCreatePayload(BaseModel):
    order_type: str  # Custom / Fabrication / Readymade
    order_id: int
    stage_id: Optional[int] = None
    inspector_id: Optional[int] = 1
    result: str  # PASS / FAIL
    dimensions_check: bool = True
    finishing_check: bool = True
    structure_check: bool = True
    specifications_check: bool = True
    inspection_notes: Optional[str] = None
    photos: Optional[str] = None
    rework_worker_id: Optional[int] = None

class ReworkResolvePayload(BaseModel):
    notes: Optional[str] = None

@router.get("/inspections")
def get_inspections(
    order_type: Optional[str] = None,
    order_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.QualityInspection)
    if order_type and order_id:
        query = query.filter(
            models.QualityInspection.order_type == order_type,
            models.QualityInspection.order_id == order_id
        )

    inspections = query.order_by(models.QualityInspection.inspected_at.desc()).all()
    res = []
    for i in inspections:
        insp_user = db.query(models.User).filter(models.User.user_id == i.inspector_id).first()
        res.append({
            "inspection_id": i.inspection_id,
            "order_type": i.order_type,
            "order_id": i.order_id,
            "stage_id": i.stage_id,
            "inspector_id": i.inspector_id,
            "inspector_name": insp_user.full_name if insp_user else "QC Inspector",
            "result": i.result,
            "checklist": {
                "dimensions": i.dimensions_check,
                "finishing": i.finishing_check,
                "structure": i.structure_check,
                "specifications": i.specifications_check,
            },
            "inspection_notes": i.inspection_notes,
            "photos": i.photos,
            "inspected_at": i.inspected_at.isoformat() if i.inspected_at else None
        })
    return res

@router.post("/inspections", status_code=status.HTTP_201_CREATED)
def record_quality_inspection(payload: QualityInspectionCreatePayload, db: Session = Depends(get_db)):
    inspector_id = payload.inspector_id or 1

    insp = models.QualityInspection(
        order_type=payload.order_type,
        order_id=payload.order_id,
        stage_id=payload.stage_id,
        inspector_id=inspector_id,
        result=payload.result.upper(),
        dimensions_check=payload.dimensions_check,
        finishing_check=payload.finishing_check,
        structure_check=payload.structure_check,
        specifications_check=payload.specifications_check,
        inspection_notes=payload.inspection_notes,
        photos=payload.photos,
        inspected_at=datetime.utcnow()
    )
    db.add(insp)
    db.commit()
    db.refresh(insp)

    # If Failed, create Rework Job automatically
    if payload.result.upper() == "FAIL":
        worker_id = payload.rework_worker_id or inspector_id
        rework = models.ReworkJob(
            inspection_id=insp.inspection_id,
            assigned_worker_id=worker_id,
            rework_reason=payload.inspection_notes or "Quality control inspection failed. Rework required.",
            status="ASSIGNED",
            created_at=datetime.utcnow()
        )
        db.add(rework)

        # Update custom order status to Rework Required
        if payload.order_type == "Custom":
            ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == payload.order_id).first()
            if ord_obj:
                ord_obj.order_status = "Rework Required"

        db.commit()

    return {"message": f"Quality inspection recorded: {insp.result}", "inspection_id": insp.inspection_id, "result": insp.result}

@router.get("/rework")
def get_rework_jobs(db: Session = Depends(get_db)):
    jobs = db.query(models.ReworkJob).order_by(models.ReworkJob.created_at.desc()).all()
    res = []
    for r in jobs:
        insp = r.inspection
        worker = db.query(models.User).filter(models.User.user_id == r.assigned_worker_id).first()
        res.append({
            "rework_id": r.rework_id,
            "inspection_id": r.inspection_id,
            "order_type": insp.order_type if insp else "Custom",
            "order_id": insp.order_id if insp else 0,
            "assigned_worker_id": r.assigned_worker_id,
            "worker_name": worker.full_name if worker else "Artisan Worker",
            "rework_reason": r.rework_reason,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None
        })
    return res

@router.put("/rework/{rework_id}/resolve")
def resolve_rework_job(rework_id: int, payload: ReworkResolvePayload, db: Session = Depends(get_db)):
    rw = db.query(models.ReworkJob).filter(models.ReworkJob.rework_id == rework_id).first()
    if not rw:
        raise HTTPException(status_code=404, detail="Rework job not found")

    rw.status = "RESOLVED"
    rw.resolved_at = datetime.utcnow()

    # Reset custom order status to In Production for re-inspection
    if rw.inspection and rw.inspection.order_type == "Custom":
        ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == rw.inspection.order_id).first()
        if ord_obj:
            ord_obj.order_status = "In Production"

    db.commit()
    return {"message": f"Rework job #{rework_id} resolved and ready for re-inspection"}
