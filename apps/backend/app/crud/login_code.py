from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LoginCode, User


async def bind_user(session: AsyncSession, nonce: str, user_id: int) -> None:
    """Bind a login nonce to a user (called by the bot after phone is shared)."""
    code = await session.get(LoginCode, nonce)
    if code is None:
        code = LoginCode(nonce=nonce, user_id=user_id)
        session.add(code)
    else:
        code.user_id = user_id
    await session.commit()


async def claim(session: AsyncSession, nonce: str) -> User | None:
    """Return the bound user for a nonce and consume it (one-time). None if unbound."""
    code = await session.get(LoginCode, nonce)
    if code is None or code.user_id is None:
        return None
    user = await session.get(User, code.user_id)
    await session.delete(code)
    await session.commit()
    return user
