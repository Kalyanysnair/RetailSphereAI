from datetime import datetime, timedelta
from typing import Optional
import time
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app import models

# In-memory authentication session cache (60s TTL)
_user_auth_cache = {}

# Password Hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    now_ts = time.time()
    if user_id in _user_auth_cache:
        cached_u, cache_time = _user_auth_cache[user_id]
        if now_ts - cache_time < 60:
            try:
                return db.merge(cached_u, load=False)
            except Exception:
                pass

    user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.user_id == user_id).first()
    if user is None:
        raise credentials_exception

    _user_auth_cache[user_id] = (user, now_ts)
    return user


oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[models.User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
        user_id = int(user_id_str)
        now_ts = time.time()
        if user_id in _user_auth_cache:
            cached_u, cache_time = _user_auth_cache[user_id]
            if now_ts - cache_time < 60:
                try:
                    return db.merge(cached_u, load=False)
                except Exception:
                    pass
        user = db.query(models.User).options(joinedload(models.User.role)).filter(models.User.user_id == user_id).first()
        if user:
            _user_auth_cache[user_id] = (user, now_ts)
        return user
    except (JWTError, ValueError):
        return None

