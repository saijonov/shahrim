from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Issue, StatusHistory, User
from app.services.notifications import notify_status_change


async def change_issue_status(
    session: AsyncSession,
    *,
    issue: Issue,
    new_status: str,
    changed_by: int | None,
    note: str | None = None,
    notify: bool = True,
) -> Issue:
    """Update an issue's status, record a StatusHistory row, and notify the citizen."""
    issue.status = new_status
    session.add(
        StatusHistory(issue_id=issue.id, status=new_status, changed_by=changed_by, note=note)
    )
    await session.commit()
    await session.refresh(issue)

    if notify:
        user = await session.get(User, issue.user_id)
        await notify_status_change(user, issue, new_status, note)
    return issue
