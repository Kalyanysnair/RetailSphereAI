from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from app.database import get_db
from app import models, auth

router = APIRouter(prefix="/api/worker", tags=["Worker Operations"])

class TaskCompletePayload(BaseModel):
    notes: Optional[str] = None
    work_images: Optional[str] = None
    progress_percentage: Optional[int] = 100

class TaskIssuePayload(BaseModel):
    issue_type: str  # Material / Design / Tool / Damage / Other
    description: str
    photo_url: Optional[str] = None

class OnsiteStatusPayload(BaseModel):
    status: str  # ASSIGNED, IN_TRANSIT, IN_PROGRESS, COMPLETED
    customer_notes: Optional[str] = None
    before_photos: Optional[str] = None
    after_photos: Optional[str] = None


def format_duration(started: Optional[datetime], completed: Optional[datetime]) -> str:
    if not started or not completed:
        return "N/A"
    delta = completed - started
    total_seconds = int(delta.total_seconds())
    if total_seconds <= 0:
        return "1m"
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


@router.get("/my-summary")
def get_worker_summary(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id

    # Active tasks (in progress)
    active_stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.assigned_worker_id == worker_id,
        models.ProductionStage.status == "IN_PROGRESS"
    ).count()

    active_assignments = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.worker_id == worker_id,
        models.WorkerAssignment.task_status.ilike("%In Progress%")
    ).count()

    active_count = max(active_stages, active_assignments)

    # Pending tasks (assigned)
    pending_stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.assigned_worker_id == worker_id,
        models.ProductionStage.status.in_(["ASSIGNED", "READY_FOR_ASSIGNMENT"])
    ).count()

    pending_assignments = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.worker_id == worker_id,
        models.WorkerAssignment.task_status.ilike("%Assigned%")
    ).count()

    pending_count = max(pending_stages, pending_assignments)

    # Completed today
    today_start = datetime.combine(date.today(), datetime.min.time())
    completed_today_stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.assigned_worker_id == worker_id,
        models.ProductionStage.status == "COMPLETED",
        models.ProductionStage.completed_at >= today_start
    ).count()

    completed_today_assignments = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.worker_id == worker_id,
        models.WorkerAssignment.task_status.ilike("%Completed%")
    ).count()

    completed_today = max(completed_today_stages, completed_today_assignments)

    # Onsite jobs
    onsite_jobs = db.query(models.ServiceJob).filter(
        models.ServiceJob.worker_id == worker_id,
        models.ServiceJob.status.in_(["ASSIGNED", "IN_TRANSIT", "IN_PROGRESS"])
    ).count()

    return {
        "worker_id": worker_id,
        "worker_name": current_user.full_name,
        "role": current_user.role.role_name if current_user.role else "Worker",
        "specialization": current_user.specialization or "Woodwork & Carpentry",
        "is_driver": bool(current_user.is_driver),
        "active_tasks_count": active_count,
        "pending_tasks_count": pending_count,
        "completed_today_count": completed_today,
        "onsite_jobs_count": onsite_jobs
    }


