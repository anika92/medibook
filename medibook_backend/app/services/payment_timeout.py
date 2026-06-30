"""
Payment timeout background task.
Runs every 5 minutes and cancels appointments that have been
PENDING (unpaid) for more than 15 minutes.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.models import Appointment, AppointmentStatus, Payment, PaymentStatus

logger = logging.getLogger(__name__)

TIMEOUT_MINUTES = 15  # Cancel unpaid appointments after this many minutes


async def cancel_expired_appointments(db: AsyncSession) -> int:
    """
    Find all PENDING appointments older than TIMEOUT_MINUTES
    and cancel them. Returns count of cancelled appointments.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=TIMEOUT_MINUTES)

    # Find pending appointments older than cutoff
    result = await db.execute(
        select(Appointment).where(
            Appointment.status == AppointmentStatus.PENDING,
            Appointment.created_at < cutoff,
        )
    )
    expired = result.scalars().all()

    if not expired:
        return 0

    count = 0
    for appt in expired:
        appt.status = AppointmentStatus.CANCELLED

        # Also mark payment as failed
        payment_result = await db.execute(
            select(Payment).where(Payment.appt_id == appt.id)
        )
        payment = payment_result.scalar_one_or_none()
        if payment and payment.status == PaymentStatus.PENDING:
            payment.status = PaymentStatus.FAILED

        count += 1
        logger.info(f"Auto-cancelled unpaid appointment {appt.id} (created {appt.created_at})")

    await db.commit()
    return count


async def payment_timeout_worker(get_db_func):
    """
    Background worker that runs every 5 minutes.
    Call this from app startup.
    """
    logger.info("Payment timeout worker started — checking every 5 minutes")
    while True:
        try:
            await asyncio.sleep(300)  # Wait 5 minutes
            async for db in get_db_func():
                count = await cancel_expired_appointments(db)
                if count > 0:
                    logger.info(f"Payment timeout: cancelled {count} unpaid appointments")
        except asyncio.CancelledError:
            logger.info("Payment timeout worker stopped")
            break
        except Exception as e:
            logger.error(f"Payment timeout worker error: {e}")
            await asyncio.sleep(60)  # Wait 1 min before retry on error