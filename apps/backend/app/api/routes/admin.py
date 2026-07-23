from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.security import create_access_token, verify_password
from app.crud import admin as admin_crud
from app.crud import issue as issue_crud
from app.db.session import get_session
from app.models import Issue, Resolution, User
from app.schemas.admin import (
    AdminIssueDetailOut,
    AdminIssueOut,
    AdminLoginRequest,
    AdminOut,
    AdminTokenResponse,
    AnalyticsOut,
    IssueListResponse,
    MapPoint,
    ResolveRequest,
    StatusChangeRequest,
)
from app.schemas.issue import ResolutionOut, StatusHistoryOut
from app.services.issue_status import change_issue_status

router = APIRouter(prefix="/admin", tags=["admin"])


def _issue_out(
    issue: Issue, reporter_name: str | None, reporter_phone: str | None
) -> AdminIssueOut:
    return AdminIssueOut(
        id=issue.id,
        photo_url=issue.photo_url,
        ai_description=issue.ai_description,
        user_description=issue.user_description,
        final_description=issue.final_description,
        category_code=issue.category_code,
        urgency=issue.urgency,
        status=issue.status,
        lat=issue.lat,
        lng=issue.lng,
        address_text=issue.address_text,
        district=issue.district,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        reporter_name=reporter_name,
        reporter_phone=reporter_phone,
    )


def _filters(
    status: str | None,
    category: str | None,
    urgency: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
    district: str | None,
) -> dict:
    return {
        "status": status,
        "category": category,
        "urgency": urgency,
        "date_from": date_from,
        "date_to": date_to,
        "district": district,
    }


@router.post("/auth/login", response_model=AdminTokenResponse)
async def admin_login(
    body: AdminLoginRequest, session: AsyncSession = Depends(get_session)
) -> AdminTokenResponse:
    admin = await admin_crud.get_admin_by_email(session, body.email)
    if (
        admin is None
        or not admin.password_hash
        or not verify_password(body.password, admin.password_hash)
    ):
        raise HTTPException(status_code=401, detail="Email yoki parol noto'g'ri")
    token = create_access_token(admin.id)
    return AdminTokenResponse(access_token=token, admin=AdminOut.model_validate(admin))


@router.get("/me", response_model=AdminOut)
async def admin_me(admin: User = Depends(get_current_admin)) -> AdminOut:
    return AdminOut.model_validate(admin)


@router.get("/issues/map", response_model=list[MapPoint])
async def admin_issues_map(
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
    status: str | None = Query(None),
    category: str | None = Query(None),
    urgency: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    district: str | None = Query(None),
) -> list[MapPoint]:
    points = await admin_crud.issues_map(
        session, filters=_filters(status, category, urgency, date_from, date_to, district)
    )
    return [MapPoint(**p) for p in points]


@router.get("/analytics", response_model=AnalyticsOut)
async def admin_analytics(
    admin: User = Depends(get_current_admin), session: AsyncSession = Depends(get_session)
) -> AnalyticsOut:
    return AnalyticsOut(**await admin_crud.analytics(session))


@router.get("/issues", response_model=IssueListResponse)
async def admin_list_issues(
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
    status: str | None = Query(None),
    category: str | None = Query(None),
    urgency: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    district: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> IssueListResponse:
    rows, total = await admin_crud.list_issues(
        session,
        filters=_filters(status, category, urgency, date_from, date_to, district),
        limit=limit,
        offset=offset,
    )
    items = [_issue_out(issue, name, phone) for issue, name, phone in rows]
    return IssueListResponse(items=items, total=total)


async def _detail(session: AsyncSession, issue: Issue) -> AdminIssueDetailOut:
    reporter = await session.get(User, issue.user_id)
    history = await issue_crud.get_status_history(session, issue.id)
    resolution = await issue_crud.get_resolution(session, issue.id)
    base = _issue_out(
        issue,
        reporter.first_name if reporter else None,
        reporter.phone if reporter else None,
    )
    return AdminIssueDetailOut(
        **base.model_dump(),
        status_history=[StatusHistoryOut.model_validate(h) for h in history],
        resolution=ResolutionOut.model_validate(resolution) if resolution else None,
    )


@router.get("/issues/{issue_id}", response_model=AdminIssueDetailOut)
async def admin_issue_detail(
    issue_id: int,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> AdminIssueDetailOut:
    issue = await session.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")
    return await _detail(session, issue)


async def _issue_response(session: AsyncSession, issue: Issue) -> AdminIssueOut:
    reporter = await session.get(User, issue.user_id)
    return _issue_out(
        issue,
        reporter.first_name if reporter else None,
        reporter.phone if reporter else None,
    )


@router.post("/issues/{issue_id}/status", response_model=AdminIssueOut)
async def admin_change_status(
    issue_id: int,
    body: StatusChangeRequest,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> AdminIssueOut:
    issue = await session.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")
    await change_issue_status(
        session, issue=issue, new_status=body.status, changed_by=admin.id, note=body.note
    )
    return await _issue_response(session, issue)


@router.post("/issues/{issue_id}/resolve", response_model=AdminIssueOut)
async def admin_resolve(
    issue_id: int,
    body: ResolveRequest,
    admin: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session),
) -> AdminIssueOut:
    issue = await session.get(Issue, issue_id)
    if issue is None:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")
    session.add(
        Resolution(
            issue_id=issue.id,
            admin_id=admin.id,
            result_photo_url=body.result_photo_url,
            note=body.note,
        )
    )
    await session.commit()
    await change_issue_status(
        session, issue=issue, new_status="resolved", changed_by=admin.id, note=body.note
    )
    return await _issue_response(session, issue)
