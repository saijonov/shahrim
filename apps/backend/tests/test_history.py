from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.core.config import settings
from tests.helpers import build_init_data

BOT_TOKEN = "123456:TEST_BOT_TOKEN"


@pytest.fixture(autouse=True)
def _bot_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "telegram_bot_token", BOT_TOKEN)


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    init_data = build_init_data(BOT_TOKEN, {"id": 940555, "first_name": "Hist"})
    resp = await client.post("/auth/telegram", json={"init_data": init_data})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def _create_issue(client: AsyncClient, headers: dict[str, str], desc: str) -> int:
    payload = {
        "photo_url": None,
        "user_description": desc,
        "category_code": "garbage",
        "lat": 39.65,
        "lng": 66.96,
    }
    resp = await client.post("/issues", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


async def test_my_issues_and_detail(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    await _create_issue(client, auth_headers, "Muammo bir")
    last_id = await _create_issue(client, auth_headers, "Muammo ikki")

    mine = await client.get("/issues/mine", headers=auth_headers)
    assert mine.status_code == 200
    items = mine.json()
    assert len(items) >= 2
    assert items[0]["id"] >= items[1]["id"]  # newest first

    detail = await client.get(f"/issues/{last_id}", headers=auth_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == last_id
    assert body["user_description"] == "Muammo ikki"
    assert any(h["status"] == "submitted" for h in body["status_history"])
    assert body["resolution"] is None


async def test_detail_of_other_user_is_404(
    client: AsyncClient, auth_headers: dict[str, str]
) -> None:
    issue_id = await _create_issue(client, auth_headers, "Egasiniki")

    other_init = build_init_data(BOT_TOKEN, {"id": 940999, "first_name": "Boshqa"})
    other_resp = await client.post("/auth/telegram", json={"init_data": other_init})
    other_headers = {"Authorization": f"Bearer {other_resp.json()['access_token']}"}

    detail = await client.get(f"/issues/{issue_id}", headers=other_headers)
    assert detail.status_code == 404


async def test_mine_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/issues/mine")
    assert resp.status_code in (401, 403)
