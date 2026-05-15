import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.notification import PushToken, NotificationPreference


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_notifications(tokens: list[str], title: str, body: str, data: dict | None = None) -> None:
    if not tokens:
        return

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
        }
        for token in tokens
        if token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")
    ]

    if not messages:
        return

    # Expo Push API accepts up to 100 messages per request
    for i in range(0, len(messages), 100):
        batch = messages[i : i + 100]
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    EXPO_PUSH_URL,
                    json=batch,
                    headers={"Content-Type": "application/json"},
                )
        except Exception:
            pass


async def get_user_push_tokens(db: AsyncSession, user_id) -> list[str]:
    result = await db.execute(
        select(PushToken.token).where(PushToken.user_id == user_id, PushToken.active == True)
    )
    return list(result.scalars().all())


async def get_or_create_preferences(db: AsyncSession, user_id) -> NotificationPreference:
    result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return pref
