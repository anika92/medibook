"""
app/api/v1/deps.py — dependency helpers
Add get_current_staff_optional for department filtering
"""
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.models import Patient, StaffMember, StaffRole

bearer = HTTPBearer(auto_error=False)


async def get_current_patient(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> Patient:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if not payload or payload.get("type") != "patient":
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(
        select(Patient).where(Patient.id == UUID(payload["sub"]))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=401, detail="Patient not found")
    return patient


async def get_current_staff(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> StaffMember:
    """Get current staff from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload or payload.get("type") != "staff":
        raise HTTPException(status_code=401, detail="Invalid staff token")
    result = await db.execute(
        select(StaffMember).where(StaffMember.id == UUID(payload["sub"]))
    )
    staff = result.scalar_one_or_none()
    if not staff or not staff.is_active:
        raise HTTPException(status_code=401, detail="Staff not found or inactive")
    return staff


def require_roles(*roles: StaffRole):
    """Dependency that requires staff to have one of the given roles."""
    async def _check(
        request: Request,
        db: AsyncSession = Depends(get_db),
    ) -> StaffMember:
        staff = await get_current_staff(request, db)
        if staff.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}"
            )
        return staff
    return _check