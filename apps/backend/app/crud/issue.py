from __future__ import annotations

from geoalchemy2.elements import WKTElement
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Issue, StatusHistory
from app.schemas.issue import IssueCreate


async def create_issue(session: AsyncSession, *, user_id: int, data: IssueCreate) -> Issue:
    geom = None
    if data.lat is not None and data.lng is not None:
        # PostGIS point is (lng lat) in WGS84.
        geom = WKTElement(f"POINT({data.lng} {data.lat})", srid=4326)

    description = data.user_description or None
    issue = Issue(
        user_id=user_id,
        photo_url=data.photo_url,
        user_description=description,
        final_description=description,
        category_code=data.category_code or "other",
        urgency=data.urgency,
        status="submitted",
        lat=data.lat,
        lng=data.lng,
        geom=geom,
        address_text=data.address_text,
    )
    session.add(issue)
    await session.flush()  # assign issue.id

    session.add(StatusHistory(issue_id=issue.id, status="submitted", changed_by=user_id, note=None))
    await session.commit()
    await session.refresh(issue)
    return issue
