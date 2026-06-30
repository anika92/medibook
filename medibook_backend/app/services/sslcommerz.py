"""
SSL Commerz payment service.
Supports bKash, Nagad, Rocket, cards, internet banking — all in one.
"""
import httpx
from app.core.config import settings


async def create_sslcommerz_payment(
    appt_id: str,
    amount: int,
    customer_name: str,
    customer_phone: str,
    customer_email: str = "customer@example.com",
) -> dict:
    """
    Initiate a payment session with SSL Commerz.
    Returns the payment URL to redirect the patient to.
    """
    payload = {
        # Store credentials
        "store_id":   settings.SSLCOMMERZ_STORE_ID,
        "store_passwd": settings.SSLCOMMERZ_STORE_PASSWORD,

        # Payment details
        "total_amount": amount,
        "currency":     "BDT",
        "tran_id":      f"MED-{appt_id[:16]}",  # Unique transaction ID

        # Callback URLs — update domain for production
        "success_url": f"http://localhost:8000/api/v1/payments/sslcommerz/success?appt_id={appt_id}",
        "fail_url":    f"http://localhost:8000/api/v1/payments/sslcommerz/fail?appt_id={appt_id}",
        "cancel_url":  f"http://localhost:8000/api/v1/payments/sslcommerz/cancel?appt_id={appt_id}",

        # Customer info
        "cus_name":    customer_name,
        "cus_email":   customer_email,
        "cus_phone":   customer_phone,
        "cus_add1":    "Dhaka",
        "cus_city":    "Dhaka",
        "cus_country": "Bangladesh",

        # Product info
        "product_name":     "Hospital Appointment",
        "product_category": "Healthcare",
        "product_profile":  "general",
        "shipping_method":  "NO",
        "num_of_item":      1,

        # EMI
        "emi_option": 0,
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{settings.SSLCOMMERZ_BASE_URL}/gwprocess/v4/api.php",
            data=payload,
            timeout=30,
        )
        return res.json()


async def validate_sslcommerz_payment(val_id: str) -> dict:
    """Validate a payment after callback using val_id."""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{settings.SSLCOMMERZ_BASE_URL}/validator/api/validationserverAPI.php",
            params={
                "val_id":     val_id,
                "store_id":   settings.SSLCOMMERZ_STORE_ID,
                "store_passwd": settings.SSLCOMMERZ_STORE_PASSWORD,
                "format":     "json",
            },
            timeout=30,
        )
        return res.json()