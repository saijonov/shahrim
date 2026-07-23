from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Rating


async def get_rating(session: AsyncSession, issue_id: int) -> Rating | None:
    result = await session.execute(select(Rating).where(Rating.issue_id == issue_id))
    return result.scalar_one_or_none()


async def create_rating(
    session: AsyncSession, *, issue_id: int, user_id: int, stars: int, comment: str | None
) -> Rating:
    rating = Rating(issue_id=issue_id, user_id=user_id, stars=stars, comment=comment)
    session.add(rating)
    await session.commit()
    await session.refresh(rating)
    return rating
