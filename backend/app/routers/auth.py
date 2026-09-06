import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    get_current_user, create_access_token, normalize_role, ALL_ROLES, require_roles
)
from app.models.project import Profile

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

# ─── Demo credentials (legacy + multi-role) ───────────────────────────────────
DEMO_EMAIL = os.getenv("DEMO_EMAIL", "demo@prism.gov.in")
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "PRISM2026Demo")

# Role-specific demo users for hackathon evaluation
DEMO_USERS: dict[str, dict] = {
    "demo@prism.gov.in": {
        "password": "PRISM2026Demo",
        "role": "admin",
        "full_name": "Demo Administrator",
        "designation": "System Admin",
        "department_or_ministry": "MoSPI",
        "user_id": "demo-admin",
    },
    "admin@prism.gov.in": {
        "password": "PRISM2026Demo",
        "role": "admin",
        "full_name": "Dr. Rajesh Sharma",
        "designation": "Joint Secretary & System Admin",
        "department_or_ministry": "Ministry of Statistics & PI (MoSPI)",
        "user_id": "demo-admin",
    },
    "executive@prism.gov.in": {
        "password": "PRISM2026Demo",
        "role": "decision_maker",
        "full_name": "Smt. Sunita Rao",
        "designation": "Additional Secretary",
        "department_or_ministry": "Cabinet Secretariat, GoI",
        "user_id": "demo-executive",
    },
    "officer@prism.gov.in": {
        "password": "PRISM2026Demo",
        "role": "monitoring_officer",
        "full_name": "Er. Vikram Patel",
        "designation": "Chief Project Officer",
        "department_or_ministry": "NHAI / Ministry of Road Transport & Highways",
        "user_id": "demo-officer",
    },
    "analyst@prism.gov.in": {
        "password": "PRISM2026Demo",
        "role": "analyst",
        "full_name": "Aakash Verma",
        "designation": "Lead Infrastructure Data Scientist",
        "department_or_ministry": "NITI Aayog, GoI",
        "user_id": "demo-analyst",
    },
}


# ─── Schemas ──────────────────────────────────────────────────────────────────

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
    designation: str | None = None
    department_or_ministry: str | None = None


class ProfileOut(BaseModel):
    user_id: str
    email: str
    role: str
    full_name: str | None = None
    designation: str | None = None
    department_or_ministry: str | None = None


class SwitchRoleRequest(BaseModel):
    role: str


class UserRoleUpdate(BaseModel):
    role: str


# ─── Token helper ─────────────────────────────────────────────────────────────

def _create_demo_token(user_info: dict) -> str:
    """Create a locally-signed JWT for a demo user (no Supabase needed)."""
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    payload = {
        "sub": user_info["user_id"],
        "email": user_info.get("email", ""),
        "role": user_info["role"],
        "full_name": user_info.get("full_name"),
        "designation": user_info.get("designation"),
        "department_or_ministry": user_info.get("department_or_ministry"),
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    """
    Multi-role demo login — validates against the demo user registry.
    Returns a locally-signed JWT. No Supabase Auth call is made.

    Supported credentials (all share password PRISM2026Demo):
    - demo@prism.gov.in      → admin
    - admin@prism.gov.in     → admin
    - executive@prism.gov.in → decision_maker
    - officer@prism.gov.in   → monitoring_officer
    - analyst@prism.gov.in   → analyst
    """
    email_lower = payload.email.lower()
    demo_user = DEMO_USERS.get(email_lower)

    if not demo_user or payload.password != demo_user["password"]:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_info = {**demo_user, "email": email_lower}
    token = _create_demo_token(user_info)

    return LoginResponse(
        access_token=token,
        user_id=user_info["user_id"],
        email=email_lower,
        role=user_info["role"],
        full_name=user_info.get("full_name"),
        designation=user_info.get("designation"),
        department_or_ministry=user_info.get("department_or_ministry"),
    )


@router.get("/me", response_model=ProfileOut)
async def get_me(current_user: Profile = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return ProfileOut(
        user_id=str(current_user.id),
        email=current_user.email,
        role=current_user.role,
        full_name=current_user.full_name,
        designation=getattr(current_user, "designation", None),
        department_or_ministry=getattr(current_user, "department_or_ministry", None),
    )


@router.post("/switch-role", response_model=LoginResponse)
async def switch_role(
    body: SwitchRoleRequest,
    current_user: Profile = Depends(get_current_user),
):
    """
    Demo-mode role switcher — issues a fresh JWT for the requested role.
    Only valid for demo accounts (user IDs starting with 'demo-').
    Useful for hackathon presentations and judging sessions.
    """
    if not str(current_user.id).startswith("demo-"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role switching is only available in demo mode.",
        )

    new_role = normalize_role(body.role)
    if new_role not in ALL_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{body.role}'. Allowed: {ALL_ROLES}",
        )

    # Find matching demo user entry for the requested role
    target_user = next(
        (u for u in DEMO_USERS.values() if u["role"] == new_role),
        None
    )
    if not target_user:
        raise HTTPException(status_code=404, detail=f"No demo user found for role '{new_role}'")

    email = next(
        (e for e, u in DEMO_USERS.items() if u["role"] == new_role),
        current_user.email
    )
    user_info = {**target_user, "email": email}
    token = _create_demo_token(user_info)

    return LoginResponse(
        access_token=token,
        user_id=user_info["user_id"],
        email=email,
        role=new_role,
        full_name=user_info.get("full_name"),
        designation=user_info.get("designation"),
        department_or_ministry=user_info.get("department_or_ministry"),
    )


@router.get("/users", response_model=List[ProfileOut])
async def list_users(
    db: Session = Depends(get_db),
    _: Profile = Depends(require_roles(["admin"])),
):
    """
    Admin-only: List all registered platform users.
    """
    profiles = db.query(Profile).all()
    return [
        ProfileOut(
            user_id=str(p.id),
            email=p.email,
            role=p.role,
            full_name=p.full_name,
            designation=getattr(p, "designation", None),
            department_or_ministry=getattr(p, "department_or_ministry", None),
        )
        for p in profiles
    ]


@router.patch("/users/{user_id}/role", response_model=ProfileOut)
async def update_user_role(
    user_id: str,
    body: UserRoleUpdate,
    db: Session = Depends(get_db),
    _: Profile = Depends(require_roles(["admin"])),
):
    """
    Admin-only: Update a user's role assignment.
    """
    import uuid as _uuid
    new_role = normalize_role(body.role)
    if new_role not in ALL_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{body.role}'. Allowed: {ALL_ROLES}",
        )

    try:
        uid = _uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format.")

    profile = db.query(Profile).filter(Profile.id == uid).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User not found.")

    profile.role = new_role
    db.commit()
    db.refresh(profile)

    return ProfileOut(
        user_id=str(profile.id),
        email=profile.email,
        role=profile.role,
        full_name=profile.full_name,
        designation=getattr(profile, "designation", None),
        department_or_ministry=getattr(profile, "department_or_ministry", None),
    )
