from datetime import date
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app import models

STAFF_ROLES = ["Production Staff", "Admin", "System Admin", "Retail Staff"]

def require_staff_user(current_user: models.User, allowed_roles: Optional[List[str]] = None) -> models.User:
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to assign workers."
        )
    role_name = current_user.role.role_name if current_user.role else ""
    roles_check = allowed_roles or STAFF_ROLES
    if role_name not in roles_check:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Role '{role_name}' is not authorized to perform worker assignments."
        )
    return current_user

def is_worker_skill_compatible(worker_spec: Optional[str], required_skill_or_dept: Optional[str]) -> bool:
    if not required_skill_or_dept or required_skill_or_dept.strip().lower() in ["all", "general", "production", "craft specialist"]:
        return True
    spec = (worker_spec or "Woodwork & Carpentry").strip().lower()
    target = required_skill_or_dept.strip().lower()

    if target in spec or spec in target:
        return True
    if any(k in target for k in ["wood", "carpent", "cut", "shape", "frame", "timber", "join"]):
        return any(k in spec for k in ["wood", "carpent", "join"])
    if any(k in target for k in ["upholster", "fabric", "cushion", "sew", "stitch"]):
        return any(k in spec for k in ["upholster", "fabric"])
    if any(k in target for k in ["assembl", "qa", "finish", "polish", "sand", "fitting", "hardware"]):
        return any(k in spec for k in ["assembl", "qa", "finish", "wood"])
    return False

def validate_worker_eligibility(
    db: Session,
    worker_id: int,
    required_skill_or_dept: Optional[str] = None,
    required_skill: Optional[str] = None
) -> models.User:
    target_skill = required_skill_or_dept or required_skill
    worker = db.query(models.User).filter(models.User.user_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Worker #{worker_id} not found.")

    if not worker.status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Worker '{worker.full_name}' is inactive/disabled and cannot be assigned tasks."
        )

    w_role = worker.role.role_name if worker.role else ""
    if w_role not in ["Worker", "Artisan Worker"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{worker.full_name}' has role '{w_role}' and is not a registered workshop artisan worker."
        )

    # Skill validation against the three specialisations
    if target_skill:
        if not is_worker_skill_compatible(worker.specialization, target_skill):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Worker '{worker.full_name}' specialization '{worker.specialization or 'None'}' does not match required skill '{target_skill}'."
            )

    # Approved leave check
    today = date.today()
    active_leave = db.query(models.WorkerLeave).filter(
        models.WorkerLeave.worker_id == worker.user_id,
        models.WorkerLeave.status == "Approved",
        models.WorkerLeave.start_date <= today,
        models.WorkerLeave.end_date >= today
    ).first()
    if active_leave:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Worker '{worker.full_name}' is currently on approved {active_leave.leave_type} until {active_leave.end_date}."
        )

    avail_row = db.query(models.WorkerAvailability).filter(models.WorkerAvailability.worker_id == worker.user_id).first()
    if avail_row and (avail_row.status or "").upper() in ["ON_LEAVE", "LEAVE", "ON LEAVE"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Worker '{worker.full_name}' is currently marked on leave in worker availability records."
        )

    # Workload limit check (hard limit)
    stage_load = db.query(models.ProductionStage).filter(
        models.ProductionStage.assigned_worker_id == worker.user_id,
        models.ProductionStage.status.in_(["ASSIGNED", "IN_PROGRESS", "PAUSED"])
    ).count()
    asgn_load = db.query(models.WorkerAssignment).filter(
        models.WorkerAssignment.worker_id == worker.user_id,
        models.WorkerAssignment.task_status.contains("Assigned") | models.WorkerAssignment.task_status.contains("In Progress")
    ).count()
    if (stage_load + asgn_load) >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Worker '{worker.full_name}' has reached maximum concurrent workload capacity ({stage_load + asgn_load} active tasks)."
        )

    return worker

