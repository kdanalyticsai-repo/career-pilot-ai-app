"""Fast2SMS OTP delivery service."""
from __future__ import annotations
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

_FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


async def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via Fast2SMS. Returns True on success. Never raises."""
    # Strip +91 or 0 prefix if present
    clean = phone.strip().lstrip("+")
    if clean.startswith("91") and len(clean) == 12:
        clean = clean[2:]

    api_key = getattr(settings, "FAST2SMS_API_KEY", None)
    if not api_key:
        logger.info("FAST2SMS_API_KEY not configured — OTP for %s is: %s", phone, otp)
        return True  # dev mode: log OTP instead of sending

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                _FAST2SMS_URL,
                params={
                    "authorization": api_key,
                    "variables_values": otp,
                    "route": "otp",
                    "numbers": clean,
                },
            )
            data = resp.json()
            if data.get("return") is True:
                logger.info("SMS OTP sent to %s", phone)
                return True
            logger.error("Fast2SMS error for %s: %s", phone, data)
            return False
    except Exception as exc:
        logger.error("Failed to send SMS to %s: %s", phone, exc)
        return False
