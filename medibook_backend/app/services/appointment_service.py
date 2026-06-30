from datetime import timezone, datetime, timedelta
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException

from app.models.models import (
    Appointment, AppointmentStatus,
    Department, DeptSchedule, Patient, Payment, PaymentStatus, QRToken,
)
from app.schemas.schemas import AppointmentCreate
from app.utils.helpers import generate_qr_token
from app.core.config import settings


async def _get_dept_or_404(db: AsyncSession, dept_id: UUID) -> Department:
    result = await db.execute(
        select(Department).where(
            Department.id == dept_id,
            Department.is_active == True
        )
    )
    dept = result.scalar_one_or_none()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found or inactive")
    return dept


async def _check_dept_open(db: AsyncSession, dept_id: UUID, appt_date: date) -> None:
    weekday = appt_date.weekday()
    result = await db.execute(
        select(DeptSchedule).where(
            DeptSchedule.dept_id == dept_id,
            DeptSchedule.day_of_week == weekday,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"This department does not operate on {appt_date.strftime('%A')}s",
        )


async def _check_patient_daily_limit(
    db: AsyncSession, patient_id: UUID, appt_date: date
) -> None:
    result = await db.execute(
        select(Appointment).where(
            Appointment.patient_id == patient_id,
            Appointment.appt_date == appt_date,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="This NID already has an appointment on this date",
        )


async def _get_next_serial(
    db: AsyncSession, dept_id: UUID, appt_date: date, max_slots: int
) -> int:
    result = await db.execute(
        select(func.max(Appointment.serial_no)).where(
            Appointment.dept_id == dept_id,
            Appointment.appt_date == appt_date,
        )
    )
    max_serial = result.scalar()

    count_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.dept_id == dept_id,
            Appointment.appt_date == appt_date,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
    )
    active_count = count_result.scalar() or 0

    if active_count >= max_slots:
        raise HTTPException(
            status_code=400,
            detail=f"No slots available — all {max_slots} slots are booked for this date",
        )

    return (max_serial or 0) + 1


async def create_appointment(
    db: AsyncSession,
    patient: Patient,
    data: AppointmentCreate,
) -> Appointment:
    dept = await _get_dept_or_404(db, data.dept_id)
    await _check_dept_open(db, data.dept_id, data.appt_date)
    await _check_patient_daily_limit(db, patient.id, data.appt_date)
    serial = await _get_next_serial(db, data.dept_id, data.appt_date, dept.daily_max_slots)

    appt = Appointment(
        patient_id=patient.id,
        dept_id=data.dept_id,
        appt_date=data.appt_date,
        serial_no=serial,
        status=AppointmentStatus.PENDING,
    )
    db.add(appt)

    payment = Payment(appointment=appt, amount_bdt=settings.BOOKING_FEE_BDT)
    db.add(payment)

    await db.flush()
    return appt


async def confirm_appointment_after_payment(
    db: AsyncSession,
    appt_id: UUID,
    bkash_trx_id: str,
    bkash_response_raw: str,
) -> QRToken:
    result = await db.execute(
        select(Appointment).where(Appointment.id == appt_id)
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.status != AppointmentStatus.PENDING:
        raise HTTPException(status_code=400, detail="Appointment is not in pending state")

    appt.status = AppointmentStatus.CONFIRMED

    payment_result = await db.execute(
        select(Payment).where(Payment.appt_id == appt_id)
    )
    payment = payment_result.scalar_one()
    payment.bkash_trx_id = bkash_trx_id
    payment.status = PaymentStatus.VERIFIED
    payment.bkash_response = bkash_response_raw
    payment.paid_at = datetime.utcnow()

    dept_result = await db.execute(
        select(Department).where(Department.id == appt.dept_id)
    )
    dept = dept_result.scalar_one()

    token_str = generate_qr_token(
        appt_id=appt.id,
        patient_id=appt.patient_id,
        dept_code=dept.code,
        appt_date=str(appt.appt_date),
        serial_no=appt.serial_no,
    )

    qr_token = QRToken(
        appt_id=appt.id,
        token_hmac=token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=36),
    )
    db.add(qr_token)
    await db.flush()

    # Send confirmation email if patient has email and mail is enabled
    if settings.MAIL_ENABLED:
        patient_result = await db.execute(
            select(Patient).where(Patient.id == appt.patient_id)
        )
        patient = patient_result.scalar_one()
        if patient.email:
            try:
                from app.services.email_service import send_booking_confirmation
                await send_booking_confirmation(
                    to_email=patient.email,
                    patient_name=patient.full_name,
                    dept_name=dept.name,
                    appt_date=str(appt.appt_date),
                    serial_no=appt.serial_no,
                    token_hmac=qr_token.token_hmac,
                )
            except Exception as e:
                # Never fail the booking because of email
                print(f"Email send failed: {e}")

    return qr_token


async def get_slot_availability(
    db: AsyncSession, dept_id: UUID, check_date: date
) -> dict:
    dept = await _get_dept_or_404(db, dept_id)
    weekday = check_date.weekday()

    schedule_result = await db.execute(
        select(DeptSchedule).where(
            DeptSchedule.dept_id == dept_id,
            DeptSchedule.day_of_week == weekday,
        )
    )
    schedule = schedule_result.scalar_one_or_none()

    booked_result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.dept_id == dept_id,
            Appointment.appt_date == check_date,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
    )
    booked = booked_result.scalar() or 0

    return {
        "dept_id": dept_id,
        "name": dept.name,
        "code": dept.code,
        "date": check_date,
        "is_open": schedule is not None,
        "booked": booked,
        "remaining": max(0, dept.daily_max_slots - booked),
        "is_full": booked >= dept.daily_max_slots,
    }