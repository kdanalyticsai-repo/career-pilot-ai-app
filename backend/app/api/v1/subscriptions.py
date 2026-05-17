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
from app.services.subscription_service import PLANS, get_all_usage, FREE_LIMITS

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

SUBSCRIPTION_AMOUNT = 19900  # ₹199 in paise
SUBSCRIPTION_TOTAL_CYCLES = 120  # 10 years — effectively indefinite


def _razorpay_auth() -> str:
    return base64.b64encode(
        f"{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}".encode()
    ).decode()


async def _razorpay_post(path: str, payload: dict) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.razorpay.com/v1/{path}",
            headers={"Authorization": f"Basic {_razorpay_auth()}", "Content-Type": "application/json"},
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()


async def _ensure_plan() -> str:
    """Return RAZORPAY_PLAN_ID from config, or raise if not configured."""
    if not settings.RAZORPAY_PLAN_ID:
        raise HTTPException(
            503,
            "Razorpay plan not configured. Call POST /subscriptions/setup-plan first, "
            "then set RAZORPAY_PLAN_ID in environment variables.",
        )
    return settings.RAZORPAY_PLAN_ID


async def _create_subscription(plan_id: str, uid: str) -> str:
    """Create a Razorpay Subscription and return the subscription_id."""
    data = await _razorpay_post("subscriptions", {
        "plan_id": plan_id,
        "total_count": SUBSCRIPTION_TOTAL_CYCLES,
        "quantity": 1,
        "notes": {"user_id": uid, "plan": "pro"},
    })
    return data["id"]


# ── Admin endpoint to create the Razorpay plan once ──────────────────────────

@router.post("/setup-plan", include_in_schema=False)
async def setup_razorpay_plan(current_user: User = Depends(get_current_user)):
    """
    One-time setup: creates a ₹199/month Razorpay plan and returns the plan_id.
    Copy the plan_id to RAZORPAY_PLAN_ID in your environment variables.
    Only accessible to admin emails.
    """
    admin_emails = [e.strip() for e in (settings.ADMIN_EMAILS or "").split(",") if e.strip()]
    if current_user.email not in admin_emails:
        raise HTTPException(403, "Admin only")

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(503, "Razorpay keys not configured")

    plan = await _razorpay_post("plans", {
        "period": "monthly",
        "interval": 1,
        "item": {
            "name": "CVPilot Pro",
            "amount": SUBSCRIPTION_AMOUNT,
            "currency": "INR",
            "description": "CVPilot Pro — monthly subscription",
        },
        "notes": {"product": "cvpilot_pro"},
    })
    return {
        "plan_id": plan["id"],
        "message": f"Plan created. Set RAZORPAY_PLAN_ID={plan['id']} in your environment variables.",
    }


# ── Payment URL ───────────────────────────────────────────────────────────────

@router.get("/payment-url")
async def get_payment_url(current_user: User = Depends(get_current_user)):
    """Create a Razorpay Subscription, return the checkout URL."""
    if current_user.subscription == "pro":
        raise HTTPException(400, "Already on Pro plan")

    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(503, "Payment not configured")

    plan_id = await _ensure_plan()
    uid = str(current_user.id)
    subscription_id = await _create_subscription(plan_id, uid)

    params = urllib.parse.urlencode({
        "subscription_id": subscription_id,
        "key": settings.RAZORPAY_KEY_ID,
        "uid": uid,
        "email": current_user.email or "",
        "name": current_user.name or "",
        "amount": SUBSCRIPTION_AMOUNT,
    })
    return {"url": f"https://kdaanalytics.com/cvpilot/subscribe?{params}"}


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

    # ── payment.captured (one-time fallback / first charge) ───────────────────
    if event == "payment.captured":
        notes = (
            payload.get("payload", {})
            .get("payment", {})
            .get("entity", {})
            .get("notes", {})
        )
        user_id = notes.get("user_id")
        sub_id = (
            payload.get("payload", {})
            .get("payment", {})
            .get("entity", {})
            .get("subscription_id")
        )
        if user_id:
            user = await db.get(User, user_id)
            if user:
                user.subscription = "pro"
                user.pro_expires_at = datetime.now(timezone.utc) + timedelta(days=32)
                if sub_id:
                    user.razorpay_subscription_id = sub_id
                await db.commit()

    # ── subscription.charged (recurring monthly payment received) ─────────────
    elif event == "subscription.charged":
        entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        sub_id = entity.get("id")
        notes = entity.get("notes", {})
        user_id = notes.get("user_id")
        if user_id:
            user = await db.get(User, user_id)
            if user:
                user.subscription = "pro"
                user.pro_expires_at = datetime.now(timezone.utc) + timedelta(days=32)
                user.razorpay_subscription_id = sub_id
                await db.commit()

    # ── subscription.halted (payment failed after retries) ────────────────────
    elif event == "subscription.halted":
        entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        sub_id = entity.get("id")
        if sub_id:
            from sqlalchemy import select
            result = await db.execute(
                select(User).where(User.razorpay_subscription_id == sub_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user.subscription = "free"
                user.pro_expires_at = None
                user.razorpay_subscription_id = None
                await db.commit()

    # ── subscription.cancelled / subscription.completed ───────────────────────
    # Let pro_expires_at expire naturally — user keeps Pro until the paid period ends
    elif event in ("subscription.cancelled", "subscription.completed"):
        pass  # auto-downgrade handles this via pro_expires_at check in get_current_user

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
    result = {}

    for feature, monthly_limit in FREE_LIMITS.items():
        used = usage.get(feature, 0)
        if plan == "pro":
            result[feature] = {"used": used, "limit": None, "blocked": False}
        else:
            blocked = monthly_limit is None
            result[feature] = {"used": used, "limit": monthly_limit, "blocked": blocked}

    return {
        "plan": plan,
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
