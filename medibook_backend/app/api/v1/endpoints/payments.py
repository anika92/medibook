import json
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import (
    Appointment, AppointmentStatus, Payment, PaymentStatus,
    StaffRole, Patient, Department
)
from app.schemas.schemas import PaymentOut
from app.services.appointment_service import confirm_appointment_after_payment
from app.api.v1.deps import get_current_patient, require_roles
from app.utils.helpers import generate_qr_image_base64

router = APIRouter(prefix="/payments", tags=["payments"])


# ── INITIATE PAYMENT ───────────────────────────────────────────────────────

@router.post("/initiate/{appt_id}", summary="Initiate SSL Commerz payment")
async def initiate_payment(
    appt_id: UUID,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    # Verify appointment belongs to patient
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appt_id,
            Appointment.patient_id == patient.id,
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status != AppointmentStatus.PENDING:
        raise HTTPException(status_code=400, detail="Appointment is not pending")

    # Get department name
    dept_result = await db.execute(
        select(Department).where(Department.id == appt.dept_id)
    )
    dept = dept_result.scalar_one()

    from app.services.sslcommerz import create_sslcommerz_payment
    from app.core.config import settings

    data = await create_sslcommerz_payment(
        appt_id=str(appt_id),
        amount=settings.BOOKING_FEE_BDT,
        customer_name=patient.full_name,
        customer_phone=patient.phone,
    )

    if data.get("status") != "SUCCESS":
        raise HTTPException(
            status_code=502,
            detail=f"Payment gateway error: {data.get('failedreason', 'Unknown error')}"
        )

    return {
        "payment_url": data["GatewayPageURL"],
        "session_key": data.get("sessionkey"),
        "status":      data["status"],
    }


# ── SUCCESS CALLBACK ───────────────────────────────────────────────────────

@router.post("/sslcommerz/success", summary="SSL Commerz success callback")
async def sslcommerz_success(
    request: Request,
    appt_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    form = await request.form()
    val_id   = form.get("val_id")
    tran_id  = form.get("tran_id")
    status   = form.get("status")

    if status != "VALID" and status != "VALIDATED":
        # Validate with SSL Commerz
        from app.services.sslcommerz import validate_sslcommerz_payment
        validation = await validate_sslcommerz_payment(val_id)
        if validation.get("status") not in ("VALID", "VALIDATED"):
            return RedirectResponse(
                url=f"http://localhost:5173/payment-failed?appt_id={appt_id}",
                status_code=302
            )

    try:
        qr_token = await confirm_appointment_after_payment(
            db=db,
            appt_id=UUID(appt_id),
            bkash_trx_id=tran_id or val_id,
            bkash_response_raw=json.dumps(dict(form)),
        )
        # Redirect to token page
        return RedirectResponse(
            url=f"http://localhost:5173/token/{appt_id}",
            status_code=302
        )
    except Exception as e:
        return RedirectResponse(
            url=f"http://localhost:5173/payment-failed?appt_id={appt_id}&error={str(e)}",
            status_code=302
        )


# ── FAIL CALLBACK ──────────────────────────────────────────────────────────

@router.post("/sslcommerz/fail", summary="SSL Commerz fail callback")
async def sslcommerz_fail(
    appt_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Mark payment as failed
    result = await db.execute(
        select(Appointment).where(Appointment.id == UUID(appt_id))
    )
    appt = result.scalar_one_or_none()
    if appt:
        payment_result = await db.execute(
            select(Payment).where(Payment.appt_id == UUID(appt_id))
        )
        payment = payment_result.scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.FAILED

    return RedirectResponse(
        url=f"http://localhost:5173/payment-failed?appt_id={appt_id}",
        status_code=302
    )


# ── CANCEL CALLBACK ────────────────────────────────────────────────────────

@router.post("/sslcommerz/cancel", summary="SSL Commerz cancel callback")
async def sslcommerz_cancel(appt_id: str = Query(...)):
    return RedirectResponse(
        url=f"http://localhost:5173/appointments",
        status_code=302
    )


# ── PAYMENT STATUS ─────────────────────────────────────────────────────────

@router.get("/status/{appt_id}", response_model=PaymentOut,
            summary="Get payment status for an appointment")
async def payment_status(
    appt_id: UUID,
    patient: Patient = Depends(get_current_patient),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment).where(Payment.appt_id == appt_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


# ── ADMIN ENDPOINTS ────────────────────────────────────────────────────────

@router.get("/admin/all", summary="[Admin] List all payments")
async def admin_list_payments(
    status_filter: PaymentStatus | None = None,
    limit: int = 100,
    offset: int = 0,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN, StaffRole.FINANCE)),
    db: AsyncSession = Depends(get_db),
):
    query = select(Payment)
    if status_filter:
        query = query.where(Payment.status == status_filter)
    query = query.order_by(Payment.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/admin/verify-manual/{appt_id}",
             summary="[Admin] Manually verify a payment")
async def admin_verify_payment(
    appt_id: UUID,
    bkash_trx_id: str,
    staff=Depends(require_roles(StaffRole.SUPER_ADMIN, StaffRole.FINANCE)),
    db: AsyncSession = Depends(get_db),
):
    qr_token = await confirm_appointment_after_payment(
        db=db,
        appt_id=appt_id,
        bkash_trx_id=bkash_trx_id,
        bkash_response_raw=json.dumps({"manual": True, "trx_id": bkash_trx_id}),
    )
    return {"message": "Payment verified", "appt_id": appt_id, "trx_id": bkash_trx_id}