from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.core.config import settings
from app.crud.admin import seed_admin
from app.db.session import SessionLocal
from tests.helpers import build_init_data

BOT_TOKEN = "123456:TEST_BOT_TOKEN"
ADMIN_EMAIL = "rateadmin@shahrim.uz"
ADMIN_PASSWORD = "ratepass123"


@pytest.fixture(autouse=True)
def _env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "telegram_bot_token", BOT_TOKEN)

    async def _no_notify(user, issue, status, note=None):  # noqa: ANN001, ARG001
        return True

    monkeypatch.setattr("app.services.issue_status.notify_status_change", _no_notify)


@pytest_asyncio.fixture
async def citizen_headers(client: AsyncClient) -> dict[str, str]:
    init_data = build_init_data(BOT_TOKEN, {"id": 980321, "first_name": "Rater"})
    resp = await client.post("/auth/telegram", json={"init_data": init_data})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient) -> dict[str, str]:
    async with SessionLocal() as session:
        await seed_admin(session, ADMIN_EMAIL, ADMIN_PASSWORD)
    resp = await client.post(
        "/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _create(client: AsyncClient, headers: dict[str, str]) -> int:
    payload = {
        "photo_url": None,
        "user_description": "muammo",
        "category_code": "other",
        "lat": 39.6,
        "lng": 66.9,
    }
    resp = await client.post("/issues", json=payload, headers=headers)
    return resp.json()["id"]


async def _resolve(client: AsyncClient, admin_headers: dict[str, str], issue_id: int) -> None:
    resp = await client.post(
        f"/admin/issues/{issue_id}/resolve", json={"note": "done"}, headers=admin_headers
    )
    assert resp.status_code == 200, resp.text


async def test_rate_resolved_issue(
    client: AsyncClient, citizen_headers: dict[str, str], admin_headers: dict[str, str]
) -> None:
    issue_id = await _create(client, citizen_headers)

    early = await client.post(
        f"/issues/{issue_id}/rating", json={"stars": 5}, headers=citizen_headers
    )
    assert early.status_code == 400  # not resolved yet

    await _resolve(client, admin_headers, issue_id)

    rated = await client.post(
        f"/issues/{issue_id}/rating",
        json={"stars": 4, "comment": "Yaxshi bajarildi"},
        headers=citizen_headers,
    )
    assert rated.status_code == 200, rated.text
    assert rated.json()["stars"] == 4

    dup = await client.post(
        f"/issues/{issue_id}/rating", json={"stars": 3}, headers=citizen_headers
    )
    assert dup.status_code == 409  # one rating per issue

    detail = await client.get(f"/issues/{issue_id}", headers=citizen_headers)
    assert detail.json()["rating"]["stars"] == 4

    analytics = await client.get("/admin/analytics", headers=admin_headers)
    assert analytics.json()["avg_rating"] is not None


async def test_rate_requires_owner(
    client: AsyncClient, citizen_headers: dict[str, str], admin_headers: dict[str, str]
) -> None:
    issue_id = await _create(client, citizen_headers)
    await _resolve(client, admin_headers, issue_id)

    other_init = build_init_data(BOT_TOKEN, {"id": 980999, "first_name": "Boshqa"})
    other = await client.post("/auth/telegram", json={"init_data": other_init})
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    resp = await client.post(f"/issues/{issue_id}/rating", json={"stars": 5}, headers=other_headers)
    assert resp.status_code == 404


async def test_invalid_stars_rejected(
    client: AsyncClient, citizen_headers: dict[str, str], admin_headers: dict[str, str]
) -> None:
    issue_id = await _create(client, citizen_headers)
    await _resolve(client, admin_headers, issue_id)

    too_high = await client.post(
        f"/issues/{issue_id}/rating", json={"stars": 6}, headers=citizen_headers
    )
    assert too_high.status_code == 422
    too_low = await client.post(
        f"/issues/{issue_id}/rating", json={"stars": 0}, headers=citizen_headers
    )
    assert too_low.status_code == 422
