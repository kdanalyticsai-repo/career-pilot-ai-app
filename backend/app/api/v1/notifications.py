import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.notification import PushToken, NotificationPreference
from app.services.notification_service import get_or_create_preferences

router = APIRouter(prefix="/notifications", tags=["notifications"])


class PushTokenRegister(BaseModel):
    token: str
    platform: str  # ios | android


class NotificationPreferenceUpdate(BaseModel):
    push_job_alerts: bool | None = None
    push_reminders: bool | None = None
    email_weekly_digest: bool | None = None
    email_status_changes: bool | None = None
    email_tips: bool | None = None


@router.post("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def register_push_token(
    data: PushTokenRegister,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(PushToken).where(PushToken.token == data.token)
    )
    token_obj = existing.scalar_one_or_none()

    if token_obj:
        token_obj.user_id = current_user.id
        token_obj.active = True
    else:
        db.add(PushToken(
            user_id=current_user.id,
            token=data.token,
            platform=data.platform,
        ))
    await db.commit()


@router.delete("/push-token", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_push_token(
    data: PushTokenRegister,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(PushToken).where(
            PushToken.user_id == current_user.id,
            PushToken.token == data.token,
        )
    )
    await db.commit()


@router.get("/preferences")
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pref = await get_or_create_preferences(db, current_user.id)
    return {
        "push_job_alerts": pref.push_job_alerts,
        "push_reminders": pref.push_reminders,
        "email_weekly_digest": pref.email_weekly_digest,
        "email_status_changes": pref.email_status_changes,
        "email_tips": pref.email_tips,
    }


@router.patch("/preferences")
async def update_preferences(
    data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pref = await get_or_create_preferences(db, current_user.id)

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(pref, field, value)

    await db.commit()
    await db.refresh(pref)

    return {
        "push_job_alerts": pref.push_job_alerts,
        "push_reminders": pref.push_reminders,
        "email_weekly_digest": pref.email_weekly_digest,
        "email_status_changes": pref.email_status_changes,
        "email_tips": pref.email_tips,
    }
