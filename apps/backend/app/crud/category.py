from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category


async def list_categories(session: AsyncSession) -> list[Category]:
    result = await session.execute(select(Category).order_by(Category.code))
    return list(result.scalars().all())
