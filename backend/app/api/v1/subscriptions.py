import base64
import hashlib
import hmac
import json
import urllib.parse
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.subscription_service import PLANS, get_all_usage, FREE_LIMITS, is_in_trial

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

PLAN_CONFIG = {
    "monthly":   {"amount": 19900,  "days": 30,  "label": "₹199/month"},
    "quarterly": {"amount": 49900,  "days": 90,  "label": "₹499/quarter"},
    "yearly":    {"amount": 149900, "days": 365, "label": "₹1,499/year"},
}


def _razorpay_auth() -> str:
    return base64.b64encode(
        f"{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}".encode()
    ).decode()


async def _create_order(uid: str, plan: str, amount: int) -> dict:
    """Create a Razorpay Order and return the full order object."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.razorpay.com/v1/orders",
            headers={
                "Authorization": f"Basic {_razorpay_auth()}",
                "Content-Type": "application/json",
            },
            json={
                "amount": amount,
                "currency": "INR",
                "notes": {"user_id": uid, "plan": plan},
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()


# ── Payment URL ───────────────────────────────────────────────────────────────

@router.get("/payment-url")
async def get_payment_url(
    plan: str = "monthly",
    return_url: str = "cvpilot://payment-success",
    current_user: User = Depends(get_current_user),
):
    """Create a Razorpay Order and return the checkout URL."""
    if current_user.subscription == "pro":
        raise HTTPException(400, "Already on Pro plan")

    if plan not in PLAN_CONFIG:
        raise HTTPException(400, f"Invalid plan. Choose from: {', '.join(PLAN_CONFIG)}")

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(503, "Payment not configured")

    uid = str(current_user.id)
    config = PLAN_CONFIG[plan]
    order = await _create_order(uid, plan, config["amount"])

    params = urllib.parse.urlencode({
        "order_id": order["id"],
        "key": settings.RAZORPAY_KEY_ID,
        "uid": uid,
        "email": current_user.email or "",
        "name": current_user.name or "",
        "amount": config["amount"],
        "plan": plan,
        "return_url": return_url,
    })
    return {"url": f"https://kdaanalytics.com/cvproai/subscribe?{params}"}


# ── Webhook ───────────────────────────────────────────────────────────────────

@router.post("/razorpay-webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(500, "Webhook secret not configured")

    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid webhook signature")

    payload = json.loads(body)
    event = payload.get("event", "")

    if event == "payment.captured":
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = entity.get("notes", {})
        user_id = notes.get("user_id")
        plan = notes.get("plan", "monthly")
        if user_id:
            user = await db.get(User, user_id)
            if user:
                days = PLAN_CONFIG.get(plan, PLAN_CONFIG["monthly"])["days"]
                user.subscription = "pro"
                user.pro_expires_at = datetime.now(timezone.utc) + timedelta(days=days)
                await db.commit()

    return {"status": "ok"}


# ── Plan & usage endpoints ────────────────────────────────────────────────────

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
    trial = is_in_trial(current_user)
    result = {}

    for feature, monthly_limit in FREE_LIMITS.items():
        used = usage.get(feature, 0)
        if plan == "pro":
            result[feature] = {"used": used, "limit": None, "blocked": False}
        elif trial:
            result[feature] = {"used": used, "limit": None, "blocked": False}
        else:
            # Cap displayed used at the limit to avoid confusing "9/5" when
            # usage accumulated during the trial period within the same month.
            display_used = min(used, monthly_limit) if monthly_limit is not None else used
            blocked = monthly_limit is None
            result[feature] = {"used": display_used, "limit": monthly_limit, "blocked": blocked}

    return {
        "plan": plan,
        "is_trial": trial,
        "usage": result,
        "resume_uploads": features.get("resume_uploads"),
        "application_tracking": features.get("application_tracking"),
        "pro_expires_at": current_user.pro_expires_at.isoformat() if current_user.pro_expires_at else None,
    }


@router.post("/downgrade")
async def downgrade_to_free(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.subscription = "free"
    current_user.pro_expires_at = None
    current_user.razorpay_subscription_id = None
    await db.commit()
    return {"subscription": "free"}
