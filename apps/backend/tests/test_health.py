from __future__ import annotations

from httpx import AsyncClient


async def test_root(client: AsyncClient) -> None:
    resp = await client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_health_db_reachable(client: AsyncClient) -> None:
    """/health performs a real `SELECT 1`, so a green result proves DB connectivity."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
