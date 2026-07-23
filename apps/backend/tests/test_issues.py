from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, text

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import StatusHistory
from tests.helpers import build_init_data

BOT_TOKEN = "123456:TEST_BOT_TOKEN"


@pytest.fixture(autouse=True)
def _bot_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "telegram_bot_token", BOT_TOKEN)


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    init_data = build_init_data(BOT_TOKEN, {"id": 900123, "first_name": "Reporter"})
    resp = await client.post("/auth/telegram", json={"init_data": init_data})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_upload_then_create_issue(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    files = {"file": ("pothole.jpg", b"\xff\xd8\xff\xe0fake-jpeg-bytes", "image/jpeg")}
    up = await client.post("/uploads", files=files, headers=auth_headers)
    assert up.status_code == 200, up.text
    photo_url = up.json()["photo_url"]
    assert photo_url.startswith("/media/photos/")

    payload = {
        "photo_url": photo_url,
        "user_description": "Katta chuqur bor",
        "category_code": "road_damage",
        "lat": 39.6542,
        "lng": 66.9597,
    }
    resp = await client.post("/issues", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    issue = resp.json()
    assert issue["status"] == "submitted"
    assert issue["category_code"] == "road_damage"
    assert issue["user_description"] == "Katta chuqur bor"
    assert issue["lat"] == pytest.approx(39.6542)

    # PostGIS geometry was populated, and a status-history row recorded.
    issue_id = issue["id"]
    async with SessionLocal() as session:
        wkt = (
            await session.execute(
                text("SELECT ST_AsText(geom) FROM issues WHERE id = :id"), {"id": issue_id}
            )
        ).scalar()
        assert wkt is not None and "POINT" in wkt

        history = (
            (await session.execute(select(StatusHistory).where(StatusHistory.issue_id == issue_id)))
            .scalars()
            .all()
        )
        assert any(h.status == "submitted" for h in history)


async def test_create_issue_requires_auth(client: AsyncClient) -> None:
    payload = {"category_code": "other", "lat": 1.0, "lng": 1.0, "user_description": "x"}
    resp = await client.post("/issues", json=payload)
    assert resp.status_code in (401, 403)


async def test_upload_rejects_non_image(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    files = {"file": ("notes.txt", b"hello", "text/plain")}
    resp = await client.post("/uploads", files=files, headers=auth_headers)
    assert resp.status_code == 400


async def test_create_issue_rejects_bad_category(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    payload = {
        "photo_url": None,
        "user_description": "x",
        "category_code": "not_a_real_category",
        "lat": 39.65,
        "lng": 66.96,
    }
    resp = await client.post("/issues", json=payload, headers=auth_headers)
    assert resp.status_code == 422
