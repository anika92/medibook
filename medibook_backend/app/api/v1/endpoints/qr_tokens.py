from uuid import UUID
from datetime import timezone , datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import QRToken, Appointment, AppointmentStatus, StaffRole, Patient, Department
from app.schemas.schemas import QRScanRequest, QRScanResult, QRTokenOut
from app.utils.helpers import verify_qr_token, generate_qr_image_base64
from app.api.v1.deps import get_current_patient, require_roles, get_current_staff

router = APIRouter(prefix="/qr", tags=["qr"])


@router.post("/scan", response_model=QRScanResult,
             summary="[Reception] Scan a patient QR token to verify and admit")
async def scan_qr_token(
    body: QRScanRequest,
    staff=Depends(require_roles(
        StaffRole.SUPER_ADMIN, StaffRole.RECEPTIONIST, StaffRole.DEPT_MANAGER
    )),
    db: AsyncSession = Depends(get_db),
):
    """
    1. Verify HMAC signature of the token
    2. Check token is not expired or already used
    3. Mark appointment as ATTENDED and token as used
    Returns patient info for the receptionist to confirm
    """
    # Step 1: verify HMAC
    payload = verify_qr_token(body.token_hmac)
    if not payload:
        return QRScanResult(valid=False, message="Invalid token — HMAC verification failed")

    # Step 2: fetch from DB
    result = await db.execute(
        select(QRToken).where(QRToken.token_hmac == body.token_hmac)
    )
    qr_token = result.scalar_one_or_none()

    if not qr_token:
        return QRScanResult(valid=False, message="Token not found in system")

    if qr_token.is_used:
        return QRScanResult(valid=False, message="Token already used — patient already scanned")

    if datetime.now(timezone.utc) > qr_token.expires_at:
        return QRScanResult(valid=False, message="Token has expired")

    # Step 3: load appointment
    appt_result = await db.execute(
        select(Appointment).where(Appointment.id == qr_token.appt_id)
    )
    appt = appt_result.scalar_one()

    if appt.status == AppointmentStatus.CANCELLED:
        return QRScanResult(valid=False, message="This appointment has been cancelled")

    # Step 4: load patient and department
    patient_result = await db.execute(select(Patient).where(Patient.id == appt.patient_id))
    patient = patient_result.scalar_one()

    dept_result = await db.execute(select(Department).where(Department.id == appt.dept_id))
    dept = dept_result.scalar_one()

    # Step 5: mark attended
    appt.status = AppointmentStatus.ATTENDED
    qr_token.is_used = True
    qr_token.scanned_at = datetime.now(timezone.utc)

    return QRScanResult(
        valid=True,
        message="Valid — admit patient",
        appt_id=appt.id,
        patient_name=patient.full_name,
        serial_no=appt.serial_no,
        dept_name=dept.name,
        appt_date=appt.appt_date,
    )


@router.get("/token/{appt_id}", response_model=QRTokenOut,
            summary="Get QR token details for a confirmed appointment")
async def get_qr_token(
    appt_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Returns token string + base64 QR image for the patient's confirmation screen."""
    result = await db.execute(select(QRToken).where(QRToken.appt_id == appt_id))
    qr_token = result.scalar_one_or_none()

    if not qr_token:
        raise HTTPException(status_code=404, detail="QR token not generated yet — payment pending?")

    appt_result = await db.execute(select(Appointment).where(Appointment.id == appt_id))
    appt = appt_result.scalar_one()

    patient_result = await db.execute(select(Patient).where(Patient.id == appt.patient_id))
    patient = patient_result.scalar_one()

    dept_result = await db.execute(select(Department).where(Department.id == appt.dept_id))
    dept = dept_result.scalar_one()

    return QRTokenOut(
        token_id=qr_token.id,
        token_hmac=qr_token.token_hmac,
        appt_id=appt.id,
        serial_no=appt.serial_no,
        dept_name=dept.name,
        appt_date=appt.appt_date,
        patient_name=patient.full_name,
        expires_at=qr_token.expires_at,
    )
