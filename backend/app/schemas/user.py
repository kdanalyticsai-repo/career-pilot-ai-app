import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str | None
    phone: str | None
    avatar_url: str | None
    role: str
    subscription: str
    onboarded: bool
    created_at: datetime
    trial_ends_at: datetime | None = None  # populated by the endpoint, not a DB column

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None


class UserPreferences(BaseModel):
    desired_roles: list[str] = []
    preferred_locations: list[str] = []
    remote_preference: str = "any"  # remote | hybrid | onsite | any
    min_salary: int | None = None
    job_types: list[str] = []
    industries: list[str] = []
    experience_level: str | None = None  # entry | mid | senior | lead | executive


class OnboardingCompleteRequest(BaseModel):
    name: str
    phone: str | None = None
    preferences: UserPreferences
    # provider-only fields (ignored for job seekers)
    company_name: str | None = None


class JobSeekerProfileResponse(BaseModel):
    experience_level: str | None
    work_style: str | None
    job_types: list | None
    preferred_locations: list | None
    min_salary: int | None
    desired_roles: list | None

    model_config = {"from_attributes": True}


class JobProviderProfileResponse(BaseModel):
    company_name: str | None
    company_size: str | None
    industry: str | None
    website: str | None

    model_config = {"from_attributes": True}


class ProviderProfileUpdateRequest(BaseModel):
    company_name: str | None = None
    company_size: str | None = None
    industry: str | None = None
    website: str | None = None
