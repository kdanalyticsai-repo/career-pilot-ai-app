import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    name: str | None
    phone: str | None
    avatar_url: str | None
    subscription: str
    onboarded: bool
    created_at: datetime

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
