import hashlib
import hmac
import json
import secrets
import qrcode
import io
import base64
from datetime import datetime, timedelta
from uuid import UUID
from app.core.config import settings


# ── NID hashing ────────────────────────────────────────────────────────────

def hash_nid(nid: str) -> str:
    """
    SHA-256 hash of NID with app secret salt.
    Raw NID is NEVER persisted to database.
    """
    salted = f"{settings.SECRET_KEY}:{nid.strip()}"
    return hashlib.sha256(salted.encode()).hexdigest()


# ── OTP ────────────────────────────────────────────────────────────────────

def generate_otp() -> str:
    """Cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)


def get_otp_redis_key(phone: str) -> str:
    return f"otp:{phone}"


# ── HMAC QR Token ──────────────────────────────────────────────────────────

def generate_qr_token(
    appt_id: UUID,
    patient_id: UUID,
    dept_code: str,
    appt_date: str,
    serial_no: int,
) -> str:
    """
    Generate an HMAC-SHA256 signed token string.
    Format: base64(payload).signature
    """
    payload = json.dumps({
        "appt_id":    str(appt_id),
        "patient_id": str(patient_id),
        "dept_code":  dept_code,
        "appt_date":  appt_date,
        "serial_no":  serial_no,
        "issued_at":  datetime.utcnow().isoformat(),
    }, separators=(",", ":"))

    payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode()
    signature = hmac.new(
        settings.QR_HMAC_SECRET.encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).hexdigest()

    return f"{payload_b64}.{signature}"


def verify_qr_token(token: str) -> dict | None:
    """Returns decoded payload dict if valid, else None."""
    try:
        payload_b64, signature = token.rsplit(".", 1)
        expected = hmac.new(
            settings.QR_HMAC_SECRET.encode(),
            payload_b64.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            return None

        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        return payload
    except Exception:
        return None


def generate_qr_image_base64(token: str) -> str:
    """Render QR code as base64-encoded PNG for frontend display."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=8,
        border=2,
    )
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#111827", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()
