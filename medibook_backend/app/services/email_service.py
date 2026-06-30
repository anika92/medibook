from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from typing import Optional
import os

from app.core.config import settings


def get_mail_config():
    return ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=False,  # Fix for Python 3.14 SSL issue
    )

async def send_booking_confirmation(
    to_email: str,
    patient_name: str,
    dept_name: str,
    appt_date: str,
    serial_no: int,
    token_hmac: str,
):
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#1B4FD8;padding:28px 32px;">
        <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">MediBook</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Hospital Appointment System</div>
      </div>
      <div style="padding:28px 32px;">
        <div style="font-size:20px;font-weight:600;color:#111827;margin-bottom:6px;">
          Appointment confirmed ✓
        </div>
        <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">
          Dear <strong style="color:#111827;">{patient_name}</strong>, your appointment has been confirmed and payment verified.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr>
              <td style="color:#6b7280;padding:8px 0;border-bottom:1px solid #e5e7eb;">Department</td>
              <td style="font-weight:600;color:#111827;text-align:right;padding:8px 0;border-bottom:1px solid #e5e7eb;">{dept_name}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;padding:8px 0;border-bottom:1px solid #e5e7eb;">Date</td>
              <td style="font-weight:600;color:#111827;text-align:right;padding:8px 0;border-bottom:1px solid #e5e7eb;">{appt_date}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;padding:8px 0;">Queue serial number</td>
              <td style="text-align:right;padding:8px 0;">
                <span style="font-size:28px;font-weight:700;color:#1B4FD8;">#{str(serial_no).zfill(3)}</span>
              </td>
            </tr>
          </table>
        </div>
        <div style="background:#EEF3FF;border:1px solid #C7D7FA;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
          <div style="font-size:12px;font-weight:600;color:#1B4FD8;margin-bottom:4px;">QR Token ID</div>
          <div style="font-size:11px;font-family:monospace;color:#374151;word-break:break-all;">{token_hmac[:48]}...</div>
          <div style="font-size:12px;color:#6b7280;margin-top:6px;">Show your QR code from the MediBook app at the reception desk.</div>
        </div>
        <div style="background:#ECFDF5;border:1px solid #86EFAC;border-radius:8px;padding:12px 16px;font-size:13px;color:#166534;">
          ✓ Payment verified via bKash &nbsp;·&nbsp; ✓ Slot reserved &nbsp;·&nbsp; ✓ Token generated
        </div>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">
          This is an automated message from MediBook. Please do not reply to this email.
        </p>
      </div>
    </div>
    """
    fm = FastMail(get_mail_config())
    message = MessageSchema(
        subject=f"Appointment Confirmed — {dept_name} · Serial #{str(serial_no).zfill(3)}",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


async def send_staff_approved(
    to_email: str,
    staff_name: str,
    role: str,
):
    role_display = role.replace('_', ' ').title()
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#0EA472;padding:28px 32px;">
        <div style="font-size:22px;font-weight:700;color:#fff;">MediBook</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Staff Account Approval</div>
      </div>
      <div style="padding:28px 32px;">
        <div style="font-size:20px;font-weight:600;color:#111827;margin-bottom:6px;">
          Your account has been approved ✓
        </div>
        <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">
          Dear <strong style="color:#111827;">{staff_name}</strong>, your MediBook staff account has been reviewed and approved by the administrator.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
          <table style="width:100%;font-size:14px;border-collapse:collapse;">
            <tr>
              <td style="color:#6b7280;padding:8px 0;border-bottom:1px solid #e5e7eb;">Name</td>
              <td style="font-weight:600;color:#111827;text-align:right;padding:8px 0;border-bottom:1px solid #e5e7eb;">{staff_name}</td>
            </tr>
            <tr>
              <td style="color:#6b7280;padding:8px 0;">Role</td>
              <td style="text-align:right;padding:8px 0;">
                <span style="background:#EEF3FF;color:#1B4FD8;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;">{role_display}</span>
              </td>
            </tr>
          </table>
        </div>
        <a href="http://yourdomain.com/admin/login"
           style="display:inline-block;background:#1B4FD8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Login to admin panel →
        </a>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">
          This is an automated message from MediBook. Please do not reply.
        </p>
      </div>
    </div>
    """
    fm = FastMail(get_mail_config())
    message = MessageSchema(
        subject="Your MediBook staff account has been approved",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


async def send_staff_rejected(
    to_email: str,
    staff_name: str,
):
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#374151;padding:28px 32px;">
        <div style="font-size:22px;font-weight:700;color:#fff;">MediBook</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Staff Account Update</div>
      </div>
      <div style="padding:28px 32px;">
        <p style="font-size:15px;color:#374151;margin:0 0 16px;">
          Dear <strong>{staff_name}</strong>,
        </p>
        <p style="font-size:14px;color:#6b7280;line-height:1.6;">
          Unfortunately your staff registration request could not be approved at this time. Please contact your hospital administrator for more information.
        </p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">MediBook Hospital Appointment System</p>
      </div>
    </div>
    """
    fm = FastMail(get_mail_config())
    message = MessageSchema(
        subject="Update on your MediBook staff registration",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


async def send_otp_email(
    to_email: str,
    patient_name: str,
    otp: str,
):
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="background:#1B4FD8;padding:28px 32px;">
        <div style="font-size:22px;font-weight:700;color:#fff;">MediBook</div>
      </div>
      <div style="padding:28px 32px;text-align:center;">
        <p style="font-size:15px;color:#374151;">Hi <strong>{patient_name}</strong>, your OTP is:</p>
        <div style="font-size:42px;font-weight:700;color:#1B4FD8;letter-spacing:12px;margin:20px 0;">{otp}</div>
        <p style="font-size:13px;color:#9ca3af;">Valid for 5 minutes. Do not share with anyone.</p>
      </div>
    </div>
    """
    fm = FastMail(get_mail_config())
    message = MessageSchema(
        subject=f"Your MediBook OTP: {otp}",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )
    await fm.send_message(message)