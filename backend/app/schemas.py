from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr

# Signup Request Schema
class UserSignup(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    address: Optional[str] = "Default Address"
    city: Optional[str] = "Default City"
    state: Optional[str] = "Default State"
    pincode: Optional[str] = "000000"

# Login Request Schema
class UserLogin(BaseModel):
    email: str  # Accepts email, full_name, or phone
    password: str

# Forgot Password Schema
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# Reset Password Schema
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str

# Contact Concierge Inquiry Schema
class ContactInquiryRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

# Update Profile Request Schema
class UpdateProfileRequest(BaseModel):
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None



# Customer Details Schema
class CustomerBase(BaseModel):
    customer_id: int
    address: str
    city: str
    state: str
    pincode: str

    class Config:
        from_attributes = True

# User Response Schema
class UserResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    role_name: str
    status: bool
    must_change_password: Optional[bool] = False
    created_at: datetime
    customer: Optional[CustomerBase] = None

    class Config:
        from_attributes = True

# First Login / Password Change Request Schema
class FirstPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# Google Login Request Schema
class GoogleLoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    google_token: Optional[str] = None

# JWT Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
