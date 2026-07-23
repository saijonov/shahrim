from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int | None
    first_name: str | None
    last_name: str | None
    username: str | None
    photo_url: str | None
    phone: str | None
    language: str
    role: str
