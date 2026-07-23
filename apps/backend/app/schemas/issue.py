from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class IssueCreate(BaseModel):
    photo_url: str | None = None
    user_description: str = ""
    category_code: str = "other"
    urgency: str | None = None
    lat: float | None = None
    lng: float | None = None
    address_text: str | None = None


class IssueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    photo_url: str | None
    ai_description: str | None
    user_description: str | None
    final_description: str | None
    category_code: str
    urgency: str | None
    status: str
    lat: float | None
    lng: float | None
    address_text: str | None
    district: str | None
    created_at: datetime
    updated_at: datetime
