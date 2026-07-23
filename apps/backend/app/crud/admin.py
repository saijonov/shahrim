from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Category, Issue, Rating, Resolution, User

STATUSES = ["submitted", "in_review", "in_progress", "resolved", "rejected"]


async def get_admin_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email, User.role == "admin"))
    return result.scalar_one_or_none()


async def seed_admin(session: AsyncSession, email: str, password: str) -> User:
    """Create or update the admin account (idempotent)."""
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(email=email, first_name="Admin", role="admin", language="uz")
        session.add(user)
    user.role = "admin"
    user.password_hash = hash_password(password)
    await session.commit()
    await session.refresh(user)
    return user


def _apply_filters(stmt: Any, filters: dict[str, Any]) -> Any:
    if filters.get("status"):
        stmt = stmt.where(Issue.status == filters["status"])
    if filters.get("category"):
        stmt = stmt.where(Issue.category_code == filters["category"])
    if filters.get("urgency"):
        stmt = stmt.where(Issue.urgency == filters["urgency"])
    if filters.get("district"):
        stmt = stmt.where(Issue.district == filters["district"])
    if filters.get("date_from"):
        stmt = stmt.where(Issue.created_at >= filters["date_from"])
    if filters.get("date_to"):
        stmt = stmt.where(Issue.created_at <= filters["date_to"])
    return stmt


async def list_issues(
    session: AsyncSession, *, filters: dict[str, Any], limit: int, offset: int
) -> tuple[list[tuple[Issue, str | None, str | None]], int]:
    count_stmt = _apply_filters(select(func.count()).select_from(Issue), filters)
    total = await session.scalar(count_stmt) or 0

    stmt = _apply_filters(
        select(Issue, User.first_name, User.phone).join(User, User.id == Issue.user_id),
        filters,
    )
    stmt = stmt.order_by(Issue.created_at.desc(), Issue.id.desc()).limit(limit).offset(offset)
    rows = (await session.execute(stmt)).all()
    return [(row[0], row[1], row[2]) for row in rows], int(total)


async def issues_map(session: AsyncSession, *, filters: dict[str, Any]) -> list[dict[str, Any]]:
    stmt = select(
        Issue.id, Issue.lat, Issue.lng, Issue.urgency, Issue.category_code, Issue.status
    ).where(Issue.lat.isnot(None), Issue.lng.isnot(None))
    stmt = _apply_filters(stmt, filters)
    rows = (await session.execute(stmt)).all()
    return [
        {
            "id": r.id,
            "lat": r.lat,
            "lng": r.lng,
            "urgency": r.urgency,
            "category_code": r.category_code,
            "status": r.status,
        }
        for r in rows
    ]


async def analytics(session: AsyncSession) -> dict[str, Any]:
    total = await session.scalar(select(func.count()).select_from(Issue)) or 0

    by_status = dict.fromkeys(STATUSES, 0)
    for status, count in (
        await session.execute(select(Issue.status, func.count()).group_by(Issue.status))
    ).all():
        by_status[status] = count

    names = {c.code: c.name_uz for c in (await session.execute(select(Category))).scalars().all()}
    by_category = [
        {"code": code, "name_uz": names.get(code, code), "count": count}
        for code, count in (
            await session.execute(
                select(Issue.category_code, func.count())
                .group_by(Issue.category_code)
                .order_by(func.count().desc())
            )
        ).all()
    ]

    avg_seconds = await session.scalar(
        select(
            func.avg(
                func.extract("epoch", Resolution.resolved_at)
                - func.extract("epoch", Issue.created_at)
            )
        )
        .select_from(Resolution)
        .join(Issue, Issue.id == Resolution.issue_id)
    )
    avg_resolution_hours = round(float(avg_seconds) / 3600, 1) if avg_seconds is not None else None

    avg_rating_raw = await session.scalar(select(func.avg(Rating.stars)))
    avg_rating = round(float(avg_rating_raw), 2) if avg_rating_raw is not None else None

    since = datetime.now(UTC) - timedelta(days=30)
    day = func.date(Issue.created_at)
    trend = [
        {"date": str(d), "count": c}
        for d, c in (
            await session.execute(
                select(day, func.count())
                .where(Issue.created_at >= since)
                .group_by(day)
                .order_by(day)
            )
        ).all()
    ]

    return {
        "total": int(total),
        "by_status": by_status,
        "by_category": by_category,
        "avg_resolution_hours": avg_resolution_hours,
        "avg_rating": avg_rating,
        "trend": trend,
    }
