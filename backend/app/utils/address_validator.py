import re
from typing import Optional, Tuple
from app import models

# Disallowed placeholder values that must not be treated as valid delivery addresses
INVALID_PLACEHOLDERS = {
    "default address",
    "default city",
    "default state",
    "not provided",
    "none",
    "n/a",
    "na",
    "test",
    "sample",
    "000000",
    "123456",
}

def is_valid_customer_address(customer: Optional[models.Customer], user: Optional[models.User] = None) -> Tuple[bool, Optional[str]]:
    r"""
    Validates whether an authenticated customer has saved a complete and genuine
    delivery address in their PostgreSQL profile.
    
    A valid delivery address must contain:
    - Recipient full name (minimum 2 letters)
    - Valid contact phone number (at least 10 digits)
    - Detailed building/street/locality address (minimum 5 characters, not placeholder)
    - City / District (minimum 2 characters, not placeholder)
    - State (not placeholder)
    - Valid 6-digit Indian PIN code (regex /^\d{6}$/ and not '000000')
    """
    if not customer:
        return False, "Customer profile not found. Please log in and provide your delivery address."

    # Validate detailed street address
    addr = (customer.address or "").strip()
    if not addr or len(addr) < 5 or addr.lower() in INVALID_PLACEHOLDERS:
        return False, "Please provide a complete street address, house/building name, or locality."

    # Validate city/district
    city = (customer.city or "").strip()
    if not city or len(city) < 2 or city.lower() in INVALID_PLACEHOLDERS:
        return False, "Please provide a valid city or district for delivery."

    # Validate state
    state = (customer.state or "").strip()
    if not state or len(state) < 2 or state.lower() in INVALID_PLACEHOLDERS:
        return False, "Please provide a valid state."

    # Validate 6-digit PIN code
    pincode = (customer.pincode or "").strip().replace(" ", "")
    if not pincode or not re.match(r"^\d{6}$", pincode) or pincode in INVALID_PLACEHOLDERS:
        return False, "Please provide a valid 6-digit postal PIN code."

    # Validate user recipient details if user object is available
    if user or (customer and customer.user):
        u = user or customer.user
        full_name = (u.full_name or "").strip()
        if not full_name or len(full_name) < 2:
            return False, "Please provide the recipient full name in your profile."

        phone = (u.phone or "").strip()
        clean_phone = re.sub(r"\D", "", phone)
        if not clean_phone or len(clean_phone) < 10:
            return False, "Please provide a valid 10-digit contact phone number in your profile."

    return True, None


def get_formatted_customer_address(customer: models.Customer, user: Optional[models.User] = None) -> str:
    """Returns a clean, unified single-line delivery address string."""
    parts = []
    if user and user.full_name:
        parts.append(user.full_name.strip())
    if customer.address:
        parts.append(customer.address.strip())
    if customer.city:
        parts.append(customer.city.strip())
    if customer.state:
        parts.append(customer.state.strip())
    if customer.pincode:
        parts.append(f"PIN: {customer.pincode.strip()}")
    if user and user.phone:
        parts.append(f"Phone: {user.phone.strip()}")
    return ", ".join(parts)
