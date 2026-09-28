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
    review: Optional[str] = Field(None, description="Customer review text and feedback")
    comment: Optional[str] = Field(None, description="Alternative comment field")
    user_email: Optional[str] = None
    customer_name: Optional[str] = None
    customer_id: Optional[int] = None
    order_id: Optional[str] = None

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
    if not user_email or not user_email.strip():
        return {"purchased": False, "already_reviewed": False, "reason": "User not authenticated"}
    
    user = db.query(models.User).filter(models.User.email.ilike(user_email.strip())).first()
    if not user or not user.customer_profile:
        return {"purchased": False, "already_reviewed": False, "reason": "Customer profile not found"}
    
    cust_id = user.customer_profile.customer_id
    
    # Check ready-made orders for this product
    purchased = False
    order_item = db.query(models.ReadymadeOrderItem).join(models.ReadymadeOrder).filter(
        models.ReadymadeOrder.customer_id == cust_id,
        models.ReadymadeOrderItem.product_id == product_id
    ).first()
    
    if order_item:
        purchased = True
    else:
        # Check custom orders: match customer's custom orders by product details (bidirectional substring match)
        product = db.query(models.Product).filter(models.Product.product_id == product_id).first()
        if product:
            customer_custom_orders = db.query(models.CustomOrder).filter(
                models.CustomOrder.customer_id == cust_id
            ).all()

            prod_name_lower = (product.product_name or "").lower()
            prod_mat_lower = (product.material or "").lower()

            for co in customer_custom_orders:
                co_ft_lower = (co.furniture_type or "").strip().lower()
                co_mat_lower = (co.material or "").strip().lower()

                # Bidirectional substring matching for furniture type
                ft_match = bool(co_ft_lower and (co_ft_lower in prod_name_lower or prod_name_lower in co_ft_lower))
                mat_match = bool(co_mat_lower and (co_mat_lower in prod_mat_lower or prod_mat_lower in co_mat_lower))

                if ft_match or (mat_match and any(w in prod_name_lower for w in co_ft_lower.split())):
                    purchased = True
                    break

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
    user = None
    if payload.user_email and payload.user_email.strip():
        user = db.query(models.User).filter(models.User.email.ilike(payload.user_email.strip())).first()
    elif payload.customer_id:
        cust = db.query(models.Customer).filter(models.Customer.customer_id == payload.customer_id).first()
        if cust:
            user = cust.user

    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
    
    customer = user.customer_profile
    if not customer:
        raise HTTPException(status_code=400, detail="Customer profile missing.")
    
    cust_id = customer.customer_id
    
    # Verify purchase in database for ready-made orders
    has_order = db.query(models.ReadymadeOrder).join(models.ReadymadeOrderItem).filter(
        models.ReadymadeOrder.customer_id == cust_id,
        models.ReadymadeOrderItem.product_id == payload.product_id
    ).first()
    
    if not has_order:
        product = db.query(models.Product).filter(models.Product.product_id == payload.product_id).first()
        has_custom = False
        if product:
            customer_custom_orders = db.query(models.CustomOrder).filter(
                models.CustomOrder.customer_id == cust_id
            ).all()

            prod_name_lower = (product.product_name or "").lower()
            prod_mat_lower = (product.material or "").lower()

            for co in customer_custom_orders:
                co_ft_lower = (co.furniture_type or "").strip().lower()
                co_mat_lower = (co.material or "").strip().lower()

                ft_match = bool(co_ft_lower and (co_ft_lower in prod_name_lower or prod_name_lower in co_ft_lower))
                mat_match = bool(co_mat_lower and (co_mat_lower in prod_mat_lower or prod_mat_lower in co_mat_lower))

                if ft_match or (mat_match and any(w in prod_name_lower for w in co_ft_lower.split())):
                    has_custom = True
                    break
        
        if not has_order and not has_custom:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Reviews and feedback can only be submitted for items you have purchased."
            )
            
    # Review text extraction
    review_content = (payload.review or payload.comment or "Verified Purchase - Great Quality").strip()

    # Check if review already exists
    existing = db.query(models.Review).filter(
        models.Review.customer_id == cust_id,
        models.Review.product_id == payload.product_id
    ).first()
    
    if existing:
        existing.rating = payload.rating
        existing.review = review_content
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
        review=review_content,
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

