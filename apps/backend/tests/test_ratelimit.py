from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.fixture(autouse=True)
def _enable_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "rate_limit_enabled", True)


async def test_login_endpoint_is_rate_limited(client: AsyncClient) -> None:
    # /admin/auth/login is capped at 10/min per IP; bad creds otherwise 401.
    statuses = []
    for _ in range(15):
        resp = await client.post("/admin/auth/login", json={"email": "x@y.z", "password": "nope"})
        statuses.append(resp.status_code)
    assert 429 in statuses
    # The first several are the normal 401 (auth failure), not 429.
    assert statuses[0] == 401
