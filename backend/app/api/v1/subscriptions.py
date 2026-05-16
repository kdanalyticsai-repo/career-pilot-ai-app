import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.subscription_service import PLANS, get_all_usage, FREE_LIMITS

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

PAYMENT_PAGE_URL = "https://kdaanalytics.com/cvpilot/subscribe"


@router.get("/plans")
async def list_plans():
    return {"plans": PLANS}


@router.get("/my-usage")
async def get_my_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    usage = await get_all_usage(db, current_user.id)
    plan = current_user.subscription or "free"
    plan_data = PLANS.get(plan, PLANS["free"])

    features = plan_data["features"]
    result = {}

    for feature, monthly_limit in FREE_LIMITS.items():
        used = usage.get(feature, 0)
        if plan == "pro":
            result[feature] = {"used": used, "limit": None, "blocked": False}
        else:
            blocked = monthly_limit is None
            result[feature] = {
                "used": used,
                "limit": monthly_limit,
                "blocked": blocked,
            }

    return {
        "plan": plan,
        "usage": result,
        "resume_uploads": features.get("resume_uploads"),
        "application_tracking": features.get("application_tracking"),
    }


@router.get("/payment-url")
async def get_payment_url(current_user: User = Depends(get_current_user)):
    """Return the Razorpay payment page URL pre-filled with the user's identity."""
    if current_user.subscription == "pro":
        raise HTTPException(400, "Already on Pro plan")

    import urllib.parse
    params = urllib.parse.urlencode({
        "uid": current_user.id,
        "email": current_user.email or "",
        "name": current_user.full_name or "",
    })
    return {"url": f"{PAYMENT_PAGE_URL}?{params}"}


@router.post("/razorpay-webhook")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Razorpay posts here after a successful payment.
    Verifies the webhook signature, then upgrades the user identified in notes.
    Configure this URL in the Razorpay dashboard → Webhooks.
    """
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(500, "Webhook secret not configured")

    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid webhook signature")

    payload = json.loads(body)
    event = payload.get("event", "")

    user_id: str | None = None

    if event == "payment.captured":
        notes = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("notes", {})
        user_id = notes.get("user_id")

    elif event == "subscription.charged":
        notes = payload.get("payload", {}).get("subscription", {}).get("entity", {}).get("notes", {})
        user_id = notes.get("user_id")

    if user_id:
        user = await db.get(User, user_id)
        if user and user.subscription != "pro":
            user.subscription = "pro"
            await db.commit()

    return {"status": "ok"}


@router.post("/downgrade")
async def downgrade_to_free(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.subscription = "free"
    await db.commit()
    return {"subscription": "free"}
