from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.core.config import settings
from app.crud.admin import seed_admin
from app.db.session import SessionLocal
from tests.helpers import build_init_data

BOT_TOKEN = "123456:TEST_BOT_TOKEN"
ADMIN_EMAIL = "admintest@shahrim.uz"
ADMIN_PASSWORD = "adminpass123"


@pytest.fixture(autouse=True)
def _env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "telegram_bot_token", BOT_TOKEN)

    async def _no_notify(user, issue, status, note=None):  # noqa: ANN001
        return True

    # Don't hit Telegram during resolve/status tests.
    monkeypatch.setattr("app.services.issue_status.notify_status_change", _no_notify)


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient) -> dict[str, str]:
    async with SessionLocal() as session:
        await seed_admin(session, ADMIN_EMAIL, ADMIN_PASSWORD)
    resp = await client.post(
        "/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest_asyncio.fixture
async def citizen_headers(client: AsyncClient) -> dict[str, str]:
    init_data = build_init_data(BOT_TOKEN, {"id": 970111, "first_name": "Fuqaro"})
    resp = await client.post("/auth/telegram", json={"init_data": init_data})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _make_issue(client: AsyncClient, citizen_headers: dict[str, str]) -> int:
    payload = {
        "photo_url": "/media/photos/x.jpg",
        "user_description": "Test muammo",
        "category_code": "road_damage",
        "lat": 39.65,
        "lng": 66.96,
    }
    resp = await client.post("/issues", json=payload, headers=citizen_headers)
    return resp.json()["id"]


async def test_login_and_me(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    me = await client.get("/admin/me", headers=admin_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "admin"
    assert me.json()["email"] == ADMIN_EMAIL


async def test_login_wrong_password(client: AsyncClient, admin_headers: dict[str, str]) -> None:
    resp = await client.post("/admin/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert resp.status_code == 401


async def test_citizen_cannot_access_admin(
    client: AsyncClient, citizen_headers: dict[str, str]
) -> None:
    resp = await client.get("/admin/me", headers=citizen_headers)
    assert resp.status_code == 403


async def test_admin_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/admin/issues")
    assert resp.status_code in (401, 403)


async def test_list_issues_and_filter(
    client: AsyncClient, admin_headers: dict[str, str], citizen_headers: dict[str, str]
) -> None:
    await _make_issue(client, citizen_headers)

    resp = await client.get("/admin/issues", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert len(body["items"]) >= 1
    assert "reporter_name" in body["items"][0]

    filtered = await client.get(
        "/admin/issues", params={"category": "road_damage"}, headers=admin_headers
    )
    assert filtered.status_code == 200
    assert all(i["category_code"] == "road_damage" for i in filtered.json()["items"])


async def test_map_and_analytics(
    client: AsyncClient, admin_headers: dict[str, str], citizen_headers: dict[str, str]
) -> None:
    await _make_issue(client, citizen_headers)

    points = await client.get("/admin/issues/map", headers=admin_headers)
    assert points.status_code == 200
    assert isinstance(points.json(), list)
    assert all("lat" in p and "lng" in p for p in points.json())

    analytics = await client.get("/admin/analytics", headers=admin_headers)
    assert analytics.status_code == 200
    data = analytics.json()
    assert "by_status" in data and "by_category" in data
    assert data["total"] >= 1
    assert "trend" in data


async def test_change_status_and_resolve(
    client: AsyncClient, admin_headers: dict[str, str], citizen_headers: dict[str, str]
) -> None:
    issue_id = await _make_issue(client, citizen_headers)

    changed = await client.post(
        f"/admin/issues/{issue_id}/status",
        json={"status": "in_progress", "note": "Ish boshlandi"},
        headers=admin_headers,
    )
    assert changed.status_code == 200
    assert changed.json()["status"] == "in_progress"

    resolved = await client.post(
        f"/admin/issues/{issue_id}/resolve",
        json={"result_photo_url": "/media/photos/result.jpg", "note": "Tuzatildi"},
        headers=admin_headers,
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"

    detail = await client.get(f"/admin/issues/{issue_id}", headers=admin_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["resolution"] is not None
    assert body["resolution"]["result_photo_url"] == "/media/photos/result.jpg"
    assert any(h["status"] == "resolved" for h in body["status_history"])
