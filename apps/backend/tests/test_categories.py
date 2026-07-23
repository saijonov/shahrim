from __future__ import annotations

from httpx import AsyncClient


async def test_list_categories(client: AsyncClient) -> None:
    resp = await client.get("/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 9
    codes = {c["code"] for c in data}
    assert {"road_damage", "garbage", "other"} <= codes
    for c in data:
        assert c["name_uz"]
