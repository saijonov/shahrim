from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings
from tests.helpers import build_init_data

BOT_TOKEN = "123456:TEST_BOT_TOKEN"


@pytest.fixture(autouse=True)
def _set_bot_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "telegram_bot_token", BOT_TOKEN)


async def test_auth_telegram_creates_user_then_me_works(client: AsyncClient) -> None:
    init_data = build_init_data(
        BOT_TOKEN, {"id": 777001, "first_name": "Dilnoza", "username": "dilnoza"}
    )
    resp = await client.post("/auth/telegram", json={"init_data": init_data})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["telegram_id"] == 777001
    assert body["user"]["first_name"] == "Dilnoza"
    assert body["user"]["role"] == "citizen"

    token = body["access_token"]
    me_resp = await client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["telegram_id"] == 777001


async def test_auth_telegram_rejects_bad_hash(client: AsyncClient) -> None:
    resp = await client.post(
        "/auth/telegram",
        json={"init_data": "user=%7B%22id%22%3A1%7D&auth_date=1&hash=deadbeef"},
    )
    assert resp.status_code == 401


async def test_me_requires_token(client: AsyncClient) -> None:
    resp = await client.get("/me")
    assert resp.status_code in (401, 403)


async def test_me_rejects_garbage_token(client: AsyncClient) -> None:
    resp = await client.get("/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401
