import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app import models

def parse_stage_meta(remarks_str: Optional[str]) -> Dict[str, Any]:
    if not remarks_str:
        return {"completed_sections": [], "current_section": None, "pause_reason": None, "user_notes": "", "photos": None}
    try:
        data = json.loads(remarks_str)
        if isinstance(data, dict):
            return {
                "completed_sections": data.get("completed_sections", []) or [],
                "current_section": data.get("current_section"),
                "pause_reason": data.get("pause_reason"),
                "user_notes": data.get("user_notes", "") or data.get("notes", "") or "",
                "photos": data.get("photos") or data.get("work_images")
            }
    except Exception:
        pass
    return {"completed_sections": [], "current_section": None, "pause_reason": None, "user_notes": remarks_str, "photos": None}

def dump_stage_meta(
    existing_remarks: Optional[str],
    completed_sections: Optional[List[str]] = None,
    current_section: Optional[str] = None,
    pause_reason: Optional[str] = None,
    user_notes: Optional[str] = None,
    photos: Optional[str] = None
) -> str:
    meta = parse_stage_meta(existing_remarks)
    if completed_sections is not None:
        meta["completed_sections"] = completed_sections
    if current_section is not None:
        meta["current_section"] = current_section
    if pause_reason is not None:
        meta["pause_reason"] = pause_reason if pause_reason.strip() else None
    if user_notes is not None:
        meta["user_notes"] = user_notes
    if photos is not None:
        meta["photos"] = photos
    return json.dumps(meta)

def complete_stage_and_unlock_next(
    db: Session,
    stage: models.ProductionStage,
    worker_id: Optional[int],
    action_by_id: Optional[int],
    notes: Optional[str] = None,
    progress_percentage: int = 100,
    photos: Optional[str] = None
) -> Dict[str, Any]:
    """
    Shared authoritative helper for completing a ProductionStage.
    Validates state machine, updates stage status, unlocks next sequential stage,
    and transitions parent order to QC_PENDING when final stage completes.
    """
    try:
        # 1. State machine validation
        if stage.status == "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stage '{stage.stage_name}' has already been marked as completed."
            )
        if stage.status not in ["IN_PROGRESS", "PAUSED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete stage '{stage.stage_name}' from current status '{stage.status}'. Stage must be in progress or paused before completion."
            )

        now = datetime.utcnow()
        pct = max(0, min(100, progress_percentage or 100))
        notes_clean = notes.strip() if notes else None

        # 2. Complete current stage
        existing_meta = parse_stage_meta(stage.remarks)
        effective_notes = notes_clean or existing_meta.get("user_notes") or ""
        effective_photos = photos if photos is not None else existing_meta.get("photos")

        stage.status = "COMPLETED"
        stage.completed_at = now
        stage.progress_percentage = pct
        stage.remarks = dump_stage_meta(
            stage.remarks,
            completed_sections=["sec-1", "sec-2", "sec-3", "sec-4"],
            current_section="Completed",
            pause_reason="",
            user_notes=effective_notes,
            photos=effective_photos
        )

        # 3. Record in ProductionHistory
        effective_worker_id = worker_id or stage.assigned_worker_id
        effective_action_by = action_by_id or effective_worker_id or 1
        hist_notes = effective_notes or f"Stage '{stage.stage_name}' completed"
        if effective_photos and "(Photos attached)" not in hist_notes:
            hist_notes = f"{hist_notes} (Photos attached)"

        hist = models.ProductionHistory(
            order_type=stage.order_type,
            order_id=stage.order_id,
            stage_name=stage.stage_name,
            worker_id=effective_worker_id,
            action_by_id=effective_action_by,
            action="COMPLETE_STAGE",
            previous_status="IN_PROGRESS",
            new_status="COMPLETED",
            notes=hist_notes,
            timestamp=now
        )
        db.add(hist)

        # 4. Check for next stage in sequence
        ot_raw = stage.order_type or ""
        ot_upper = ot_raw.upper().strip()

        next_stage = db.query(models.ProductionStage).filter(
            models.ProductionStage.order_type.ilike(ot_raw),
            models.ProductionStage.order_id == stage.order_id,
            models.ProductionStage.sequence_order == stage.sequence_order + 1
        ).first()

        unlocked_stage_id = None
        order_status_updated = None

        if next_stage:
            if next_stage.status == "LOCKED":
                next_stage.status = "READY_FOR_ASSIGNMENT"
                unlocked_stage_id = next_stage.stage_id

                unlock_hist = models.ProductionHistory(
                    order_type=stage.order_type,
                    order_id=stage.order_id,
                    stage_name=next_stage.stage_name,
                    worker_id=None,
                    action_by_id=effective_action_by,
                    action="STAGE_UNLOCKED",
                    previous_status="LOCKED",
                    new_status="READY_FOR_ASSIGNMENT",
                    notes=f"Stage '{next_stage.stage_name}' unlocked for assignment following completion of '{stage.stage_name}'",
                    timestamp=now
                )
                db.add(unlock_hist)
        else:
            # Check if all stages for this order are completed
            incomplete_count = db.query(models.ProductionStage).filter(
                models.ProductionStage.order_type.ilike(ot_raw),
                models.ProductionStage.order_id == stage.order_id,
                models.ProductionStage.stage_id != stage.stage_id,
                models.ProductionStage.status != "COMPLETED"
            ).count()

            if incomplete_count == 0:
                # Final stage completed -> Transition order to QC_PENDING (never directly Completed!)
                if ot_upper in ["CUSTOM", "CUSTOMIZATION"]:
                    c_ord = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == stage.order_id).first()
                    if c_ord:
                        c_ord.order_status = "QC_PENDING"
                        order_status_updated = "QC_PENDING"
                elif ot_upper == "FABRICATION":
                    f_ord = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == stage.order_id).first()
                    if f_ord:
                        f_ord.status = "QC_PENDING"
                        order_status_updated = "QC_PENDING"

        return {
            "message": f"Stage '{stage.stage_name}' completed successfully",
            "stage_id": stage.stage_id,
            "status": "COMPLETED",
            "next_stage_id": unlocked_stage_id,
            "unlocked_stage_id": unlocked_stage_id,
            "completed_at": now.isoformat(),
            "order_status_updated": order_status_updated
        }
    except Exception:
        db.rollback()
        raise