@router.get("/my-tasks")
def get_worker_tasks(
    status_filter: Optional[str] = Query(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    tasks = []

    # 1. Custom Orders via WorkerAssignment
    assignments = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.worker_id == worker_id
    ).all()

    for asgn in assignments:
        order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == asgn.custom_order_id).first()
        if not order:
            continue

        raw_status = (asgn.task_status or "Assigned").strip()
        stage_name = "Production Stage"
        mapped_status = "ASSIGNED"

        if ":" in raw_status:
            parts = raw_status.split(":", 1)
            stage_name = parts[0].strip()
            st_part = parts[1].strip().lower()
            if "completed" in st_part:
                mapped_status = "COMPLETED"
            elif "in progress" in st_part:
                mapped_status = "IN_PROGRESS"
            elif "hold" in st_part:
                mapped_status = "ON_HOLD"
            else:
                mapped_status = "ASSIGNED"
        else:
            st_lower = raw_status.lower()
            if "completed" in st_lower:
                mapped_status = "COMPLETED"
            elif "in progress" in st_lower:
                mapped_status = "IN_PROGRESS"
            elif "hold" in st_lower:
                mapped_status = "ON_HOLD"

        stage_obj = db.query(models.ProductionStage).filter(
            models.ProductionStage.order_id == order.custom_order_id,
            models.ProductionStage.assigned_worker_id == worker_id
        ).first()

        started_at = stage_obj.started_at.isoformat() if stage_obj and stage_obj.started_at else None
        completed_at = stage_obj.completed_at.isoformat() if stage_obj and stage_obj.completed_at else None
        
        latest_prog = db.query(models.ProductionProgress).filter(
            models.ProductionProgress.custom_order_id == order.custom_order_id
        ).order_by(models.ProductionProgress.updated_at.desc()).first()

        tasks.append({
            "task_id": f"asgn-{asgn.assignment_id}",
            "raw_assignment_id": asgn.assignment_id,
            "order_type": "Custom",
            "order_id": f"ORD-{order.custom_order_id:04d}",
            "raw_order_id": order.custom_order_id,
            "job_name": f"Custom {order.furniture_type}",
            "stage_name": stage_obj.stage_name if stage_obj else stage_name,
            "required_skill": current_user.specialization or "Woodwork & Carpentry",
            "task_status": mapped_status,
            "priority": getattr(order, "priority", "NORMAL") or "NORMAL",
            "assigned_date": asgn.assigned_date.strftime("%Y-%m-%d") if asgn.assigned_date else "Recent",
            "dimensions": order.dimensions,
            "material": order.material,
            "color": order.color,
            "customer_requirements": order.design_description or "Standard custom specification",
            "reference_image": order.reference_image or "",
            "technical_instructions": latest_prog.remarks if latest_prog else "Follow attached reference drawing and dimensions.",
            "started_at": started_at,
            "completed_at": completed_at,
            "progress_percentage": latest_prog.progress_percentage if latest_prog else (100 if mapped_status == "COMPLETED" else (50 if mapped_status == "IN_PROGRESS" else 0))
        })

    # 2. ProductionStage records assigned to worker
    prod_stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.assigned_worker_id == worker_id
    ).all()

    existing_task_ids = {t["task_id"] for t in tasks}

    for stg in prod_stages:
        task_key = f"stg-{stg.stage_id}"
        if task_key in existing_task_ids:
            continue

        order_code = f"ORD-{stg.order_id:04d}" if stg.order_type == "Custom" else f"FAB-{stg.order_id:04d}"
        job_title = f"{stg.order_type} Order"

        if stg.order_type == "Custom":
            ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == stg.order_id).first()
            if ord_obj:
                job_title = f"Custom {ord_obj.furniture_type}"
                dims = ord_obj.dimensions
                mat = ord_obj.material
                col = ord_obj.color
                desc = ord_obj.design_description
                img = ord_obj.reference_image
            else:
                dims, mat, col, desc, img = "N/A", "Wood", "Natural", "", ""
        else:
            fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == stg.order_id).first()
            if fab_obj:
                job_title = f"Fabrication {fab_obj.service_type}"
                dims = fab_obj.dimensions
                mat = fab_obj.material_source
                col = "Standard Finish"
                desc = fab_obj.requirements
                img = fab_obj.drawing_image
            else:
                dims, mat, col, desc, img = "N/A", "Material", "Standard", "", ""

        tasks.append({
            "task_id": task_key,
            "raw_stage_id": stg.stage_id,
            "order_type": stg.order_type,
            "order_id": order_code,
            "raw_order_id": stg.order_id,
            "job_name": job_title,
            "stage_name": stg.stage_name,
            "required_skill": stg.required_skill or current_user.specialization or "Woodwork & Carpentry",
            "task_status": stg.status.upper() if stg.status else "ASSIGNED",
            "priority": "NORMAL",
            "assigned_date": stg.started_at.strftime("%Y-%m-%d") if stg.started_at else "Recent",
            "dimensions": dims,
            "material": mat,
            "color": col,
            "customer_requirements": desc or "Fulfill fabrication requirement",
            "reference_image": img or "",
            "technical_instructions": stg.remarks or "Proceed with stage execution according to specs.",
            "started_at": stg.started_at.isoformat() if stg.started_at else None,
            "completed_at": stg.completed_at.isoformat() if stg.completed_at else None,
            "progress_percentage": stg.progress_percentage
        })

    # Apply optional status filter
    if status_filter and status_filter.strip() and status_filter != "All":
        clean_sf = status_filter.strip().upper()
        tasks = [t for t in tasks if t["task_status"] == clean_sf]

    return tasks


