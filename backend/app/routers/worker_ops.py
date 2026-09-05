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
    tasks = get_worker_tasks(status_filter=None, current_user=current_user, db=db)

    # Active tasks (in progress)
    active_count = sum(1 for t in tasks if t.get("task_status") == "IN_PROGRESS")

    # Pending tasks (assigned / on hold / ready)
    pending_count = sum(1 for t in tasks if t.get("task_status") in ["ASSIGNED", "READY_FOR_ASSIGNMENT", "ON_HOLD"])

    # Completed today
    today_str = date.today().strftime("%Y-%m-%d")
    completed_today = sum(
        1 for t in tasks 
        if t.get("task_status") == "COMPLETED" and (
            (t.get("completed_at") or "").startswith(today_str) or 
            (t.get("assigned_date") or "").startswith(today_str)
        )
    )

    # Onsite jobs (Active / In Progress / Assigned)
    onsite_jobs = db.query(models.ServiceJob).filter(
        models.ServiceJob.worker_id == worker_id,
        models.ServiceJob.status.in_(["ASSIGNED", "IN_TRANSIT", "IN_PROGRESS"])
    ).count()

    # Rework jobs (Assigned QC reworks not yet resolved)
    rework_jobs = db.query(models.ReworkJob).filter(
        models.ReworkJob.assigned_worker_id == worker_id,
        models.ReworkJob.status != "RESOLVED"
    ).count()

    # Driver deliveries (if worker is driver)
    driver_deliveries = 0
    if current_user.is_driver:
        driver_deliveries = db.query(models.OrderFulfillment).filter(
            models.OrderFulfillment.driver_id == worker_id,
            models.OrderFulfillment.fulfillment_status != "Delivered"
        ).count()

    # Pending leaves count
    pending_leaves = db.query(models.WorkerLeave).filter(
        models.WorkerLeave.worker_id == worker_id,
        models.WorkerLeave.status == "Pending"
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
        "onsite_jobs_count": onsite_jobs,
        "rework_jobs_count": rework_jobs,
        "driver_deliveries_count": driver_deliveries,
        "pending_leaves_count": pending_leaves
    }


@router.get("/my-tasks")
def get_worker_tasks(
    status_filter: Optional[str] = Query(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    tasks = []

    # 1. Authoritative ProductionStage records assigned to worker
    prod_stages = db.query(models.ProductionStage).filter(
        models.ProductionStage.assigned_worker_id == worker_id
    ).all()

    covered_custom_orders = set()

    for stg in prod_stages:
        order_code = f"ORD-{stg.order_id:04d}" if stg.order_type == "Custom" else f"FAB-{stg.order_id:04d}"
        job_title = f"{stg.order_type} Order"

        if stg.order_type == "Custom":
            covered_custom_orders.add(stg.order_id)
            ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == stg.order_id).first()
            if ord_obj:
                job_title = f"Custom {ord_obj.furniture_type}"
                dims = ord_obj.dimensions
                mat = ord_obj.material
                col = ord_obj.color
                desc = ord_obj.design_description
                img = ord_obj.reference_image
                prio = getattr(ord_obj, "priority", "NORMAL") or "NORMAL"
            else:
                dims, mat, col, desc, img, prio = "N/A", "Wood", "Natural", "", "", "NORMAL"
        else:
            fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == stg.order_id).first()
            if fab_obj:
                job_title = f"Fabrication {fab_obj.service_type}"
                dims = fab_obj.dimensions
                mat = fab_obj.material_source
                col = "Standard Finish"
                desc = fab_obj.requirements
                img = fab_obj.drawing_image
                prio = getattr(fab_obj, "priority", "NORMAL") or "NORMAL"
            else:
                dims, mat, col, desc, img, prio = "N/A", "Material", "Standard", "", "", "NORMAL"

        tasks.append({
            "task_id": f"stg-{stg.stage_id}",
            "raw_stage_id": stg.stage_id,
            "order_type": stg.order_type,
            "order_id": order_code,
            "raw_order_id": stg.order_id,
            "job_name": job_title,
            "stage_name": stg.stage_name,
            "required_skill": stg.required_skill or current_user.specialization or "Woodwork & Carpentry",
            "task_status": stg.status.upper() if stg.status else "ASSIGNED",
            "priority": prio,
            "assigned_date": stg.started_at.strftime("%Y-%m-%d") if stg.started_at else (date.today().strftime("%Y-%m-%d")),
            "dimensions": dims,
            "material": mat,
            "color": col,
            "customer_requirements": desc or "Fulfill production requirement according to specifications",
            "reference_image": img or "",
            "technical_instructions": stg.remarks or "Proceed with stage execution according to specs.",
            "started_at": stg.started_at.isoformat() if stg.started_at else None,
            "completed_at": stg.completed_at.isoformat() if stg.completed_at else None,
            "progress_percentage": stg.progress_percentage
        })

    # 2. WorkerAssignment records (for Custom Orders not already covered by ProductionStage)
    assignments = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.worker_id == worker_id
    ).all()

    for asgn in assignments:
        if asgn.custom_order_id in covered_custom_orders:
            # Stage record is authoritative; skip duplicating with generic assignment
            continue

        order = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == asgn.custom_order_id).first()
        if not order:
            continue

        raw_status = (asgn.task_status or "Assigned").strip()
        stage_name = current_user.specialization or "Production Stage"
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
            "stage_name": stage_name,
            "required_skill": current_user.specialization or "Woodwork & Carpentry",
            "task_status": mapped_status,
            "priority": getattr(order, "priority", "NORMAL") or "NORMAL",
            "assigned_date": asgn.assigned_date.strftime("%Y-%m-%d") if asgn.assigned_date else date.today().strftime("%Y-%m-%d"),
            "dimensions": order.dimensions,
            "material": order.material,
            "color": order.color,
            "customer_requirements": order.design_description or "Standard custom specification",
            "reference_image": order.reference_image or "",
            "technical_instructions": latest_prog.remarks if latest_prog else "Follow attached reference drawing and dimensions.",
            "started_at": None,
            "completed_at": None,
            "progress_percentage": latest_prog.progress_percentage if latest_prog else (100 if mapped_status == "COMPLETED" else (50 if mapped_status == "IN_PROGRESS" else 0))
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

        # Check if all assignments for this custom order are completed
        all_asgns = db.query(models.WorkerAssignment).filter(
            models.WorkerAssignment.custom_order_id == asgn.custom_order_id
        ).all()
        if all_asgns and all(a.task_status and "Completed" in a.task_status for a in all_asgns):
            order = db.query(models.CustomOrder).filter(
                models.CustomOrder.custom_order_id == asgn.custom_order_id
            ).first()
            if order and order.order_status in ["In Production", "Approved", "Paid"]:
                order.order_status = "Completed"

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

    if new_st in ["COMPLETED", "DONE"]:
        job.completed_at = datetime.utcnow()
        if job.service_request:
            job.service_request.status = "COMPLETED"

    db.commit()
    return {"message": f"On-site service job #{job_id} status updated to {new_st}.", "status": new_st}


