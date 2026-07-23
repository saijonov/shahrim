from __future__ import annotations

import time

import pytest

from app.services.telegram_auth import InitDataError, validate_init_data
from tests.helpers import build_init_data

BOT_TOKEN = "123456:TEST_BOT_TOKEN"


def test_valid_init_data_returns_user() -> None:
    init_data = build_init_data(
        BOT_TOKEN, {"id": 42, "first_name": "Ali", "username": "ali", "last_name": "Valiyev"}
    )
    tg = validate_init_data(init_data, BOT_TOKEN)
    assert tg.id == 42
    assert tg.first_name == "Ali"
    assert tg.last_name == "Valiyev"
    assert tg.username == "ali"


def test_tampered_hash_rejected() -> None:
    init_data = build_init_data(BOT_TOKEN, {"id": 42, "first_name": "Ali"})
    tampered = init_data[:-4] + ("dead" if not init_data.endswith("dead") else "beef")
    with pytest.raises(InitDataError):
        validate_init_data(tampered, BOT_TOKEN)


def test_wrong_bot_token_rejected() -> None:
    init_data = build_init_data(BOT_TOKEN, {"id": 1, "first_name": "X"})
    with pytest.raises(InitDataError):
        validate_init_data(init_data, "999999:OTHER_TOKEN")


def test_expired_init_data_rejected() -> None:
    old = int(time.time()) - 100_000
    init_data = build_init_data(BOT_TOKEN, {"id": 1, "first_name": "X"}, auth_date=old)
    with pytest.raises(InitDataError):
        validate_init_data(init_data, BOT_TOKEN, max_age_seconds=3600)


def test_missing_hash_rejected() -> None:
    with pytest.raises(InitDataError):
        validate_init_data("auth_date=1&user=%7B%22id%22%3A1%7D", BOT_TOKEN)


def test_missing_user_rejected() -> None:
    init_data = build_init_data(BOT_TOKEN, {}, include_user=False)
    with pytest.raises(InitDataError):
        validate_init_data(init_data, BOT_TOKEN)


def test_empty_bot_token_rejected() -> None:
    init_data = build_init_data(BOT_TOKEN, {"id": 1})
    with pytest.raises(InitDataError):
        validate_init_data(init_data, "")
