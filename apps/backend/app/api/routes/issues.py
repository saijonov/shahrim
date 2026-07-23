from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.crud import category as category_crud
from app.crud import issue as issue_crud
from app.crud import rating as rating_crud
from app.db.session import get_session
from app.models import Category, User
from app.schemas.issue import (
    AnalyzeRequest,
    IssueCreate,
    IssueDetailOut,
    IssueOut,
    RatingCreate,
    RatingOut,
    ResolutionOut,
    StatusHistoryOut,
)
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


@router.get("/issues/mine", response_model=list[IssueOut])
async def list_my_issues(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[IssueOut]:
    issues = await issue_crud.list_my_issues(session, current_user.id)
    return [IssueOut.model_validate(i) for i in issues]


@router.get("/issues/{issue_id}", response_model=IssueDetailOut)
async def get_issue_detail(
    issue_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> IssueDetailOut:
    issue = await issue_crud.get_issue(session, issue_id)
    if issue is None or issue.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")

    history = await issue_crud.get_status_history(session, issue_id)
    resolution = await issue_crud.get_resolution(session, issue_id)
    rating = await rating_crud.get_rating(session, issue_id)

    return IssueDetailOut(
        **IssueOut.model_validate(issue).model_dump(),
        status_history=[StatusHistoryOut.model_validate(h) for h in history],
        resolution=ResolutionOut.model_validate(resolution) if resolution else None,
        rating=RatingOut.model_validate(rating) if rating else None,
    )


@router.post("/issues/{issue_id}/rating", response_model=RatingOut)
async def rate_issue(
    issue_id: int,
    body: RatingCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> RatingOut:
    issue = await issue_crud.get_issue(session, issue_id)
    if issue is None or issue.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Murojaat topilmadi")
    if issue.status != "resolved":
        raise HTTPException(status_code=400, detail="Faqat hal qilingan murojaatni baholash mumkin")
    if await rating_crud.get_rating(session, issue_id) is not None:
        raise HTTPException(status_code=409, detail="Bu murojaat allaqachon baholangan")

    rating = await rating_crud.create_rating(
        session,
        issue_id=issue_id,
        user_id=current_user.id,
        stars=body.stars,
        comment=body.comment,
    )
    return RatingOut.model_validate(rating)
