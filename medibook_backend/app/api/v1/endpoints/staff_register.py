from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, Column, String
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from app.db.session import get_db
from app.models.models import StaffMember, StaffRole
from app.api.v1.deps import require_roles
from app.core.security import hash_password
from app.core.config import settings
from app.models.models import StaffMember, StaffRole
router = APIRouter(prefix="/staff-register", tags=["staff-registration"])


class StaffRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=128)
    phone: str = Field(..., pattern=r"^01[3-9]\d{8}$")
    email: Optional[str] = None
    password: str = Field(..., min_length=8)
    role: str  # Accept as plain string first
    department_name: Optional[str] = None

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        # Accept both uppercase and lowercase
        upper = v.upper()
        valid = ['SUPER_ADMIN', 'RECEPTIONIST', 'DEPT_MANAGER', 'FINANCE']
        if upper not in valid:
            raise ValueError(f"Role must be one of: {', '.join(valid)}")
        return upper  # Always return uppercase


class StaffApproveRequest(BaseModel):
    is_active: bool


@router.post("/", status_code=201, summary="Staff self-registration — pending admin approval")
async def register_staff(
    body: StaffRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Block super admin self-registration
    if body.role == StaffRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Super admin accounts cannot be self-registered. Contact your system administrator."
        )

    # Check duplicate phone
    result = await db.execute(
        select(StaffMember).where(StaffMember.phone == body.phone)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    member = StaffMember(
        full_name=body.full_name,
        phone=body.phone,
        hashed_password=hash_password(body.password),
        role=StaffRole(body.role),  # Convert string to enum
        is_active=False,
    )
    db.add(member)
    await db.flush()

    return {
        "message": "Registration submitted. Please wait for admin approval.",
        "id": str(member.id),
        "full_name": member.full_name,
        "phone": member.phone,
        "role": member.role.value,
        "status": "pending_approval",
    }



@router.get("/pending", summary="[Admin] List all pending staff registrations")
async def list_pending_staff(
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StaffMember)
        .where(StaffMember.is_active == False)
        .order_by(StaffMember.created_at.desc())
    )
    pending = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "full_name": s.full_name,
            "phone": s.phone,
            "role": s.role.value,
            "created_at": str(s.created_at),
            "status": "pending_approval",
        }
        for s in pending
    ]


@router.put("/{staff_id}/approve", summary="[Admin] Approve or reject a staff registration")
async def approve_staff(
    staff_id: UUID,
    body: StaffApproveRequest,
    admin=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StaffMember).where(StaffMember.id == staff_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")

    member.is_active = body.is_active

    action = "approved" if body.is_active else "rejected"
    return {
        "message": f"Staff {action} successfully",
        "id": str(member.id),
        "full_name": member.full_name,
        "phone": member.phone,
        "is_active": member.is_active,
        "status": "active" if body.is_active else "rejected",
    }