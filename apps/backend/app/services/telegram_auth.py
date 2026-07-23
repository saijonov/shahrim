"""Server-side validation of Telegram Mini App ``initData``.

Never trust the client: the Mini App sends the raw ``initData`` query string and
we verify its HMAC signature using the bot token, per Telegram's Web App spec:
https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

# Reject init data older than this to mitigate replay (Telegram includes auth_date).
MAX_AGE_SECONDS = 24 * 60 * 60


class InitDataError(Exception):
    """Raised when initData is malformed, unsigned, tampered with, or expired."""


@dataclass
class TelegramUser:
    id: int
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None


def validate_init_data(
    init_data: str, bot_token: str, max_age_seconds: int = MAX_AGE_SECONDS
) -> TelegramUser:
    if not bot_token:
        raise InitDataError("bot token not configured")

    try:
        pairs = dict(parse_qsl(init_data, strict_parsing=True))
    except ValueError as exc:
        raise InitDataError("malformed init data") from exc

    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise InitDataError("missing hash")

    data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise InitDataError("invalid hash")

    auth_date = pairs.get("auth_date")
    if auth_date is not None and max_age_seconds:
        try:
            age = time.time() - int(auth_date)
        except ValueError as exc:
            raise InitDataError("invalid auth_date") from exc
        if age > max_age_seconds:
            raise InitDataError("init data expired")

    user_raw = pairs.get("user")
    if not user_raw:
        raise InitDataError("missing user")
    try:
        user = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise InitDataError("invalid user json") from exc

    try:
        return TelegramUser(
            id=int(user["id"]),
            first_name=user.get("first_name"),
            last_name=user.get("last_name"),
            username=user.get("username"),
            photo_url=user.get("photo_url"),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise InitDataError("invalid user payload") from exc
