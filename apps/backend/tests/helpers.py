from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import urlencode


def build_init_data(
    bot_token: str, user: dict, auth_date: int | None = None, include_user: bool = True
) -> str:
    """Build a correctly-signed Telegram Mini App initData string for tests."""
    if auth_date is None:
        auth_date = int(time.time())

    fields: dict[str, str] = {"auth_date": str(auth_date), "query_id": "AAHtest"}
    if include_user:
        fields["user"] = json.dumps(user, separators=(",", ":"))

    data_check_string = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return urlencode(fields)
