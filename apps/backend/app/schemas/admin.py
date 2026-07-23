from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.issue import RatingOut, ResolutionOut, StatusHistoryOut


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str | None
    first_name: str | None
    role: str


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminOut


class AdminIssueOut(BaseModel):
    id: int
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
    reporter_name: str | None = None
    reporter_phone: str | None = None


class AdminIssueDetailOut(AdminIssueOut):
    status_history: list[StatusHistoryOut] = []
    resolution: ResolutionOut | None = None
    rating: RatingOut | None = None


class IssueListResponse(BaseModel):
    items: list[AdminIssueOut]
    total: int


class MapPoint(BaseModel):
    id: int
    lat: float
    lng: float
    urgency: str | None
    category_code: str
    status: str


class StatusChangeRequest(BaseModel):
    status: str
    note: str | None = None


class ResolveRequest(BaseModel):
    result_photo_url: str | None = None
    note: str | None = None


class CategoryCount(BaseModel):
    code: str
    name_uz: str
    count: int


class TrendPoint(BaseModel):
    date: str
    count: int


class AnalyticsOut(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: list[CategoryCount]
    avg_resolution_hours: float | None
    avg_rating: float | None
    trend: list[TrendPoint]
