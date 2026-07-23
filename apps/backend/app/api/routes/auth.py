from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token
from app.crud import user as user_crud
from app.db.session import get_session
from app.models import User
from app.schemas.auth import TelegramAuthRequest, TokenResponse
from app.schemas.user import UserOut
from app.services.telegram_auth import InitDataError, validate_init_data

router = APIRouter(tags=["auth"])


@router.post("/auth/telegram", response_model=TokenResponse)
async def auth_telegram(
    body: TelegramAuthRequest, session: AsyncSession = Depends(get_session)
) -> TokenResponse:
    try:
        tg = validate_init_data(body.init_data, settings.telegram_bot_token)
    except InitDataError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Telegram auth failed: {exc}",
        ) from exc

    user = await user_crud.upsert_from_telegram(session, tg)
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def read_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
