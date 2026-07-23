from __future__ import annotations

import pytest
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Issue, StatusHistory, User
from app.services import issue_status


async def test_change_status_records_history_and_notifies(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, str | None]] = []

    async def fake_notify(user, issue, status, note=None):  # noqa: ANN001
        calls.append((status, note))
        return True

    monkeypatch.setattr(issue_status, "notify_status_change", fake_notify)

    async with SessionLocal() as session:
        # telegram_id left null so the test is re-runnable against the persistent DB
        # (notify is mocked, so the id is irrelevant here).
        user = User(first_name="Test", role="citizen", language="uz")
        session.add(user)
        await session.flush()
        issue = Issue(user_id=user.id, status="submitted", category_code="other")
        session.add(issue)
        await session.commit()
        await session.refresh(issue)
        issue_id = issue.id

        await issue_status.change_issue_status(
            session,
            issue=issue,
            new_status="in_progress",
            changed_by=None,
            note="ish boshlandi",
        )
        assert issue.status == "in_progress"

    assert calls == [("in_progress", "ish boshlandi")]

    async with SessionLocal() as session:
        rows = (
            (await session.execute(select(StatusHistory).where(StatusHistory.issue_id == issue_id)))
            .scalars()
            .all()
        )
        assert any(h.status == "in_progress" for h in rows)