@router.get("/my-tasks/{task_id}")
def get_worker_task_detail(
    task_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    tasks = get_worker_tasks(status_filter=None, current_user=current_user, db=db)
    found = next((t for t in tasks if t["task_id"] == task_id), None)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found or is not assigned to your worker account."
        )
    return found


@router.post("/my-tasks/{task_id}/start")
def start_worker_task(
    task_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    now = datetime.utcnow()

    if task_id.startswith("asgn-"):
        asgn_id = int(task_id.replace("asgn-", ""))
        asgn = db.query(models.WorkerAssignment).filter(
            models.WorkerAssignment.assignment_id == asgn_id,
            models.WorkerAssignment.worker_id == worker_id
        ).first()
        if not asgn:
            raise HTTPException(status_code=404, detail="Task assignment not found or unauthorized.")

        dept_prefix = asgn.task_status.split(":")[0] if ":" in asgn.task_status else (current_user.specialization or "Production")
        asgn.task_status = f"{dept_prefix}: In Progress"

        order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == asgn.custom_order_id).first()
        if order and order.order_status in ["Approved", "Pending"]:
            order.order_status = "In Production"

        prog = models.ProductionProgress(
            custom_order_id=asgn.custom_order_id,
            updated_by=worker_id,
            stage=f"{dept_prefix} — In Progress",
            progress_percentage=25,
            remarks=f"Stage started by worker {current_user.full_name} at {now.strftime('%I:%M %p')}."
        )
        db.add(prog)

        hist = models.ProductionHistory(
            order_type="Custom",
            order_id=asgn.custom_order_id,
            stage_name=dept_prefix,
            worker_id=worker_id,
            action_by_id=worker_id,
            action="START_STAGE",
            previous_status="ASSIGNED",
            new_status="IN_PROGRESS",
            notes=f"Started by worker {current_user.full_name}",
            timestamp=now
        )
        db.add(hist)

    elif task_id.startswith("stg-"):
        stg_id = int(task_id.replace("stg-", ""))
        stg = db.query(models.ProductionStage).filter(
            models.ProductionStage.stage_id == stg_id,
            models.ProductionStage.assigned_worker_id == worker_id
        ).first()
        if not stg:
            raise HTTPException(status_code=404, detail="Production stage not found or unauthorized.")

        stg.status = "IN_PROGRESS"
        stg.started_at = now
        stg.progress_percentage = max(stg.progress_percentage, 25)

        hist = models.ProductionHistory(
            order_type=stg.order_type,
            order_id=stg.order_id,
            stage_name=stg.stage_name,
            worker_id=worker_id,
            action_by_id=worker_id,
            action="START_STAGE",
            previous_status="ASSIGNED",
            new_status="IN_PROGRESS",
            notes=f"Started by worker {current_user.full_name}",
            timestamp=now
        )
        db.add(hist)

    else:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    db.commit()
    return {"message": f"Task '{task_id}' started successfully.", "task_status": "IN_PROGRESS", "started_at": now.isoformat()}


