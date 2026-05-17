from datetime import datetime, timezone
from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Auto-downgrade if Pro subscription has expired
    if (
        user.subscription == "pro"
        and user.pro_expires_at is not None
        and user.pro_expires_at < datetime.now(timezone.utc)
    ):
        user.subscription = "free"
        user.razorpay_subscription_id = None
        await db.commit()

    return user


async def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    return user


async def require_pro(user: User = Depends(get_current_user)) -> User:
    """Dependency that blocks access unless the user is on the Pro plan."""
    if user.subscription != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "upgrade_required", "message": "This feature requires a Pro subscription"},
        )
    return user


def require_feature(feature: str):
    """
    Returns a FastAPI dependency that checks plan access + monthly usage limit
    for the given feature, then increments the counter on success.
    """
    async def _dep(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        from app.services.subscription_service import check_usage_limit, increment_usage
        allowed, reason = await check_usage_limit(db, current_user, feature)
        if not allowed:
            if reason == "upgrade_required":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"code": "upgrade_required", "message": "This feature requires a Pro subscription"},
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "monthly_limit_reached", "message": f"Monthly limit reached for {feature}"},
            )
        await increment_usage(db, current_user.id, feature)
        return current_user

    return _dep
