import sys
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings
from app.core.database import get_db
from app.models.project import Profile

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)

ROLE_HIERARCHY = {
    "monitoring_officer": 1,
    "analyst": 2,
    "executive": 2,
    "admin": 3,
}


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT using the app SECRET_KEY."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Profile:
    """
    FastAPI dependency — validates JWT against SECRET_KEY or SUPABASE_JWT_SECRET,
    and returns the authenticated user Profile.
    Supports demo user token as well as Supabase authenticated sessions.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = None

    # Try decoding with app secret_key first, then fallback to supabase_jwt_secret
    secrets_to_try = [s for s in [settings.secret_key, settings.supabase_jwt_secret] if s]
    for secret in secrets_to_try:
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            break
        except JWTError:
            continue

    # Fallback to Supabase auth client if token verification via secret failed (e.g. ES256 tokens)
    if payload is None and settings.supabase_url and settings.supabase_anon_key:
        try:
            from supabase import create_client
            supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
            response = supabase.auth.get_user(token)
            if response and response.user:
                u = response.user
                user_meta = getattr(u, "user_metadata", {}) or {}
                app_meta = getattr(u, "app_metadata", {}) or {}
                payload = {
                    "sub": str(u.id),
                    "email": u.email or "",
                    "role": app_meta.get("role") or user_meta.get("role", "admin"),
                    "full_name": user_meta.get("full_name") or "Administrator",
                }
        except Exception:
            pass

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = str(payload.get("sub", ""))
    email: str = payload.get("email") or (payload.get("user_metadata") or {}).get("email", "")
    role: str = (
        payload.get("role")
        or (payload.get("app_metadata") or {}).get("role")
        or (payload.get("user_metadata") or {}).get("role", "admin")
    )
    full_name: Optional[str] = payload.get("full_name") or (payload.get("user_metadata") or {}).get("full_name")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Demo user — return synthetic Profile without hitting DB
    if user_id == "demo-user":
        return Profile(
            id=user_id,
            email=email or "demo@prism.gov.in",
            role=role or "admin",
            full_name=full_name or "Demo Administrator",
        )

    # Real user — look up profile in DB if user_id is a valid UUID
    try:
        parsed_uuid = uuid.UUID(str(user_id))
        profile = db.query(Profile).filter(Profile.id == parsed_uuid).first()
        if profile is not None:
            return profile
    except (ValueError, TypeError, Exception):
        pass

    # If user exists in auth but not yet seeded in profiles table, return synthetic profile
    return Profile(
        id=user_id,
        email=email,
        role=role,
        full_name=full_name or "User",
    )


def require_role(minimum_role: str):
    """
    Role check dependency — verifies the user meets or exceeds the required permission level.
    """
    def role_checker(current_user: Profile = Depends(get_current_user)) -> Profile:
        user_level = ROLE_HIERARCHY.get(current_user.role, 0)
        required_level = ROLE_HIERARCHY.get(minimum_role, 99)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required: '{minimum_role}', yours: '{current_user.role}'",
            )
        return current_user

    return role_checker
