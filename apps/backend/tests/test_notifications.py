from __future__ import annotations

from app.services.notifications import build_status_message


def test_status_messages_are_uzbek() -> None:
    assert "qabul qilindi" in build_status_message("submitted")
    assert "ko'rib chiqilmoqda" in build_status_message("in_review")
    assert "ish boshlandi" in build_status_message("in_progress")
    assert "hal qilindi" in build_status_message("resolved")


def test_rejected_includes_reason() -> None:
    msg = build_status_message("rejected", "Hujjat yetarli emas")
    assert "rad etildi" in msg
    assert "Hujjat yetarli emas" in msg


def test_unknown_status_has_fallback() -> None:
    assert build_status_message("weird_status")
