from __future__ import annotations

import json

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.core.config import settings
from app.services.ai import get_ai_provider
from app.services.ai.base import AnalysisResult, parse_analysis
from app.services.ai.gemini_provider import GeminiProvider
from app.services.ai.mock_provider import MockProvider
from app.services.ai.openai_provider import OpenAIProvider
from tests.helpers import build_init_data

BOT_TOKEN = "123456:TEST_BOT_TOKEN"
CODES = ["road_damage", "garbage", "other"]


# ---- parse_analysis guardrails ----


def test_parse_valid() -> None:
    raw = json.dumps(
        {
            "suggestions": ["Yo'lda chuqur bor", "Katta chuqur"],
            "category": "road_damage",
            "urgency": "high",
            "is_valid_city_issue": True,
        }
    )
    result = parse_analysis(raw, CODES)
    assert result.category == "road_damage"
    assert result.urgency == "high"
    assert len(result.suggestions) == 2
    assert result.is_valid_city_issue is True


def test_parse_coerces_unknown_category_and_urgency() -> None:
    raw = json.dumps(
        {
            "suggestions": ["x"],
            "category": "aliens",
            "urgency": "URGENT",
            "is_valid_city_issue": True,
        }
    )
    result = parse_analysis(raw, CODES)
    assert result.category == "other"
    assert result.urgency == "medium"


def test_parse_caps_suggestions_at_two() -> None:
    raw = json.dumps({"suggestions": ["a", "b", "c", "d"], "category": "garbage"})
    result = parse_analysis(raw, CODES)
    assert result.suggestions == ["a", "b"]


def test_parse_invalid_json_raises() -> None:
    with pytest.raises(json.JSONDecodeError):
        parse_analysis("not json at all", CODES)


# ---- providers / factory ----


async def test_mock_provider_returns_valid_result() -> None:
    provider = MockProvider()
    result = await provider.analyze_image(b"bytes", categories=CODES)
    assert isinstance(result, AnalysisResult)
    assert result.is_valid_city_issue is True
    assert result.category in CODES


def test_factory_uses_mock_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "openai_api_key", "")
    assert isinstance(get_ai_provider(), MockProvider)


def test_factory_uses_openai_with_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    assert isinstance(get_ai_provider(), OpenAIProvider)


def test_factory_prefers_gemini_when_set(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "gemini_api_key", "g-test")
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    assert isinstance(get_ai_provider(), GeminiProvider)


# ---- analyze endpoint (uses MockProvider since no key in tests) ----


@pytest.fixture(autouse=True)
def _bot_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "telegram_bot_token", BOT_TOKEN)
    monkeypatch.setattr(settings, "openai_api_key", "")
    monkeypatch.setattr(settings, "gemini_api_key", "")


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    init_data = build_init_data(BOT_TOKEN, {"id": 910222, "first_name": "Analyzer"})
    resp = await client.post("/auth/telegram", json={"init_data": init_data})
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def test_analyze_endpoint(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    files = {"file": ("p.jpg", b"\xff\xd8\xff\xe0bytes", "image/jpeg")}
    up = await client.post("/uploads", files=files, headers=auth_headers)
    photo_url = up.json()["photo_url"]

    resp = await client.post("/issues/analyze", json={"photo_url": photo_url}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "suggestions" in data
    assert data["category"] in {
        "road_damage",
        "garbage",
        "other",
        "street_light",
        "water_leak",
        "sewage",
        "damaged_sign",
        "fallen_tree",
        "public_transport",
    }
    assert data["urgency"] in {"low", "medium", "high"}
    assert isinstance(data["is_valid_city_issue"], bool)


async def test_analyze_missing_photo(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    resp = await client.post(
        "/issues/analyze", json={"photo_url": "/media/photos/nope.jpg"}, headers=auth_headers
    )
    assert resp.status_code == 400


async def test_analyze_requires_auth(client: AsyncClient) -> None:
    resp = await client.post("/issues/analyze", json={"photo_url": "/media/photos/x.jpg"})
    assert resp.status_code in (401, 403)
