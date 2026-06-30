from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.models import (
    Appointment, AppointmentStatus, Payment, PaymentStatus,
    Patient, StaffMember, StaffRole, Department, QRToken,
)
from app.schemas.schemas import DailyReport, DeptReport, StaffCreate, StaffOut
from app.api.v1.deps import require_roles
from app.core.security import hash_password
from pydantic import BaseModel

reports_router = APIRouter(prefix="/reports", tags=["reports"])


@reports_router.get("/daily", response_model=DailyReport, summary="[Admin] Daily stats")
async def daily_report(
    report_date: date,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN, StaffRole.FINANCE)),
    db: AsyncSession = Depends(get_db),
):
    def count_q(s):
        return select(func.count(Appointment.id)).where(
            Appointment.appt_date == report_date,
            Appointment.status == s,
        )
    total     = (await db.execute(select(func.count(Appointment.id)).where(Appointment.appt_date == report_date))).scalar() or 0
    confirmed = (await db.execute(count_q(AppointmentStatus.CONFIRMED))).scalar() or 0
    cancelled = (await db.execute(count_q(AppointmentStatus.CANCELLED))).scalar() or 0
    attended  = (await db.execute(count_q(AppointmentStatus.ATTENDED))).scalar() or 0
    revenue   = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount_bdt), 0))
        .join(Appointment, Appointment.id == Payment.appt_id)
        .where(Appointment.appt_date == report_date, Payment.status == PaymentStatus.VERIFIED)
    )).scalar() or 0
    return DailyReport(date=report_date, total_bookings=total, confirmed=confirmed, cancelled=cancelled, attended=attended, revenue_bdt=revenue)


@reports_router.get("/departments", response_model=List[DeptReport], summary="[Admin] Per-department stats")
async def dept_report(
    from_date: date,
    to_date: date,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN, StaffRole.FINANCE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Department.id, Department.name,
               func.count(Appointment.id).label("total_bookings"),
               func.coalesce(func.sum(Payment.amount_bdt), 0).label("revenue_bdt"))
        .join(Appointment, Appointment.dept_id == Department.id)
        .outerjoin(Payment, Payment.appt_id == Appointment.id)
        .where(Appointment.appt_date >= from_date, Appointment.appt_date <= to_date,
               Appointment.status != AppointmentStatus.CANCELLED)
        .group_by(Department.id, Department.name)
        .order_by(func.count(Appointment.id).desc())
    )
    return [DeptReport(dept_id=r.id, dept_name=r.name, total_bookings=r.total_bookings, revenue_bdt=r.revenue_bdt) for r in result.all()]


@reports_router.post("/admin/archive-old", summary="[Admin] Archive old appointments")
async def archive_old_appointments(
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta
    cutoff = date.today() - timedelta(days=730)
    result = await db.execute(select(func.count(Appointment.id)).where(Appointment.appt_date < cutoff))
    return {"message": f"{result.scalar()} old appointments can be archived", "cutoff_date": str(cutoff)}


@reports_router.delete("/admin/cleanup-tokens", summary="[Admin] Delete expired QR tokens")
async def cleanup_expired_tokens(
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timezone, datetime
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(QRToken).where(QRToken.expires_at < datetime.now(timezone.utc)))
    return {"message": "Expired tokens cleaned up"}


# ── Staff ──────────────────────────────────────────────────────────────────

class StaffUpdate(BaseModel):
    full_name:  Optional[str]      = None
    role:       Optional[StaffRole] = None
    dept_id:    Optional[UUID]     = None
    is_active:  Optional[bool]     = None


staff_router = APIRouter(prefix="/staff", tags=["staff"])


@staff_router.get("/", response_model=List[StaffOut], summary="[Super admin] List all staff")
async def list_staff(
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StaffMember).order_by(StaffMember.full_name))
    members = result.scalars().all()
    # Return with dept_id
    return [
        {
            "id": str(m.id),
            "full_name": m.full_name,
            "phone": m.phone,
            "role": m.role.value if hasattr(m.role,'value') else m.role,
            "is_active": m.is_active,
            "dept_id": str(m.dept_id) if m.dept_id else None,
        }
        for m in members
    ]


@staff_router.post("/", response_model=StaffOut, status_code=201, summary="[Super admin] Create staff")
async def create_staff(
    body: StaffCreate,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    member = StaffMember(
        full_name=body.full_name,
        phone=body.phone,
        hashed_password=hash_password(body.password),
        role=body.role,
        dept_id=body.dept_id,
    )
    db.add(member)
    await db.flush()
    return member


@staff_router.put("/{staff_id}", summary="[Super admin] Update staff")
async def update_staff(
    staff_id: UUID,
    body: StaffUpdate,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StaffMember).where(StaffMember.id == staff_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Staff not found")

    if body.full_name  is not None: member.full_name  = body.full_name
    if body.role       is not None: member.role       = body.role
    if body.is_active  is not None: member.is_active  = body.is_active
    # Update dept_id — clear it if role is not DEPT_MANAGER
    if body.role == StaffRole.DEPT_MANAGER:
        if body.dept_id is not None:
            member.dept_id = body.dept_id
    else:
        member.dept_id = None

    await db.flush()
    return {
        "id": str(member.id),
        "full_name": member.full_name,
        "phone": member.phone,
        "role": member.role.value if hasattr(member.role,'value') else member.role,
        "is_active": member.is_active,
        "dept_id": str(member.dept_id) if member.dept_id else None,
    }