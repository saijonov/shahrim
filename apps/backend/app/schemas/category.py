from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name_uz: str
    icon: str | None
