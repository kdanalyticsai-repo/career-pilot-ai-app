from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.config import settings


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: RegisterRequest) -> tuple[User, str, str]:
        result = await self.db.execute(select(User).where(User.email == data.email))
        existing = result.scalar_one_or_none()
        if existing:
            if existing.role and existing.role != data.role:
                role_label = "Job Seeker" if existing.role == "job_seeker" else "Job Provider"
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This email is already registered as a {role_label}. One email cannot be used for both roles. Please sign in or use a different email.",
                )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered. Please sign in instead.")

        user = User(
            email=data.email,
            name=data.name,
            hashed_password=hash_password(data.password),
            role=data.role,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))
        return user, access_token, refresh_token

    async def login(self, data: LoginRequest) -> tuple[User, str, str]:
        result = await self.db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()

        if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))
        return user, access_token, refresh_token

    async def google_login(self, google_user_info: dict) -> tuple[User, str, str]:
        google_id = google_user_info["sub"]
        email = google_user_info["email"]

        result = await self.db.execute(select(User).where(User.google_id == google_id))
        user = result.scalar_one_or_none()

        if not user:
            result = await self.db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

        if user:
            if not user.google_id:
                user.google_id = google_id
                user.avatar_url = user.avatar_url or google_user_info.get("picture")
                await self.db.commit()
                await self.db.refresh(user)
        else:
            user = User(
                email=email,
                name=google_user_info.get("name"),
                google_id=google_id,
                avatar_url=google_user_info.get("picture"),
            )
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))
        return user, access_token, refresh_token

    async def upsert_admin(self, email: str) -> tuple[str, str]:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                email=email,
                name="Admin",
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role="admin",
                onboarded=True,
            )
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))
        return access_token, refresh_token

    async def get_user_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
