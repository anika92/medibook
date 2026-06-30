import uuid
from datetime import datetime, date, time
from sqlalchemy import (
    Column, String, Integer, Boolean, Date, Time,
    DateTime, ForeignKey, UniqueConstraint, Enum as SAEnum, Text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


# ── Enums ──────────────────────────────────────────────────────────────────

class AppointmentStatus(str, enum.Enum):
    PENDING   = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    ATTENDED  = "ATTENDED"


class PaymentStatus(str, enum.Enum):
    PENDING  = "PENDING"
    VERIFIED = "VERIFIED"
    FAILED   = "FAILED"
    REFUNDED = "REFUNDED"


class StaffRole(str, enum.Enum):
    SUPER_ADMIN  = "SUPER_ADMIN"
    RECEPTIONIST = "RECEPTIONIST"
    DEPT_MANAGER = "DEPT_MANAGER"
    FINANCE      = "FINANCE"


# ── Models ─────────────────────────────────────────────────────────────────

class Patient(Base):
    __tablename__ = "patients"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone      = Column(String(15), unique=True, nullable=False, index=True)
    nid_hash   = Column(String(64), unique=True, nullable=False, index=True)  # SHA-256
    full_name  = Column(String(128), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    blood_group   = Column(String(5), nullable=True)
    address       = Column(Text, nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    appointments = relationship("Appointment", back_populates="patient")


class Department(Base):
    __tablename__ = "departments"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name           = Column(String(100), nullable=False)
    code           = Column(String(20), unique=True, nullable=False)  # e.g. MED, GASTRO
    daily_max_slots = Column(Integer, default=100, nullable=False)
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    schedules    = relationship("DeptSchedule", back_populates="department", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="department")


class DeptSchedule(Base):
    """Stores which days of the week a department operates."""
    __tablename__ = "dept_schedules"
    __table_args__ = (
        UniqueConstraint("dept_id", "day_of_week", name="uq_dept_day"),
    )

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dept_id     = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Mon … 6=Sun (Python weekday)
    open_time   = Column(Time, nullable=False, default=time(9, 0))
    close_time  = Column(Time, nullable=False, default=time(14, 0))

    department = relationship("Department", back_populates="schedules")


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        # One NID → one appointment per calendar day
        UniqueConstraint("patient_id", "appt_date", name="uq_patient_date"),
        # Serial numbers unique per dept per day
        UniqueConstraint("dept_id", "appt_date", "serial_no", name="uq_dept_date_serial"),
    )

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    dept_id    = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False, index=True)
    appt_date  = Column(Date, nullable=False, index=True)
    serial_no  = Column(Integer, nullable=False)
    status     = Column(SAEnum(AppointmentStatus), default=AppointmentStatus.PENDING, nullable=False)
    notes      = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patient   = relationship("Patient", back_populates="appointments")
    department = relationship("Department", back_populates="appointments")
    payment   = relationship("Payment", back_populates="appointment", uselist=False)
    qr_token  = relationship("QRToken", back_populates="appointment", uselist=False)


class Payment(Base):
    __tablename__ = "payments"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appt_id      = Column(UUID(as_uuid=True), ForeignKey("appointments.id"), unique=True, nullable=False)
    bkash_trx_id = Column(String(50), unique=True, nullable=True)
    amount_bdt   = Column(Integer, nullable=False, default=10)
    status       = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False)
    bkash_response = Column(Text, nullable=True)  # raw JSON stored as text
    paid_at      = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    appointment = relationship("Appointment", back_populates="payment")

class QRToken(Base):
    __tablename__ = "qr_tokens"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appt_id     = Column(UUID(as_uuid=True), ForeignKey("appointments.id"), unique=True, nullable=False)
    token_hmac  = Column(String(512), nullable=False)  # Changed 256 → 512
    is_used     = Column(Boolean, default=False)
    expires_at  = Column(DateTime(timezone=True), nullable=False)
    scanned_at  = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    appointment = relationship("Appointment", back_populates="qr_token")


class StaffMember(Base):
    __tablename__ = "staff_members"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name    = Column(String(128), nullable=False)
    phone        = Column(String(15), unique=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role         = Column(SAEnum(StaffRole), default=StaffRole.RECEPTIONIST, nullable=False)
    dept_id      = Column(UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True)  # for dept_manager
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
