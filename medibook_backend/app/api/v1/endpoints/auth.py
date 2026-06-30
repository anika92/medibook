from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import Patient, StaffMember
from app.schemas.schemas import (
    OTPRequest, OTPVerify, PatientRegister, PatientOut, StaffLogin, TokenOut,
)
from app.core.security import create_access_token, verify_password
from app.core.config import settings
from app.utils.helpers import hash_nid, generate_otp

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory OTP store — for production replace with Redis
_otp_store: dict = {}


@router.post("/otp/send", summary="Send OTP to patient phone")
async def send_otp(body: OTPRequest, db: AsyncSession = Depends(get_db)):
    # Check if phone is registered
    result = await db.execute(
        select(Patient).where(Patient.phone == body.phone)
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Phone number not registered. Please register first."
        )

    otp = generate_otp()
    _otp_store[body.phone] = otp
    return {"message": "OTP sent", "dev_otp": otp}

@router.post("/otp/verify", response_model=TokenOut, summary="Verify OTP and get token")
async def verify_otp(body: OTPVerify, db: AsyncSession = Depends(get_db)):
    stored_otp = _otp_store.get(body.phone)

    if not stored_otp or stored_otp != body.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    del _otp_store[body.phone]

    result = await db.execute(select(Patient).where(Patient.phone == body.phone))
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Phone not registered. Please register first.",
        )

    token = create_access_token(
        {"sub": str(patient.id), "type": "patient"},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register", response_model=PatientOut, status_code=201,
             summary="Register a new patient")
async def register_patient(body: PatientRegister, db: AsyncSession = Depends(get_db)):
    nid_hash = hash_nid(body.nid)

    dup_phone = await db.execute(select(Patient).where(Patient.phone == body.phone))
    if dup_phone.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    dup_nid = await db.execute(select(Patient).where(Patient.nid_hash == nid_hash))
    if dup_nid.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="NID already registered")

    patient = Patient(
        phone=body.phone,
        nid_hash=nid_hash,
        full_name=body.full_name,
        date_of_birth=body.date_of_birth,
        blood_group=body.blood_group,
        address=body.address,
    )
    db.add(patient)
    await db.flush()
    return patient


@router.post("/staff/login", response_model=TokenOut, summary="Staff login")
async def staff_login(body: StaffLogin, db: AsyncSession = Depends(get_db)):
    # First find by phone only — ignore is_active
    result = await db.execute(
        select(StaffMember).where(StaffMember.phone == body.phone)
    )
    staff = result.scalar_one_or_none()

    # Phone not found
    if not staff:
        raise HTTPException(status_code=401, detail="Incorrect phone or password")

    # Wrong password
    if not verify_password(body.password, staff.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect phone or password")

    # Account pending approval
    if not staff.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is pending admin approval. Please wait for an administrator to approve your registration."
        )

    token = create_access_token(
        {"sub": str(staff.id), "type": "staff", "role": staff.role.value},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": token, "token_type": "bearer"}