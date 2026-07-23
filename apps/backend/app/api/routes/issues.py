from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.crud import category as category_crud
from app.crud import issue as issue_crud
from app.db.session import get_session
from app.models import Category, User
from app.schemas.issue import AnalyzeRequest, IssueCreate, IssueOut
from app.services.ai import AIProviderError, AnalysisResult, get_ai_provider
from app.services.storage import Storage, StorageError, get_storage

router = APIRouter(tags=["issues"])


@router.post("/uploads")
async def upload_photo(
    file: UploadFile = File(...),
    _current_user: User = Depends(get_current_user),
    storage: Storage = Depends(get_storage),
) -> dict[str, str]:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faqat rasm fayllari qabul qilinadi",
        )
    try:
        url = await storage.save(file, subdir="photos")
    except StorageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"photo_url": url}


@router.post("/issues/analyze", response_model=AnalysisResult)
async def analyze_issue_photo(
    body: AnalyzeRequest,
    _current_user: User = Depends(get_current_user),
    storage: Storage = Depends(get_storage),
    session: AsyncSession = Depends(get_session),
) -> AnalysisResult:
    categories = await category_crud.list_categories(session)
    codes = [c.code for c in categories]

    try:
        image_bytes = await storage.read(body.photo_url)
    except StorageError as exc:
        raise HTTPException(status_code=400, detail="Rasm topilmadi") from exc

    provider = get_ai_provider()
    try:
        result = await provider.analyze_image(image_bytes, categories=codes)
    except AIProviderError:
        # Never block reporting on an AI failure — return a safe, editable default.
        return AnalysisResult(
            suggestions=[], category="other", urgency="medium", is_valid_city_issue=True
        )

    if result.category not in codes:
        result.category = "other"
    return result


@router.post("/issues", response_model=IssueOut)
async def create_issue(
    body: IssueCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> IssueOut:
    category = await session.get(Category, body.category_code or "other")
    if category is None:
        raise HTTPException(status_code=422, detail="Noto'g'ri turkum")
    issue = await issue_crud.create_issue(session, user_id=current_user.id, data=body)
    return IssueOut.model_validate(issue)
