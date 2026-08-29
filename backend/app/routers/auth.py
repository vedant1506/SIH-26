import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from pydantic import BaseModel, EmailStr
from app.core.config import get_settings
from app.core.security import get_current_user
from app.models.project import Profile

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

DEMO_EMAIL = os.getenv("DEMO_EMAIL", "demo@prism.gov.in")
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "PRISM2026Demo")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: str
    full_name: str | None = None


class ProfileOut(BaseModel):
    user_id: str
    email: str
    role: str
    full_name: str | None = None


def _create_demo_token(email: str) -> str:
    """Create a locally-signed JWT for the demo user (no Supabase needed)."""
    expire = datetime.utcnow() + timedelta(hours=24)
    payload = {
        "sub": "demo-user",
        "email": email,
        "role": "admin",
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """
    Demo login — validates against hardcoded credentials stored in .env.
    Returns a locally-signed JWT. No Supabase Auth call is made.
    """
    if payload.email.lower() != DEMO_EMAIL.lower() or payload.password != DEMO_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _create_demo_token(payload.email)

    return LoginResponse(
        access_token=token,
        user_id="demo-user",
        email=payload.email,
        role="admin",
        full_name="Demo Administrator",
    )


@router.get("/me", response_model=ProfileOut)
async def get_me(current_user: Profile = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return ProfileOut(
        user_id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        full_name=current_user.full_name,
    )
