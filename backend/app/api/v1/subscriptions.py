from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.subscription_service import PLANS, get_all_usage, FREE_LIMITS

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


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

    # Build usage summary with limits
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


class UpgradeRequest(BaseModel):
    purchase_token: str | None = None  # Google Play purchase token
    platform: str = "android"


@router.post("/upgrade")
async def upgrade_to_pro(
    data: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upgrade user to Pro. Currently a placeholder — in production this would
    verify the Google Play purchase token before granting access.
    """
    if current_user.subscription == "pro":
        return {"subscription": "pro", "message": "Already on Pro plan"}

    # TODO: verify data.purchase_token with Google Play API before granting
    current_user.subscription = "pro"
    await db.commit()
    await db.refresh(current_user)

    return {
        "subscription": "pro",
        "message": "Upgraded to Pro successfully",
        "plan": PLANS["pro"],
    }


@router.post("/downgrade")
async def downgrade_to_free(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.subscription = "free"
    await db.commit()
    return {"subscription": "free"}