@router.post("/my-tasks/{task_id}/complete")
def complete_worker_task(
    task_id: str,
    payload: TaskCompletePayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    now = datetime.utcnow()
    notes_clean = payload.notes.strip() if payload.notes else None
    pct = payload.progress_percentage or 100

    if task_id.startswith("asgn-"):
        asgn_id = int(task_id.replace("asgn-", ""))
        asgn = db.query(models.WorkerAssignment).filter(
            models.WorkerAssignment.assignment_id == asgn_id,
            models.WorkerAssignment.worker_id == worker_id
        ).first()
        if not asgn:
            raise HTTPException(status_code=404, detail="Task assignment not found or unauthorized.")

        dept_prefix = asgn.task_status.split(":")[0] if ":" in asgn.task_status else (current_user.specialization or "Production")
        asgn.task_status = f"{dept_prefix}: Completed"

        prog = models.ProductionProgress(
            custom_order_id=asgn.custom_order_id,
            updated_by=worker_id,
            stage=f"{dept_prefix} Completed",
            progress_percentage=pct,
            remarks=notes_clean or f"Stage completed by worker {current_user.full_name}."
        )
        db.add(prog)

        hist = models.ProductionHistory(
            order_type="Custom",
            order_id=asgn.custom_order_id,
            stage_name=dept_prefix,
            worker_id=worker_id,
            action_by_id=worker_id,
            action="COMPLETE_STAGE",
            previous_status="IN_PROGRESS",
            new_status="COMPLETED",
            notes=notes_clean or "Stage completed",
            timestamp=now
        )
        db.add(hist)

    elif task_id.startswith("stg-"):
        stg_id = int(task_id.replace("stg-", ""))
        stg = db.query(models.ProductionStage).filter(
            models.ProductionStage.stage_id == stg_id,
            models.ProductionStage.assigned_worker_id == worker_id
        ).first()
        if not stg:
            raise HTTPException(status_code=404, detail="Production stage not found or unauthorized.")

        stg.status = "COMPLETED"
        stg.completed_at = now
        stg.progress_percentage = pct
        if notes_clean:
            stg.remarks = notes_clean

        hist = models.ProductionHistory(
            order_type=stg.order_type,
            order_id=stg.order_id,
            stage_name=stg.stage_name,
            worker_id=worker_id,
            action_by_id=worker_id,
            action="COMPLETE_STAGE",
            previous_status="IN_PROGRESS",
            new_status="COMPLETED",
            notes=notes_clean or "Stage completed",
            timestamp=now
        )
        db.add(hist)

    else:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    db.commit()
    return {"message": f"Task '{task_id}' completed successfully.", "task_status": "COMPLETED", "completed_at": now.isoformat()}


@router.post("/my-tasks/{task_id}/report-issue")
def report_worker_task_issue(
    task_id: str,
    payload: TaskIssuePayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    now = datetime.utcnow()
    desc_clean = payload.description.strip()
    issue_type_clean = payload.issue_type.strip()

    issue_note = f"[ISSUE REPORTED — {issue_type_clean}] {desc_clean}"

    if task_id.startswith("asgn-"):
        asgn_id = int(task_id.replace("asgn-", ""))
        asgn = db.query(models.WorkerAssignment).filter(
            models.WorkerAssignment.assignment_id == asgn_id,
            models.WorkerAssignment.worker_id == worker_id
        ).first()
        if not asgn:
            raise HTTPException(status_code=404, detail="Task assignment not found or unauthorized.")

        dept_prefix = asgn.task_status.split(":")[0] if ":" in asgn.task_status else (current_user.specialization or "Production")
        asgn.task_status = f"{dept_prefix}: On Hold"

        prog = models.ProductionProgress(
            custom_order_id=asgn.custom_order_id,
            updated_by=worker_id,
            stage=f"{dept_prefix} — On Hold",
            progress_percentage=25,
            remarks=issue_note
        )
        db.add(prog)

        hist = models.ProductionHistory(
            order_type="Custom",
            order_id=asgn.custom_order_id,
            stage_name=dept_prefix,
            worker_id=worker_id,
            action_by_id=worker_id,
            action="REPORT_ISSUE",
            previous_status="IN_PROGRESS",
            new_status="ON_HOLD",
            notes=issue_note,
            timestamp=now
        )
        db.add(hist)

    elif task_id.startswith("stg-"):
        stg_id = int(task_id.replace("stg-", ""))
        stg = db.query(models.ProductionStage).filter(
            models.ProductionStage.stage_id == stg_id,
            models.ProductionStage.assigned_worker_id == worker_id
        ).first()
        if not stg:
            raise HTTPException(status_code=404, detail="Production stage not found or unauthorized.")

        stg.status = "ON_HOLD"
        stg.remarks = issue_note

        hist = models.ProductionHistory(
            order_type=stg.order_type,
            order_id=stg.order_id,
            stage_name=stg.stage_name,
            worker_id=worker_id,
            action_by_id=worker_id,
            action="REPORT_ISSUE",
            previous_status=stg.status,
            new_status="ON_HOLD",
            notes=issue_note,
            timestamp=now
        )
        db.add(hist)

    else:
        raise HTTPException(status_code=400, detail="Invalid task ID format.")

    db.commit()
    return {"message": f"Issue reported for Task '{task_id}'. Status set to ON_HOLD.", "task_status": "ON_HOLD"}


@router.get("/completed-history")
def get_worker_completed_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    tasks = get_worker_tasks(status_filter="COMPLETED", current_user=current_user, db=db)
    result = []
    for t in tasks:
        started_dt = datetime.fromisoformat(t["started_at"]) if t.get("started_at") else None
        completed_dt = datetime.fromisoformat(t["completed_at"]) if t.get("completed_at") else None
        duration_str = format_duration(started_dt, completed_dt)

        result.append({
            "task_id": t["task_id"],
            "order_id": t["order_id"],
            "job_name": t["job_name"],
            "stage_name": t["stage_name"],
            "completed_date": t.get("completed_at", "Recent"),
            "duration": duration_str,
            "status": "COMPLETED",
            "technical_instructions": t.get("technical_instructions", "")
        })
    return result


@router.get("/onsite-jobs")
def get_worker_onsite_jobs(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    jobs = db.query(models.ServiceJob).filter(
        models.ServiceJob.worker_id == worker_id
    ).all()

    result = []
    for j in jobs:
        req = j.service_request
        cust = req.customer if req else None
        cust_user = cust.user if cust else None

        result.append({
            "job_id": j.job_id,
            "service_id": f"SVC-{req.service_id:04d}" if req else f"SVC-{j.service_id}",
            "service_category": req.service_category if req else "Installation",
            "description": req.description if req else "On-site installation request",
            "customer_name": cust_user.full_name if cust_user else "Customer",
            "customer_phone": cust_user.phone if cust_user else "",
            "address": f"{req.address}, {req.city} - {req.pincode}" if req else "On-site",
            "scheduled_time": j.scheduled_time.strftime("%d %b %Y, %I:%M %p") if j.scheduled_time else "Scheduled",
            "status": j.status or "ASSIGNED",
            "before_photos": j.before_photos or "",
            "after_photos": j.after_photos or "",
            "customer_notes": j.customer_notes or "",
            "completed_at": j.completed_at.isoformat() if j.completed_at else None
        })
    return result


@router.post("/onsite-jobs/{job_id}/status")
def update_onsite_job_status(
    job_id: int,
    payload: OnsiteStatusPayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    job = db.query(models.ServiceJob).filter(
        models.ServiceJob.job_id == job_id,
        models.ServiceJob.worker_id == worker_id
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="On-site service job not found or unauthorized.")

    new_st = payload.status.upper().strip()
    job.status = new_st
    if payload.customer_notes:
        job.customer_notes = payload.customer_notes.strip()
    if payload.before_photos:
        job.before_photos = payload.before_photos
    if payload.after_photos:
        job.after_photos = payload.after_photos

    if new_st == "COMPLETED":
        job.completed_at = datetime.utcnow()
        if job.service_request:
            job.service_request.status = "COMPLETED"

    db.commit()
    return {"message": f"On-site service job #{job_id} status updated to {new_st}.", "status": new_st}
