"""
bKash Payment Gateway (PGW) integration.
Uses the Tokenized Checkout API — server-to-server payment verification.
Docs: https://developer.bka.sh/docs/
"""
import json
import httpx
from datetime import datetime
from app.core.config import settings

_bkash_token_cache: dict = {"token": None, "expires_at": None}


async def _get_bkash_token() -> str:
    """Fetch or reuse a bKash grant token (valid for 1 hour)."""
    now = datetime.utcnow()
    if (
        _bkash_token_cache["token"]
        and _bkash_token_cache["expires_at"]
        and now < _bkash_token_cache["expires_at"]
    ):
        return _bkash_token_cache["token"]

    url = f"{settings.BKASH_BASE_URL}/tokenized/checkout/token/grant"
    headers = {
        "Content-Type": "application/json",
        "username": settings.BKASH_USERNAME,
        "password": settings.BKASH_PASSWORD,
    }
    payload = {
        "app_key": settings.BKASH_APP_KEY,
        "app_secret": settings.BKASH_APP_SECRET,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    token = data["id_token"]
    # bKash tokens expire in 3600s; cache for 55 mins to be safe
    from datetime import timedelta
    _bkash_token_cache["token"] = token
    _bkash_token_cache["expires_at"] = now + timedelta(minutes=55)
    return token


async def create_bkash_payment(
    appt_id: str,
    amount: int,
    merchant_invoice_number: str,
) -> dict:
    """
    Create a bKash payment session.
    Returns the bKash paymentID and bkashURL to redirect the user.
    """
    token = await _get_bkash_token()
    url = f"{settings.BKASH_BASE_URL}/tokenized/checkout/create"
    headers = {
        "Content-Type": "application/json",
        "Authorization": token,
        "X-APP-Key": settings.BKASH_APP_KEY,
    }
    payload = {
        "mode": "0011",              # Tokenized checkout
        "payerReference": appt_id,
        "callbackURL": "https://yourdomain.com/api/v1/payments/bkash-callback",
        "amount": str(amount),
        "currency": "BDT",
        "intent": "sale",
        "merchantInvoiceNumber": merchant_invoice_number,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def execute_bkash_payment(payment_id: str) -> dict:
    """
    Execute a bKash payment after user completes on bKash side.
    Returns transaction details including trxID.
    """
    token = await _get_bkash_token()
    url = f"{settings.BKASH_BASE_URL}/tokenized/checkout/execute"
    headers = {
        "Content-Type": "application/json",
        "Authorization": token,
        "X-APP-Key": settings.BKASH_APP_KEY,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json={"paymentID": payment_id}, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    if data.get("statusCode") != "0000":
        raise ValueError(f"bKash payment failed: {data.get('statusMessage')}")

    return data


async def query_bkash_payment(trx_id: str) -> dict:
    """Query a bKash transaction by trxID to verify it independently."""
    token = await _get_bkash_token()
    url = f"{settings.BKASH_BASE_URL}/tokenized/checkout/transaction/status"
    headers = {
        "Authorization": token,
        "X-APP-Key": settings.BKASH_APP_KEY,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params={"trxID": trx_id}, headers=headers)
        resp.raise_for_status()
        return resp.json()