class LeaveApplicationPayload(BaseModel):
    leave_type: str = "Casual Leave"
    start_date: date
    end_date: date
    reason: str


@router.post("/leave-applications")
def apply_for_leave(
    payload: LeaveApplicationPayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    duration = (payload.end_date - payload.start_date).days + 1
    if duration < 1:
        raise HTTPException(status_code=400, detail="End date must be on or after start date.")

    leave = models.WorkerLeave(
        worker_id=current_user.user_id,
        worker_name=current_user.full_name,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        duration_days=duration,
        reason=payload.reason.strip(),
        status="Pending",
        applied_on=datetime.utcnow()
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)

    return {
        "message": "Leave application submitted successfully.",
        "leave_id": leave.leave_id,
        "status": leave.status
    }


@router.get("/leave-applications")
def get_my_leave_applications(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    leaves = db.query(models.WorkerLeave).filter(
        models.WorkerLeave.worker_id == current_user.user_id
    ).order_by(models.WorkerLeave.applied_on.desc()).all()

    return leaves


# ==================================================
# QC REWORK MANAGEMENT FOR ASSIGNED WORKERS
# ==================================================
class WorkerReworkResolvePayload(BaseModel):
    notes: Optional[str] = None


@router.get("/my-rework-jobs")
def get_worker_rework_jobs(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    reworks = db.query(models.ReworkJob).filter(
        models.ReworkJob.assigned_worker_id == worker_id
    ).order_by(models.ReworkJob.created_at.desc()).all()

    res = []
    for r in reworks:
        insp = r.inspection
        order_title = "Custom Production"
        ref_image = None
        dimensions = None
        material = None

        if insp and insp.order_type == "Custom":
            ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == insp.order_id).first()
            if ord_obj:
                order_title = f"Custom {ord_obj.furniture_type}"
                ref_image = ord_obj.reference_image
                dimensions = ord_obj.dimensions
                material = ord_obj.material
        elif insp and insp.order_type == "Fabrication":
            fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == insp.order_id).first()
            if fab_obj:
                order_title = f"Fabrication {fab_obj.service_type}"
                ref_image = fab_obj.drawing_image
                dimensions = fab_obj.dimensions
                material = fab_obj.material_source

        res.append({
            "rework_id": r.rework_id,
            "inspection_id": r.inspection_id,
            "order_type": insp.order_type if insp else "Custom",
            "order_id": f"ORD-{insp.order_id:04d}" if (insp and insp.order_type == "Custom") else (f"FAB-{insp.order_id:04d}" if insp else "N/A"),
            "raw_order_id": insp.order_id if insp else 0,
            "order_title": order_title,
            "rework_reason": r.rework_reason,
            "status": r.status or "ASSIGNED",
            "inspection_notes": insp.inspection_notes if insp else "",
            "checklist": {
                "dimensions": insp.dimensions_check if insp else True,
                "finishing": insp.finishing_check if insp else True,
                "structure": insp.structure_check if insp else True,
                "specifications": insp.specifications_check if insp else True,
            } if insp else {},
            "photos": insp.photos if insp else "",
            "reference_image": ref_image,
            "dimensions": dimensions,
            "material": material,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
        })
    return res


@router.post("/my-rework-jobs/{rework_id}/resolve")
def resolve_worker_rework_job(
    rework_id: int,
    payload: WorkerReworkResolvePayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    rw = db.query(models.ReworkJob).filter(
        models.ReworkJob.rework_id == rework_id,
        models.ReworkJob.assigned_worker_id == worker_id
    ).first()

    if not rw:
        raise HTTPException(status_code=404, detail="Rework job not found or unauthorized.")

    rw.status = "RESOLVED"
    rw.resolved_at = datetime.utcnow()

    # Reset order status to In Production for re-inspection
    if rw.inspection and rw.inspection.order_type == "Custom":
        ord_obj = db.query(models.CustomOrder).filter(models.CustomOrder.custom_order_id == rw.inspection.order_id).first()
        if ord_obj:
            ord_obj.order_status = "In Production"
    elif rw.inspection and rw.inspection.order_type == "Fabrication":
        fab_obj = db.query(models.FabricationRequest).filter(models.FabricationRequest.fabrication_id == rw.inspection.order_id).first()
        if fab_obj:
            fab_obj.status = "IN_PRODUCTION"

    db.commit()
    return {"message": f"Rework job #{rework_id} marked as resolved and submitted for re-inspection.", "status": "RESOLVED"}


# ==================================================
# DRIVER LOGISTICS DELIVERIES (FOR is_driver=True)
# ==================================================
class WorkerDeliveryStatusPayload(BaseModel):
    status: str  # Dispatched, Out for Delivery, Delivered
    notes: Optional[str] = None


@router.get("/my-deliveries")
def get_worker_deliveries(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    if not current_user.is_driver:
        return []

    fulfillments = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.driver_id == worker_id
    ).order_by(models.OrderFulfillment.fulfillment_id.desc()).all()

    res = []
    for f in fulfillments:
        ord_obj = f.order
        cust = ord_obj.customer if ord_obj else None
        cust_user = cust.user if cust else None
        veh = f.vehicle

        items_summary = []
        if ord_obj and ord_obj.items:
            for item in ord_obj.items:
                items_summary.append(f"{item.product_name or 'Furniture'} (x{item.quantity})")

        res.append({
            "fulfillment_id": f.fulfillment_id,
            "order_id": f"ORD-{f.order_id:04d}",
            "raw_order_id": f.order_id,
            "customer_name": ord_obj.customer_name if ord_obj and ord_obj.customer_name else (cust_user.full_name if cust_user else "Valued Customer"),
            "customer_phone": cust_user.phone if cust_user else (ord_obj.customer_email if ord_obj else ""),
            "customer_email": ord_obj.customer_email if ord_obj else (cust_user.email if cust_user else ""),
            "delivery_address": ord_obj.delivery_address if ord_obj and ord_obj.delivery_address else (f"{cust.address}, {cust.city}" if cust else "Standard Delivery Address"),
            "vehicle_reg": veh.registration_number if veh else "Assigned Vehicle",
            "vehicle_type": veh.vehicle_type if veh else "Mini Truck",
            "fulfillment_status": f.fulfillment_status or "Dispatched",
            "delivery_status": f.delivery_status or f.fulfillment_status or "Assigned to Driver",
            "expected_delivery_date": f.expected_delivery_date or (f.dispatch_date.strftime("%d %b %Y") if f.dispatch_date else "Scheduled"),
            "dispatched_at": f.dispatched_at.isoformat() if f.dispatched_at else None,
            "delivered_at": f.delivered_at.isoformat() if f.delivered_at else None,
            "items_count": len(ord_obj.items) if ord_obj and ord_obj.items else 1,
            "items_description": ", ".join(items_summary) if items_summary else "Furniture Delivery Items",
            "total_amount": float(ord_obj.total_amount) if ord_obj and ord_obj.total_amount else 0.0,
            "delivery_notes": f.delivery_notes or f.dispatch_note or ""
        })
    return res


@router.post("/my-deliveries/{fulfillment_id}/status")
def update_worker_delivery_status(
    fulfillment_id: int,
    payload: WorkerDeliveryStatusPayload,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    worker_id = current_user.user_id
    if not current_user.is_driver:
        raise HTTPException(status_code=403, detail="Only registered driver workers can update delivery status.")

    f = db.query(models.OrderFulfillment).filter(
        models.OrderFulfillment.fulfillment_id == fulfillment_id,
        models.OrderFulfillment.driver_id == worker_id
    ).first()

    if not f:
        raise HTTPException(status_code=404, detail="Delivery fulfillment record not found or unauthorized.")

    st = payload.status.strip()
    f.delivery_status = st
    if payload.notes:
        f.delivery_notes = payload.notes.strip()

    if st.lower() in ["delivered", "complete", "completed"]:
        f.fulfillment_status = "Delivered"
        f.delivered_at = datetime.utcnow()
        if f.order:
            f.order.order_status = "Delivered"

    db.commit()
    return {"message": f"Delivery status updated to {st}.", "delivery_status": st}

