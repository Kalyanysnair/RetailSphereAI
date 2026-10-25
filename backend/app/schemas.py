import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


def validate_name_str(v: str) -> str:
    if not v or not v.strip():
        raise ValueError('Full Name is required and cannot be empty.')
    val = v.strip()
    if len(val) < 2:
        raise ValueError('Full Name must be at least 2 characters long.')
    if re.search(r'\d', val):
        raise ValueError('Numbers are not permitted in names. Please use letters only.')
    if not re.match(r"^[a-zA-Z\s.'-]+$", val):
        raise ValueError('Name contains invalid characters. Use letters, spaces, dots, hyphens, and apostrophes only.')
    if len(re.sub(r'[^a-zA-Z]', '', val)) < 2:
        raise ValueError('Name must contain at least 2 letters.')
    return val


def validate_phone_str(v: Optional[str], required: bool = True) -> Optional[str]:
    if not v or not v.strip():
        if required:
            raise ValueError('Phone number is required.')
        return None
    clean = re.sub(r'[\s\-()]', '', v.strip())
    digits = clean.replace('+', '')
    if not re.match(r'^\+?[0-9]{10,15}$', clean):
        raise ValueError('Please enter a valid 10 to 15 digit phone number.')
    if re.match(r'^(\d)\1+$', digits):
        raise ValueError('Invalid phone number: repeating identical digits (e.g. 1111111111) are not allowed.')
    if digits in ['1234567890', '0123456789', '9876543210', '01234567890']:
        raise ValueError('Invalid phone number: sequential dummy numbers are not allowed.')
    if len(digits) == 10:
        if not re.match(r'^[6-9]\d{9}$', digits):
            raise ValueError('10-digit mobile numbers must start with 6, 7, 8, or 9.')
        return f"+91{digits}"
    elif len(digits) == 12 and digits.startswith('91'):
        ten = digits[2:]
        if not re.match(r'^[6-9]\d{9}$', ten):
            raise ValueError('10-digit mobile numbers must start with 6, 7, 8, or 9.')
        return f"+91{ten}"
    elif len(digits) == 11 and digits.startswith('0'):
        ten = digits[1:]
        if not re.match(r'^[6-9]\d{9}$', ten):
            raise ValueError('10-digit mobile numbers must start with 6, 7, 8, or 9.')
        return f"+91{ten}"
    else:
        raise ValueError('Please enter a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210).')


def validate_pincode_str(v: Optional[str]) -> Optional[str]:
    if not v or not v.strip():
        return ""
    val = v.strip()
    if not re.match(r'^\d{6}$', val):
        raise ValueError('Pincode must be a valid 6-digit postal code (e.g. 686001).')
    return val


# Signup Request Schema
class UserSignup(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    pincode: Optional[str] = ""

    @field_validator('full_name')
    @classmethod
    def check_full_name(cls, v: str) -> str:
        return validate_name_str(v)

    @field_validator('phone')
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone_str(v, required=True) or ""

    @field_validator('pincode')
    @classmethod
    def check_pincode(cls, v: Optional[str]) -> Optional[str]:
        return validate_pincode_str(v)


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

    @field_validator('name')
    @classmethod
    def check_contact_name(cls, v: str) -> str:
        return validate_name_str(v)


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

    @field_validator('full_name')
    @classmethod
    def check_full_name(cls, v: str) -> str:
        return validate_name_str(v)

    @field_validator('phone')
    @classmethod
    def check_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_str(v, required=False)

    @field_validator('pincode')
    @classmethod
    def check_pincode(cls, v: Optional[str]) -> Optional[str]:
        return validate_pincode_str(v)



# Customer Details Schema
class CustomerBase(BaseModel):
    customer_id: int
    address: Optional[str] = ""
    city: Optional[str] = ""
    state: Optional[str] = ""
    pincode: Optional[str] = ""

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
    is_driver: Optional[bool] = False
    specialization: Optional[str] = None
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


# Password Change Request Schema
class PasswordChangeRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str


# JWT Token Schema
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class CarrierPartnerCreate(BaseModel):
    carrier_name: str
    contact_phone: str
    contact_email: Optional[str] = None
    status: Optional[bool] = True

    @field_validator('carrier_name')
    @classmethod
    def check_carrier_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Carrier name is required.')
        val = v.strip()
        if len(val) < 2:
            raise ValueError('Carrier name must be at least 2 characters long.')
        return val

    @field_validator('contact_phone')
    @classmethod
    def check_contact_phone(cls, v: str) -> str:
        return validate_phone_str(v, required=True) or ""


class CarrierPartnerUpdate(BaseModel):
    carrier_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    status: Optional[bool] = None

    @field_validator('carrier_name')
    @classmethod
    def check_carrier_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        val = v.strip()
        if len(val) < 2:
            raise ValueError('Carrier name must be at least 2 characters long.')
        return val

    @field_validator('contact_phone')
    @classmethod
    def check_contact_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_str(v, required=False)
