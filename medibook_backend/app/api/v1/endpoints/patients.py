from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.models import Patient, Appointment, StaffRole
from app.api.v1.deps import require_roles, get_current_patient
from app.schemas.schemas import PatientOut

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("/admin/all", summary="[Admin] List all patients")
async def list_all_patients(
    limit: int = 200,
    offset: int = 0,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient)
        .order_by(Patient.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    patients = result.scalars().all()

    output = []
    for p in patients:
        count_result = await db.execute(
            select(func.count(Appointment.id))
            .where(Appointment.patient_id == p.id)
        )
        count = count_result.scalar() or 0
        output.append({
            "id": str(p.id),
            "phone": p.phone,
            "nid_hash": p.nid_hash,
            "full_name": p.full_name,
            "date_of_birth": str(p.date_of_birth) if p.date_of_birth else None,
            "blood_group": p.blood_group,
            "address": p.address,
            "is_active": p.is_active,
            "created_at": str(p.created_at),
            "appointment_count": count,
        })
    return output


@router.get("/me", response_model=PatientOut, summary="Get logged-in patient profile")
async def my_profile(
    patient: Patient = Depends(get_current_patient),
):
    return patient