import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.dependencies import get_db
from app.schemas.auth import (
    RegisterRequest, LoginRequest, GoogleAuthRequest,
    RefreshRequest, TokenResponse, MessageResponse, AdminLoginRequest,
)
from app.services.auth_service import AuthService
from app.services.email_service import send_welcome_email, send_password_reset_otp_email
from app.core.security import decode_refresh_token, create_access_token, create_refresh_token, hash_password
from app.config import settings
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if settings.ADMIN_EMAIL and data.email.lower() == settings.ADMIN_EMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This email address is reserved for admin use only. Please use a different email.",
        )
    service = AuthService(db)
    user, access_token, refresh_token = await service.register(data)
    await send_welcome_email(user.email, user.name or "", user.role)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(data: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Admin access is not configured")

    if data.email.lower() != settings.ADMIN_EMAIL.lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins are allowed to access this space")

    if data.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")

    service = AuthService(db)
    access_token, refresh_token = await service.upsert_admin(data.email)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    _, access_token, refresh_token = await service.login(data)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/google", response_model=TokenResponse)
async def google_login(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        user_info = google_id_token.verify_oauth2_token(
            data.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    service = AuthService(db)
    _, access_token, refresh_token = await service.google_login(user_info)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_refresh_token(data.refresh_token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    service = AuthService(db)
    user = await service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access_token = create_access_token(str(user.id))
    new_refresh_token = create_refresh_token(str(user.id))
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout():
    return MessageResponse(message="Logged out successfully")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    # Always return success to prevent email enumeration
    if not user or not user.hashed_password:
        return MessageResponse(message="If that email exists, a reset code has been sent.")

    otp = "".join(random.choices(string.digits, k=6))
    user.reset_otp = otp
    user.reset_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await db.commit()
    await send_password_reset_otp_email(user.email, user.name or "", otp)
    return MessageResponse(message="If that email exists, a reset code has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    if len(data.new_password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be at least 8 characters.")

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not user.reset_otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code.")

    now = datetime.now(timezone.utc)
    expires = user.reset_otp_expires_at
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if user.reset_otp != data.otp or not expires or now > expires:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code.")

    user.hashed_password = hash_password(data.new_password)
    user.reset_otp = None
    user.reset_otp_expires_at = None
    await db.commit()
    return MessageResponse(message="Password updated successfully.")
