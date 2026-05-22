"""Fast2SMS OTP delivery service."""
from __future__ import annotations
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

_FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


async def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via Fast2SMS OTP route. Returns True on success. Never raises."""
    # Normalise to 10-digit Indian mobile number
    clean = phone.strip().lstrip("+")
    if clean.startswith("91") and len(clean) == 12:
        clean = clean[2:]
    if not clean.isdigit() or len(clean) != 10:
        logger.error("Invalid phone number for SMS: %s", phone)
        return False

    api_key = getattr(settings, "FAST2SMS_API_KEY", None)
    if not api_key:
        logger.info("[DEV] FAST2SMS_API_KEY not set — OTP for %s: %s (check email fallback)", phone, otp)
        return False  # Return False so caller knows SMS wasn't sent

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                _FAST2SMS_URL,
                params={
                    "authorization": api_key,
                    "route": "otp",
                    "variables_values": otp,
                    "flash": "0",
                    "numbers": clean,
                },
            )
            logger.info("Fast2SMS HTTP %s for %s", resp.status_code, phone)
            try:
                data = resp.json()
            except Exception:
                logger.error("Fast2SMS non-JSON response for %s: %s", phone, resp.text[:200])
                return False
            if data.get("return") is True:
                logger.info("SMS OTP sent successfully to %s", phone)
                return True
            logger.error("Fast2SMS rejected OTP for %s — response: %s", phone, data)
            return False
    except httpx.TimeoutException:
        logger.error("Fast2SMS timeout for %s", phone)
        return False
    except Exception as exc:
        logger.error("Fast2SMS exception for %s: %s", phone, exc)
        return False
