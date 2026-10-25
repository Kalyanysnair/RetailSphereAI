"""
Validation verification script for:
1. Rejecting names containing numbers / digits
2. Enforcing 10-digit Indian mobile numbers (valid start digits: 6, 7, 8, 9; valid prefixes: +91, 91, 0)
3. Rejecting invalid numbers (e.g. repeated digits, all zeros, <10 digits, starting with 0-5)
"""
import sys
import os

# Set VERCEL env to test serverless configuration
os.environ["VERCEL"] = "1"

from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app import models, schemas
import pytest

client = TestClient(app)

def test_validation_rules():
    print("=== RUNNING VALIDATION RULES TEST SUITE ===")

    # 1. Test Signup with digits in full_name
    bad_names = ["John123", "Alice99", "567", "Ramesh 2", "Bob!@#"]
    for bname in bad_names:
        resp = client.post("/api/auth/signup", json={
            "full_name": bname,
            "email": "test_invalid_name@example.com",
            "phone": "9812345678",
            "password": "Password123!"
        })
        assert resp.status_code in (400, 422), f"Expected 400/422 for bad name '{bname}', got {resp.status_code}: {resp.text}"
        print(f"PASSED: Name '{bname}' correctly rejected with {resp.status_code}")

    # 2. Test Signup with invalid phone numbers
    bad_phones = [
        "12345",              # Too short
        "1234567890",         # Starts with 1 (invalid India mobile)
        "5555555555",         # Starts with 5 (invalid India mobile)
        "0000000000",         # All zeros
        "9999999999",         # All identical digits
        "9876543210123",      # Too long
        "abcdefghij"          # Letters
    ]
    for bphone in bad_phones:
        resp = client.post("/api/auth/signup", json={
            "full_name": "Valid Test Name",
            "email": f"test_invalid_phone_{bphone[:5]}@example.com",
            "phone": bphone,
            "password": "Password123!"
        })
        assert resp.status_code in (400, 422), f"Expected 400/422 for bad phone '{bphone}', got {resp.status_code}: {resp.text}"
        print(f"PASSED: Phone '{bphone}' correctly rejected with {resp.status_code}")

    # 3. Test valid phone formats
    valid_phones = [
        "9876512345",
        "+91 98765 12345",
        "+919876512345",
        "09876512345",
        "8765412345",
        "7654312345",
        "6543212345"
    ]
    for vphone in valid_phones:
        cleaned = schemas.validate_phone_str(vphone)
        assert cleaned.startswith("+91") and len(cleaned) == 13 and cleaned[3] in "6789", f"Cleaned phone invalid: {cleaned}"
        print(f"PASSED: Valid phone '{vphone}' normalized to '{cleaned}'")

    # 4. Test UpdateProfileRequest schema rejection
    try:
        schemas.UpdateProfileRequest(full_name="Admin123")
        assert False, "Should have raised ValueError for Admin123"
    except ValueError as e:
        print(f"PASSED: UpdateProfileRequest correctly rejected 'Admin123': {e}")

    try:
        schemas.UpdateProfileRequest(full_name="Valid Name", phone="12345")
        assert False, "Should have raised ValueError for 12345"
    except ValueError as e:
        print(f"PASSED: UpdateProfileRequest correctly rejected phone '12345': {e}")

    # 5. Cleanup test artifacts from DB
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        users = db.query(models.User).filter(models.User.email.like('test_invalid_%')).all()
        for u in users:
            db.query(models.Customer).filter_by(user_id=u.user_id).delete()
            db.delete(u)
        db.commit()
        db.close()
    except Exception:
        pass

    print("=== ALL VALIDATION TESTS PASSED WITH 100% SUCCESS ===")

if __name__ == "__main__":
    test_validation_rules()
