from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app import models

router = APIRouter(prefix="/api/reviews", tags=["Product Reviews"])

class ReviewCreate(BaseModel):
    product_id: int
    rating: int = Field(..., ge=1, le=5, description="Star rating from 1 to 5")
    review: str = Field(..., min_length=3, description="Customer review text and feedback")
    user_email: Optional[str] = None
    customer_name: Optional[str] = None

class ReviewResponse(BaseModel):
    review_id: int
    product_id: int
    customer_name: str
    rating: int
    review: str
    review_date: str
    verified_purchase: bool = True

@router.get("/product/{product_id}", response_model=List[ReviewResponse])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    """Fetch all verified customer reviews for a specific product."""
    reviews = db.query(models.Review).filter(models.Review.product_id == product_id).order_by(models.Review.review_date.desc()).all()
    
    results = []
    for r in reviews:
        c_name = "Verified Customer"
        if r.customer and r.customer.user:
            c_name = r.customer.user.full_name
        results.append(ReviewResponse(
            review_id=r.review_id,
            product_id=r.product_id,
            customer_name=c_name,
            rating=r.rating,
            review=r.review or "",
            review_date=r.review_date.strftime("%Y-%m-%d %H:%M"),
            verified_purchase=True
        ))
    return results

@router.get("/check-purchased/{product_id}")
def check_product_purchased(product_id: int, user_email: Optional[str] = None, db: Session = Depends(get_db)):
    """Check if a customer has purchased a product and whether they already reviewed it."""
    if not user_email:
        return {"purchased": False, "already_reviewed": False, "reason": "User not authenticated"}
    
    user = db.query(models.User).filter(models.User.email == user_email).first()
    if not user or not user.customer_profile:
        return {"purchased": False, "already_reviewed": False, "reason": "Customer profile not found"}
    
    cust_id = user.customer_profile.customer_id
    
    # Check orders for this product
    purchased = False
    order_item = db.query(models.OrderItem).join(models.ReadymadeOrder).filter(
        models.ReadymadeOrder.customer_id == cust_id,
        models.OrderItem.product_id == product_id
    ).first()
    
    if order_item:
        purchased = True
    else:
        # Check custom orders
        custom_order = db.query(models.CustomOrder).filter(
            models.CustomOrder.customer_id == cust_id,
            models.CustomOrder.product_id == product_id
        ).first()
        if custom_order:
            purchased = True

    # Check if already reviewed
    existing_review = db.query(models.Review).filter(
        models.Review.customer_id == cust_id,
        models.Review.product_id == product_id
    ).first()
    
    return {
        "purchased": purchased,
        "already_reviewed": existing_review is not None,
        "review_id": existing_review.review_id if existing_review else None
    }

@router.post("", status_code=status.HTTP_201_CREATED, response_model=ReviewResponse)
def create_product_review(payload: ReviewCreate, db: Session = Depends(get_db)):
    """Submit a rating and review feedback. ONLY allowed if the customer purchased the item."""
    if not payload.user_email:
        raise HTTPException(status_code=400, detail="User email is required to verify purchase.")
    
    user = db.query(models.User).filter(models.User.email == payload.user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
    
    customer = user.customer_profile
    if not customer:
        raise HTTPException(status_code=400, detail="Customer profile missing.")
    
    cust_id = customer.customer_id
    
    # Verify purchase in database
    has_order = db.query(models.OrderItem).join(models.ReadymadeOrder).filter(
        models.ReadymadeOrder.customer_id == cust_id,
        models.OrderItem.product_id == payload.product_id
    ).first()
    
    if not has_order:
        has_custom = db.query(models.CustomOrder).filter(
            models.CustomOrder.customer_id == cust_id,
            models.CustomOrder.product_id == payload.product_id
        ).first()
        if not has_custom:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Reviews and feedback can only be submitted for items you have purchased."
            )
            
    # Check if review already exists
    existing = db.query(models.Review).filter(
        models.Review.customer_id == cust_id,
        models.Review.product_id == payload.product_id
    ).first()
    
    if existing:
        existing.rating = payload.rating
        existing.review = payload.review
        existing.review_date = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return ReviewResponse(
            review_id=existing.review_id,
            product_id=existing.product_id,
            customer_name=user.full_name,
            rating=existing.rating,
            review=existing.review or "",
            review_date=existing.review_date.strftime("%Y-%m-%d %H:%M"),
            verified_purchase=True
        )
    
    new_review = models.Review(
        customer_id=cust_id,
        product_id=payload.product_id,
        rating=payload.rating,
        review=payload.review,
        review_date=datetime.utcnow()
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    
    return ReviewResponse(
        review_id=new_review.review_id,
        product_id=new_review.product_id,
        customer_name=user.full_name,
        rating=new_review.rating,
        review=new_review.review or "",
        review_date=new_review.review_date.strftime("%Y-%m-%d %H:%M"),
        verified_purchase=True
    )
