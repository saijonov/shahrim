"""Telegram notifications on issue status changes (PRD §11), in Uzbek.

Sent via the Telegram Bot API from the backend process; failures are swallowed so
a status change is never blocked by a notification problem.
"""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings
from app.models import Issue, User

logger = logging.getLogger(__name__)

_STATUS_MESSAGES: dict[str, str] = {
    "submitted": "Murojaatingiz qabul qilindi ✅",
    "in_review": "Murojaatingiz ko'rib chiqilmoqda 👀",
    "in_progress": "Murojaatingiz ustida ish boshlandi 🛠",
    "resolved": "Muammo hal qilindi. Iltimos, bahoni bering ⭐️",
    "rejected": "Murojaatingiz rad etildi.",
}


def build_status_message(status: str, note: str | None = None) -> str:
    text = _STATUS_MESSAGES.get(status, "Murojaatingiz holati yangilandi.")
    if note:
        # Rejections (and any status) can carry a reason/note.
        text = f"{text}\nSabab: {note}" if status == "rejected" else f"{text}\n{note}"
    return text


async def send_telegram_message(chat_id: int, text: str) -> bool:
    token = settings.telegram_bot_token
    if not token:
        logger.info("Skipping notification — no bot token configured")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json={"chat_id": chat_id, "text": text})
            return resp.status_code == 200
    except Exception as exc:
        logger.warning("Telegram notification failed: %s", exc)
        return False


async def notify_status_change(
    user: User | None, issue: Issue, status: str, note: str | None = None
) -> bool:
    if user is None or user.telegram_id is None:
        return False
    return await send_telegram_message(user.telegram_id, build_status_message(status, note))