def validate_custom_order_assignment_prerequisites(*args, **kwargs):
    order = kwargs.get("order") or (args[1] if len(args) > 1 else args[0])
    rev_st = (order.review_status or "").upper().strip()
    ord_st = (order.order_status or "").upper().strip()
    is_approved = (rev_st in ["APPROVED", "APPROVED_BY_RETAIL"]) or (ord_st in ["APPROVED", "APPROVED_BY_RETAIL", "IN PRODUCTION", "QC_PENDING", "COMPLETED"])
    if not is_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign worker: Custom Order #{order.custom_order_id} has not been approved by Retail Staff (review status: {order.review_status or 'NEW'})."
        )

    pay_st = (order.payment_status or "").upper().strip()
    is_paid = (pay_st in ["PAID", "ADVANCE_PAID"]) or (ord_st in ["PAID", "IN PRODUCTION", "QC_PENDING", "COMPLETED"])
    if not is_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign worker: Custom Order #{order.custom_order_id} advance payment is pending."
        )

def validate_fabrication_assignment_prerequisites(*args, **kwargs):
    fab = kwargs.get("fab") or (args[1] if len(args) > 1 else args[0])
    fab_st = (fab.status or "").upper().strip()
    pay_st = (fab.payment_status or "").upper().strip()
    is_approved_and_paid = (fab_st in ["APPROVED", "APPROVED_BY_RETAIL", "PAID", "IN_PRODUCTION", "QC_PENDING", "COMPLETED"]) or (pay_st == "PAID")
    if not is_approved_and_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign worker: Fabrication Job #{fab.fabrication_id} must be approved and paid before assignment (current status: {fab.status})."
        )

def validate_service_assignment_prerequisites(*args, **kwargs):
    srv = kwargs.get("srv") or (args[1] if len(args) > 1 else args[0])
    srv_st = (srv.status or "").upper().strip()
    pay_st = (srv.payment_status or "").upper().strip()
    is_ready = (srv_st in ["APPROVED", "PAID", "WORKER_ASSIGNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"]) or (pay_st == "PAID")
    if not is_ready:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign technician: On-site Service Request #{srv.service_id} must be approved and paid before assignment (current status: {srv.status})."
        )

def validate_fabrication_material_prerequisite(db: Session, fab_obj: models.FabricationRequest):
    """
    Validates that customer-owned material has been received at the workshop hub before cutting/fabrication starts.
    Applies both to doorstep carrier pickup and customer direct drop-off.
    """
    if not fab_obj:
        return

    arr_mode = getattr(fab_obj, "material_arrival_mode", "") or "CUSTOMER_BRINGS"
    mat_src = getattr(fab_obj, "material_source", "") or ""
    needs_pk = arr_mode in ["DOORSTEP_PICKUP", "RETAILSPHERE_PICKUP"] or ("Customer" in mat_src and arr_mode != "CUSTOMER_BRINGS")
    if needs_pk:
        ful = db.query(models.OrderFulfillment).filter(
            models.OrderFulfillment.fabrication_id == fab_obj.fabrication_id,
            models.OrderFulfillment.job_type == "FABRICATION_PICKUP"
        ).first()
        if not ful or ful.delivery_status not in ["Delivered", "COMPLETED", "Received", "RECEIVED_AT_WORKSHOP"]:
            c_title = ful.carrier if (ful and ful.carrier) else "an assigned Carrier Partner"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot start fabrication stage yet. Customer-owned material pickup by {c_title} is still pending receipt at workshop hub."
            )

    if fab_obj.customer_material_id:
        c_mat = db.query(models.CustomerMaterial).filter(models.CustomerMaterial.material_id == fab_obj.customer_material_id).first()
        if c_mat and c_mat.status in ["REGISTERED", "SUBMITTED"] and fab_obj.status not in ["MATERIAL_RECEIVED", "IN_PRODUCTION"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot start fabrication stage yet. Customer-owned material has not been received at workshop hub."
            )

