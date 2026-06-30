from datetime import date
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import Appointment, AppointmentStatus, Patient, Department, StaffRole
from app.schemas.schemas import AppointmentCreate, AppointmentOut, DepartmentSlotInfo
from app.services.appointment_service import (
    create_appointment, get_slot_availability
)
from app.api.v1.deps import get_current_patient, require_roles

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("/", response_model=AppointmentOut, status_code=201,
             summary="Create a new appointment (patient only)")
async def book_appointment(
    body: AppointmentCreate,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    appt = await create_appointment(db, patient, body)
    return appt


@router.get("/my", response_model=List[AppointmentOut],
            summary="Get all appointments for the logged-in patient")
async def my_appointments(
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment)
        .where(Appointment.patient_id == patient.id)
        .order_by(Appointment.appt_date.desc())
    )
    return result.scalars().all()


@router.get("/slots", response_model=DepartmentSlotInfo,
            summary="Check available slots for a dept on a given date")
async def check_slots(
    dept_id: UUID,
    check_date: date,
    db: AsyncSession = Depends(get_db),
):
    return await get_slot_availability(db, dept_id, check_date)


@router.delete("/{appt_id}", summary="Cancel an appointment (patient only)")
async def cancel_appointment(
    appt_id: UUID,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appt_id,
            Appointment.patient_id == patient.id,
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status == AppointmentStatus.ATTENDED:
        raise HTTPException(status_code=400, detail="Cannot cancel an attended appointment")
    appt.status = AppointmentStatus.CANCELLED
    return {"message": "Appointment cancelled", "appt_id": appt_id}


# ── Admin endpoints ────────────────────────────────────────────────────────

@router.get("/admin/all", summary="[Admin] List all appointments with patient and dept names")
async def admin_list_appointments(
    appt_date: date | None = None,
    dept_id: UUID | None = None,
    status_filter: AppointmentStatus | None = None,
    limit: int = 200,
    offset: int = 0,
    staff=Depends(require_roles(
        StaffRole.SUPER_ADMIN,
        StaffRole.RECEPTIONIST,
        StaffRole.DEPT_MANAGER
    )),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Appointment)
        .options(
            selectinload(Appointment.patient),
            selectinload(Appointment.department),
        )
    )
    if appt_date:
        query = query.where(Appointment.appt_date == appt_date)
    if dept_id:
        query = query.where(Appointment.dept_id == dept_id)
    if status_filter:
        query = query.where(Appointment.status == status_filter)

    query = query.order_by(
        Appointment.appt_date.desc(),
        Appointment.serial_no
    ).limit(limit).offset(offset)

    result = await db.execute(query)
    appts = result.scalars().all()

    # Return enriched data with real names
    return [
        {
            "id": str(a.id),
            "serial_no": a.serial_no,
            "appt_date": str(a.appt_date),
            "status": a.status.value if hasattr(a.status, 'value') else a.status,
            "dept_id": str(a.dept_id),
            "patient_id": str(a.patient_id),
            "created_at": str(a.created_at),
            # Real names
            "patient_name": a.patient.full_name if a.patient else "—",
            "patient_phone": a.patient.phone if a.patient else "—",
            "dept_name": a.department.name if a.department else "—",
            "dept_code": a.department.code if a.department else "—",
        }
        for a in appts
    ]


@router.patch("/{appt_id}/cancel",
              summary="[Admin] Cancel an appointment — super admin only")
async def admin_cancel_appointment(
    appt_id: UUID,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appt_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status == AppointmentStatus.ATTENDED:
        raise HTTPException(status_code=400, detail="Cannot cancel an attended appointment")
    if appt.status == AppointmentStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Appointment is already cancelled")
    appt.status = AppointmentStatus.CANCELLED
    return {"message": "Appointment cancelled by admin", "appt_id": str(appt_id)}