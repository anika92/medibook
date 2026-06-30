from __future__ import annotations
from uuid import UUID
from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from app.models.models import AppointmentStatus, PaymentStatus, StaffRole
from pydantic import BaseModel, Field, field_validator, EmailStr


# ── Patient ────────────────────────────────────────────────────────────────

class PatientRegister(BaseModel):
    phone: str = Field(..., pattern=r"^01[3-9]\d{8}$")
    nid: str   = Field(..., min_length=10, max_length=17)   # raw NID — hashed server-side
    full_name: str = Field(..., min_length=2, max_length=128)
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = Field(None, pattern=r"^(A|B|AB|O)[+-]$")
    address: Optional[str] = None
    email: Optional[EmailStr] = None

class PatientOut(BaseModel):
    id: UUID
    phone: str
    full_name: str
    blood_group: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class OTPRequest(BaseModel):
    phone: str = Field(..., pattern=r"^01[3-9]\d{8}$")


class OTPVerify(BaseModel):
    phone: str
    otp: str = Field(..., min_length=6, max_length=6)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Department ─────────────────────────────────────────────────────────────

class ScheduleDay(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)   # 0=Mon, 6=Sun
    open_time: time
    close_time: time


class DepartmentCreate(BaseModel):
    name: str
    code: str = Field(..., min_length=2, max_length=20)
    daily_max_slots: int = Field(100, ge=1, le=500)
    schedules: List[ScheduleDay] = []


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    daily_max_slots: Optional[int] = Field(None, ge=1, le=500)
    is_active: Optional[bool] = None
    schedules: Optional[List[ScheduleDay]] = None


class ScheduleOut(BaseModel):
    day_of_week: int
    open_time: time
    close_time: time

    model_config = {"from_attributes": True}


class DepartmentOut(BaseModel):
    id: UUID
    name: str
    code: str
    daily_max_slots: int
    is_active: bool
    schedules: List[ScheduleOut] = []

    model_config = {"from_attributes": True}


class DepartmentSlotInfo(BaseModel):
    dept_id: UUID
    name: str
    code: str
    date: date
    is_open: bool           # is this dept open on this weekday?
    booked: int
    remaining: int
    is_full: bool


# ── Appointment ────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    dept_id: UUID
    appt_date: date

    @field_validator("appt_date")
    @classmethod
    def not_in_past(cls, v: date) -> date:
        from datetime import date as d
        if v < d.today():
            raise ValueError("Appointment date cannot be in the past")
        return v


class AppointmentOut(BaseModel):
    id: UUID
    serial_no: int
    appt_date: date
    status: AppointmentStatus
    dept_id: UUID
    patient_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class AppointmentDetail(AppointmentOut):
    patient: PatientOut
    department: DepartmentOut


# ── Payment ────────────────────────────────────────────────────────────────

class PaymentVerify(BaseModel):
    appt_id: UUID
    bkash_trx_id: str = Field(..., min_length=5, max_length=50)


class PaymentOut(BaseModel):
    id: UUID
    appt_id: UUID
    bkash_trx_id: Optional[str]
    amount_bdt: int
    status: PaymentStatus
    paid_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── QR Token ───────────────────────────────────────────────────────────────

class QRTokenOut(BaseModel):
    token_id: UUID
    token_hmac: str
    appt_id: UUID
    serial_no: int
    dept_name: str
    appt_date: date
    patient_name: str
    expires_at: datetime


class QRScanRequest(BaseModel):
    token_hmac: str


class QRScanResult(BaseModel):
    valid: bool
    message: str
    appt_id: Optional[UUID] = None
    patient_name: Optional[str] = None
    serial_no: Optional[int] = None
    dept_name: Optional[str] = None
    appt_date: Optional[date] = None


# ── Staff ──────────────────────────────────────────────────────────────────

class StaffCreate(BaseModel):
    full_name: str
    phone: str = Field(..., pattern=r"^01[3-9]\d{8}$")
    password: str = Field(..., min_length=8)
    role: StaffRole
    dept_id: Optional[UUID] = None


class StaffLogin(BaseModel):
    phone: str
    password: str


class StaffOut(BaseModel):
    id: UUID
    full_name: str
    phone: str
    role: StaffRole
    is_active: bool

    model_config = {"from_attributes": True}


# ── Reports ────────────────────────────────────────────────────────────────

class DailyReport(BaseModel):
    date: date
    total_bookings: int
    confirmed: int
    cancelled: int
    attended: int
    revenue_bdt: int


class DeptReport(BaseModel):
    dept_id: UUID
    dept_name: str
    total_bookings: int
    revenue_bdt: int
