from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AnalyzeRequest(BaseModel):
    photo_url: str


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


class StatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str
    note: str | None
    created_at: datetime


class ResolutionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    result_photo_url: str | None
    note: str | None
    resolved_at: datetime


class RatingCreate(BaseModel):
    stars: int = Field(ge=1, le=5)
    comment: str | None = None


class RatingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    stars: int
    comment: str | None
    created_at: datetime


class IssueDetailOut(IssueOut):
    status_history: list[StatusHistoryOut] = []
    resolution: ResolutionOut | None = None
    rating: RatingOut | None = None
