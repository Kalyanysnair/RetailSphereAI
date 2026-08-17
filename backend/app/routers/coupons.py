from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app import models, auth
from app.email_utils import send_coupon_discount_email

router = APIRouter(prefix="/api/coupons", tags=["Coupon Management"])


class CreateCouponRequest(BaseModel):
    code: str
    coupon_type: str = "percentage_notification"  # 'percentage_notification', 'first_n_customers', 'flat_amount'
    discount_percent: int = 0
    flat_discount_amount: Optional[float] = 0.0
    description: str = ""
    customer_limit: Optional[int] = None
    target_user_email: Optional[str] = None


class ValidateCouponRequest(BaseModel):
    code: str


class RedeemCouponRequest(BaseModel):
    code: str
    order_id: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_coupon(
    payload: CreateCouponRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    clean_code = payload.code.strip().upper()
    if not clean_code:
        raise HTTPException(status_code=400, detail="Coupon code cannot be empty.")

    target_email = payload.target_user_email.strip() if payload.target_user_email else None

    # Check if coupon already exists in DB
    existing = db.query(models.Coupon).filter(models.Coupon.code == clean_code).first()

    clean_type = payload.coupon_type.strip().lower()
    if clean_type == 'first_n_customers':
        target_email = None

    if clean_type == 'flat_amount':
        flat_val = payload.flat_discount_amount if payload.flat_discount_amount and payload.flat_discount_amount > 0 else 0.0
        percent_val = 0
    else:
        flat_val = 0.0
        percent_val = payload.discount_percent

    if existing:
        existing.coupon_type = clean_type
        existing.discount_percent = percent_val
        existing.flat_discount_amount = flat_val
        existing.description = payload.description.strip() or (f"₹{flat_val} OFF Flat Discount" if clean_type == 'flat_amount' else f"{percent_val}% Off Discount")
        existing.customer_limit = payload.customer_limit
        existing.current_redemptions = 0
        existing.target_user_email = target_email
        existing.status = "Active"
        coupon = existing
    else:
        coupon = models.Coupon(
            code=clean_code,
            coupon_type=clean_type,
            discount_percent=percent_val,
            flat_discount_amount=flat_val,
            description=payload.description.strip() or (f"₹{flat_val} OFF Flat Discount" if clean_type == 'flat_amount' else f"{percent_val}% Off Discount"),
            customer_limit=payload.customer_limit,
            current_redemptions=0,
            target_user_email=target_email,
            status="Active"
        )
        db.add(coupon)

    db.commit()
    db.refresh(coupon)

    # EXPLICIT TYPE CHECK: Email and Notification dispatch MUST fire ONLY for percentage_notification and flat_amount, NEVER for first_n_customers!
    if clean_type != "first_n_customers" and clean_type in ["percentage_notification", "flat_amount"] and target_email:
        background_tasks.add_task(
            send_coupon_discount_email,
            to_email=target_email,
            coupon_code=clean_code,
            discount_percent=payload.discount_percent if payload.discount_percent > 0 else 10
        )

        # Dispatch in-app DB notification if user exists
        target_user = db.query(models.User).filter(models.User.email.ilike(target_email)).first()
        if target_user:
            notif = models.Notification(
                user_id=target_user.user_id,
                title="🎉 Exclusive Discount Coupon Issued!",
                message=f"You received an exclusive coupon {clean_code}! Use code at checkout.",
                is_read=False
            )
            db.add(notif)
            db.commit()

    return {
        "message": f"Coupon {clean_code} created successfully.",
        "coupon": {
            "id": str(coupon.coupon_id),
            "code": coupon.code,
            "type": coupon.coupon_type,
            "discountPercent": coupon.discount_percent,
            "flatDiscountAmount": float(coupon.flat_discount_amount or 0),
            "description": coupon.description,
            "customerLimit": coupon.customer_limit,
            "currentRedemptions": coupon.current_redemptions,
            "targetUserEmail": coupon.target_user_email or "",
            "status": coupon.status,
            "createdDate": coupon.created_at.strftime("%Y-%m-%d")
        }
    }


@router.get("", status_code=status.HTTP_200_OK)
def list_coupons(db: Session = Depends(get_db)):
    coupons = db.query(models.Coupon).order_by(models.Coupon.coupon_id.desc()).all()
    redemptions = db.query(models.CouponRedemption).order_by(models.CouponRedemption.redemption_id.desc()).all()

    coupons_list = [
        {
            "id": str(c.coupon_id),
            "code": c.code,
            "type": c.coupon_type,
            "discountPercent": c.discount_percent,
            "flatDiscountAmount": float(c.flat_discount_amount or 0),
            "description": c.description,
            "customerLimit": c.customer_limit,
            "currentRedemptions": c.current_redemptions,
            "targetUserEmail": c.target_user_email or "",
            "status": c.status,
            "createdDate": c.created_at.strftime("%Y-%m-%d")
        }
        for c in coupons
    ]

    allotments_list = []
    seen_redemptions = set()

    for r in redemptions:
        seen_redemptions.add(f"{r.coupon_id}_{r.user_email.strip().lower()}")
        allotments_list.append({
            "id": str(r.redemption_id),
            "couponCode": r.coupon.code if r.coupon else "PROMO",
            "discountPercent": r.coupon.discount_percent if r.coupon else 15,
            "targetUserEmail": r.user_email,
            "allottedDate": r.redeemed_at.strftime("%d %b %Y, %I:%M %p"),
            "used": True,
            "usedDate": r.redeemed_at.strftime("%d %b %Y, %I:%M %p")
        })

    for c in coupons:
        if c.target_user_email and c.target_user_email.strip():
            key = f"{c.coupon_id}_{c.target_user_email.strip().lower()}"
            if key not in seen_redemptions:
                allotments_list.append({
                    "id": f"target-{c.coupon_id}",
                    "couponCode": c.code,
                    "discountPercent": c.discount_percent,
                    "targetUserEmail": c.target_user_email,
                    "allottedDate": c.created_at.strftime("%d %b %Y, %I:%M %p"),
                    "used": c.current_redemptions > 0,
                    "usedDate": c.created_at.strftime("%d %b %Y, %I:%M %p") if c.current_redemptions > 0 else None
                })

    return {"coupons": coupons_list, "allotments": allotments_list}


@router.delete("/{coupon_id}", status_code=status.HTTP_200_OK)
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    coupon = db.query(models.Coupon).filter(models.Coupon.coupon_id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found.")

    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted successfully."}


@router.post("/{coupon_id}/regenerate", status_code=status.HTTP_200_OK)
def regenerate_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    coupon = db.query(models.Coupon).filter(models.Coupon.coupon_id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found.")

    coupon.status = "Active"
    coupon.current_redemptions = 0
    db.commit()
    db.refresh(coupon)
    return {"message": f"Coupon {coupon.code} reactivated.", "status": coupon.status}


@router.get("/my-notifications", status_code=status.HTTP_200_OK)
def get_customer_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    user_email_clean = current_user.email.strip().lower()

    # Active targeted coupons for this user (EXPLICITLY EXCLUDING first_n_customers coupons)
    active_coupons = db.query(models.Coupon).filter(
        models.Coupon.status == "Active",
        models.Coupon.coupon_type != "first_n_customers",
        or_(
            models.Coupon.target_user_email.is_(None),
            models.Coupon.target_user_email == "",
            models.Coupon.target_user_email.ilike(user_email_clean)
        )
    ).all()

    notifications = []
    for c in active_coupons:
        # Check if already redeemed
        redeemed = db.query(models.CouponRedemption).filter(
            models.CouponRedemption.coupon_id == c.coupon_id,
            models.CouponRedemption.user_id == current_user.user_id
        ).first()

        if not redeemed:
            discount_label = f"₹{c.flat_discount_amount}" if c.flat_discount_amount and c.flat_discount_amount > 0 else f"{c.discount_percent}%"
            notifications.append({
                "id": f"cn-db-{c.coupon_id}",
                "targetUserEmail": c.target_user_email or "",
                "couponCode": c.code,
                "discountPercent": c.discount_percent,
                "message": f"🎉 Exclusive {discount_label} Discount Coupon Issued! Use code {c.code} at checkout.",
                "createdDate": c.created_at.strftime("%d %b %Y"),
                "read": False
            })

    return notifications


@router.post("/validate", status_code=status.HTTP_200_OK)
def validate_coupon(
    payload: ValidateCouponRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    clean_code = payload.code.strip().upper()
    if not clean_code:
        raise HTTPException(status_code=400, detail="Please enter a promo code.")

    coupon = db.query(models.Coupon).filter(
        models.Coupon.code == clean_code,
        models.Coupon.status == "Active"
    ).first()

    if not coupon:
        raise HTTPException(status_code=400, detail=f'Invalid or expired coupon code "{payload.code}".')

    user_email_clean = current_user.email.strip().lower()

    # Requirement 2: Strict JWT authenticated user email check
    if coupon.target_user_email and coupon.target_user_email.strip():
        target_clean = coupon.target_user_email.strip().lower()
        if target_clean != user_email_clean:
            raise HTTPException(status_code=400, detail=f'This coupon code "{clean_code}" is restricted to account "{coupon.target_user_email}".')

    # Requirement 1 & 3: Check single redemption in DB
    existing_redemption = db.query(models.CouponRedemption).filter(
        models.CouponRedemption.coupon_id == coupon.coupon_id,
        models.CouponRedemption.user_id == current_user.user_id
    ).first()

    if existing_redemption:
        raise HTTPException(status_code=400, detail=f'You have already redeemed coupon "{clean_code}". Single-use limit reached.')

    # Check redemption limit for first_n_customers
    if coupon.customer_limit and coupon.customer_limit > 0 and coupon.current_redemptions >= coupon.customer_limit:
        raise HTTPException(status_code=400, detail=f'Coupon limit reached! Code "{clean_code}" has reached maximum redemptions.')

    discount_label = f"₹{coupon.flat_discount_amount}" if coupon.flat_discount_amount and coupon.flat_discount_amount > 0 else f"{coupon.discount_percent}%"

    return {
        "valid": True,
        "coupon": {
            "id": str(coupon.coupon_id),
            "code": coupon.code,
            "type": coupon.coupon_type,
            "discountPercent": coupon.discount_percent,
            "flatDiscountAmount": float(coupon.flat_discount_amount or 0),
            "description": coupon.description,
            "customerLimit": coupon.customer_limit,
            "currentRedemptions": coupon.current_redemptions
        },
        "message": f"{coupon.description} ({discount_label} Off) Applied!"
    }


@router.post("/redeem", status_code=status.HTTP_200_OK)
def redeem_coupon(
    payload: RedeemCouponRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    clean_code = payload.code.strip().upper()

    coupon = db.query(models.Coupon).filter(
        models.Coupon.code == clean_code,
        models.Coupon.status == "Active"
    ).first()

    if not coupon:
        raise HTTPException(status_code=400, detail=f'Coupon code "{clean_code}" is invalid or expired.')

    user_email_clean = current_user.email.strip().lower()

    if coupon.target_user_email and coupon.target_user_email.strip():
        target_clean = coupon.target_user_email.strip().lower()
        if target_clean != user_email_clean:
            raise HTTPException(status_code=400, detail=f'Coupon code "{clean_code}" is restricted to account "{coupon.target_user_email}".')

    # Check existing redemption
    already = db.query(models.CouponRedemption).filter(
        models.CouponRedemption.coupon_id == coupon.coupon_id,
        models.CouponRedemption.user_id == current_user.user_id
    ).first()

    if already:
        return {"message": "Coupon was already marked as redeemed for this user.", "already_redeemed": True}

    # Requirement 1: Atomic UPDATE with WHERE guard to prevent race conditions
    filter_conds = [
        models.Coupon.coupon_id == coupon.coupon_id,
        models.Coupon.status == "Active"
    ]
    if coupon.customer_limit and coupon.customer_limit > 0:
        filter_conds.append(models.Coupon.current_redemptions < coupon.customer_limit)

    updated_count = db.query(models.Coupon).filter(and_(*filter_conds)).update(
        {models.Coupon.current_redemptions: models.Coupon.current_redemptions + 1},
        synchronize_session=False
    )

    if updated_count == 0:
        raise HTTPException(status_code=400, detail="Coupon limit reached or coupon inactive.")

    # Refresh coupon state
    db.refresh(coupon)
    if coupon.customer_limit and coupon.customer_limit > 0 and coupon.current_redemptions >= coupon.customer_limit:
        coupon.status = "Inactive"
    elif not coupon.customer_limit and coupon.target_user_email:
        coupon.status = "Inactive"

    # Save redemption record
    redemption = models.CouponRedemption(
        coupon_id=coupon.coupon_id,
        user_id=current_user.user_id,
        user_email=current_user.email,
        order_id=payload.order_id
    )
    db.add(redemption)
    db.commit()

    return {"message": f"Coupon {clean_code} successfully redeemed.", "success": True}
