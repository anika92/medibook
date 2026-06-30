from uuid import UUID
from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import Department, DeptSchedule, StaffRole, StaffMember
from app.schemas.schemas import (
    DepartmentCreate, DepartmentUpdate, DepartmentOut, DepartmentSlotInfo,
)
from app.api.v1.deps import require_roles, get_current_staff
from app.services.appointment_service import get_slot_availability

router = APIRouter(prefix="/departments", tags=["departments"])


def build_dept_out(dept, schedules) -> dict:
    return {
        "id": dept.id,
        "name": dept.name,
        "code": dept.code,
        "daily_max_slots": dept.daily_max_slots,
        "is_active": dept.is_active,
        "schedules": [
            {
                "day_of_week": s.day_of_week,
                "open_time": s.open_time,
                "close_time": s.close_time,
            }
            for s in schedules
        ],
    }


@router.get("/", response_model=List[DepartmentOut], summary="List departments")
async def list_departments(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Public — returns all active departments for booking page.
    Staff with token — dept manager sees only their assigned dept.
    """
    # Try to get staff from token (optional)
    staff = None
    try:
        from app.api.v1.deps import get_current_staff
        staff = await get_current_staff(request, db)
    except Exception:
        pass

    query = select(Department).options(
        selectinload(Department.schedules)
    )

    # Dept manager only sees their own department
    if staff and staff.role == StaffRole.DEPT_MANAGER and staff.dept_id:
        query = query.where(Department.id == staff.dept_id)
    else:
        # Everyone else sees all departments
        query = query.order_by(Department.name)

    result = await db.execute(query)
    depts = result.scalars().all()
    return [build_dept_out(d, d.schedules) for d in depts]


@router.get("/{dept_id}", response_model=DepartmentOut, summary="Get a single department")
async def get_department(dept_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Department)
        .options(selectinload(Department.schedules))
        .where(Department.id == dept_id)
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return build_dept_out(dept, dept.schedules)


@router.get("/{dept_id}/slots", response_model=DepartmentSlotInfo,
            summary="Check slot availability")
async def dept_slot_info(
    dept_id: UUID,
    check_date: date,
    db: AsyncSession = Depends(get_db),
):
    return await get_slot_availability(db, dept_id, check_date)


@router.post("/", response_model=DepartmentOut, status_code=201,
             summary="[Super admin] Create department")
async def create_department(
    body: DepartmentCreate,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    dept = Department(
        name=body.name,
        code=body.code.upper(),
        daily_max_slots=body.daily_max_slots,
    )
    db.add(dept)
    await db.flush()

    schedules = []
    for sched in body.schedules:
        s = DeptSchedule(
            dept_id=dept.id,
            day_of_week=sched.day_of_week,
            open_time=sched.open_time,
            close_time=sched.close_time,
        )
        db.add(s)
        schedules.append(s)

    await db.flush()
    return build_dept_out(dept, schedules)


@router.put("/{dept_id}", response_model=DepartmentOut,
            summary="[Admin] Update department")
async def update_department(
    dept_id: UUID,
    body: DepartmentUpdate,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN, StaffRole.DEPT_MANAGER)),
    db: AsyncSession = Depends(get_db),
):
    # Dept manager can only edit their assigned department
    if staff.role == StaffRole.DEPT_MANAGER:
        if not staff.dept_id or staff.dept_id != dept_id:
            raise HTTPException(
                status_code=403,
                detail="You can only edit your assigned department"
            )

    result = await db.execute(
        select(Department).where(Department.id == dept_id)
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    if body.name is not None:
        dept.name = body.name
    if body.daily_max_slots is not None:
        dept.daily_max_slots = body.daily_max_slots
    if body.is_active is not None:
        dept.is_active = body.is_active

    if body.schedules is not None:
        await db.execute(
            delete(DeptSchedule).where(DeptSchedule.dept_id == dept_id)
        )
        schedules = []
        for sched in body.schedules:
            s = DeptSchedule(
                dept_id=dept_id,
                day_of_week=sched.day_of_week,
                open_time=sched.open_time,
                close_time=sched.close_time,
            )
            db.add(s)
            schedules.append(s)
        await db.flush()
    else:
        sched_result = await db.execute(
            select(DeptSchedule)
            .where(DeptSchedule.dept_id == dept_id)
            .order_by(DeptSchedule.day_of_week)
        )
        schedules = sched_result.scalars().all()

    return build_dept_out(dept, schedules)


@router.delete("/{dept_id}", summary="[Super admin] Deactivate department")
async def deactivate_department(
    dept_id: UUID,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Department).where(Department.id == dept_id)
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.is_active = False
    return {"message": "Department deactivated", "dept_id": dept_id}