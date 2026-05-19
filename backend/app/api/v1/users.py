from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, get_current_active_user
from app.models.user import User
from app.models.profiles import JobSeekerProfile, JobProviderProfile
from app.schemas.user import (
    UserResponse, UserUpdate, OnboardingCompleteRequest,
    JobProviderProfileResponse, ProviderProfileUpdateRequest,
)
from app.services.email_service import send_profile_updated_email
from app.services.subscription_service import is_in_trial
from datetime import timedelta, timezone
from fastapi import status
import uuid

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    data = UserResponse.model_validate(current_user)
    if is_in_trial(current_user):
        created = current_user.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        data.trial_ends_at = created + timedelta(days=7)
    return data


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if data.name is not None:
        current_user.name = data.name
    if data.phone is not None:
        current_user.phone = data.phone
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url
    await db.commit()
    await db.refresh(current_user)
    await send_profile_updated_email(current_user.email, current_user.name or "")
    return current_user


@router.post("/me/onboarding", response_model=UserResponse)
async def complete_onboarding(
    data: OnboardingCompleteRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.name = data.name
    if data.phone:
        current_user.phone = data.phone
    current_user.onboarded = True

    if current_user.role == "job_provider":
        result = await db.execute(
            select(JobProviderProfile).where(JobProviderProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()
        if profile is None:
            profile = JobProviderProfile(id=uuid.uuid4(), user_id=current_user.id)
            db.add(profile)
        if data.company_name is not None:
            profile.company_name = data.company_name
    else:
        result = await db.execute(
            select(JobSeekerProfile).where(JobSeekerProfile.user_id == current_user.id)
        )
        profile = result.scalar_one_or_none()
        if profile is None:
            profile = JobSeekerProfile(id=uuid.uuid4(), user_id=current_user.id)
            db.add(profile)
        prefs = data.preferences
        profile.experience_level = prefs.experience_level
        profile.work_style = prefs.remote_preference
        profile.job_types = prefs.job_types
        profile.preferred_locations = prefs.preferred_locations
        profile.min_salary = prefs.min_salary
        profile.desired_roles = prefs.desired_roles

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/provider-profile", response_model=JobProviderProfileResponse)
async def get_provider_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobProviderProfile).where(JobProviderProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        return JobProviderProfileResponse(company_name=None, company_size=None, industry=None, website=None)
    return profile


@router.patch("/me/provider-profile", response_model=JobProviderProfileResponse)
async def update_provider_profile(
    data: ProviderProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobProviderProfile).where(JobProviderProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = JobProviderProfile(id=uuid.uuid4(), user_id=current_user.id)
        db.add(profile)
    if data.company_name is not None:
        profile.company_name = data.company_name
    if data.company_size is not None:
        profile.company_size = data.company_size
    if data.industry is not None:
        profile.industry = data.industry
    if data.website is not None:
        profile.website = data.website
    await db.commit()
    await db.refresh(profile)
    return profile


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    await db.delete(current_user)
    await db.commit()
