from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.services.telegram_auth import TelegramUser


async def get_by_telegram_id(session: AsyncSession, telegram_id: int) -> User | None:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    return result.scalar_one_or_none()


async def upsert_from_telegram(session: AsyncSession, tg: TelegramUser) -> User:
    """Create or update a citizen from validated Mini App initData.

    Refreshes profile fields but never clobbers a phone captured earlier by the bot.
    """
    user = await get_by_telegram_id(session, tg.id)
    if user is None:
        user = User(telegram_id=tg.id, role="citizen", language="uz")
        session.add(user)
    user.first_name = tg.first_name
    user.last_name = tg.last_name
    user.username = tg.username
    user.photo_url = tg.photo_url
    await session.commit()
    await session.refresh(user)
    return user


async def upsert_phone(
    session: AsyncSession,
    *,
    telegram_id: int,
    first_name: str | None,
    last_name: str | None,
    username: str | None,
    phone: str,
) -> User:
    """Create or update a user with a phone shared via the bot's contact button."""
    user = await get_by_telegram_id(session, telegram_id)
    if user is None:
        user = User(telegram_id=telegram_id, role="citizen", language="uz")
        session.add(user)
    user.first_name = first_name or user.first_name
    user.last_name = last_name or user.last_name
    user.username = username or user.username
    user.phone = phone
    await session.commit()
    await session.refresh(user)
    return user
