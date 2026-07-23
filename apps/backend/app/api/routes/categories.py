from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import category as category_crud
from app.db.session import get_session
from app.schemas.category import CategoryOut

router = APIRouter(tags=["categories"])


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(session: AsyncSession = Depends(get_session)) -> list[CategoryOut]:
    categories = await category_crud.list_categories(session)
    return [CategoryOut.model_validate(c) for c in categories]
