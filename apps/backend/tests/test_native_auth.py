from __future__ import annotations

from httpx import AsyncClient

from app.crud import login_code as login_code_crud
from app.db.session import SessionLocal
from app.models import LoginCode, User


async def test_exchange_unknown_nonce(client: AsyncClient) -> None:
    resp = await client.post("/auth/native/exchange", json={"nonce": "does-not-exist"})
    assert resp.status_code == 404


async def test_bind_then_exchange_is_one_time(client: AsyncClient) -> None:
    async with SessionLocal() as session:
        user = User(first_name="Native", role="citizen", language="uz")
        session.add(user)
        await session.flush()
        user_id = user.id
        await login_code_crud.bind_user(session, "nonce-abc", user_id)

    resp = await client.post("/auth/native/exchange", json={"nonce": "nonce-abc"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["access_token"]
    assert body["user"]["id"] == user_id

    # Consumed on first use.
    again = await client.post("/auth/native/exchange", json={"nonce": "nonce-abc"})
    assert again.status_code == 404


async def test_exchange_unbound_nonce_is_pending(client: AsyncClient) -> None:
    async with SessionLocal() as session:
        await session.merge(LoginCode(nonce="pending-xyz", user_id=None))
        await session.commit()

    resp = await client.post("/auth/native/exchange", json={"nonce": "pending-xyz"})
    assert resp.status_code == 404
