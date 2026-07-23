from __future__ import annotations

from pydantic import BaseModel

from app.schemas.user import UserOut


class TelegramAuthRequest(BaseModel):
    init_data: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
