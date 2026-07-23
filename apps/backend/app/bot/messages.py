"""Uzbek (Latin) strings for the Telegram bot. Centralised here (not inline) so
copy stays consistent and reviewable, mirroring the frontend i18n approach."""

from __future__ import annotations

UZ: dict[str, str] = {
    "welcome": (
        "Assalomu alaykum! Shahrim — shahringizdagi muammolarni bildirish uchun ilova. "
        "Boshlash uchun telefon raqamingizni ulashing."
    ),
    "share_phone": "📱 Telefon raqamini ulashish",
    "share_own_phone": "Iltimos, faqat o'zingizning telefon raqamingizni ulashing.",
    "phone_saved_open": "Rahmat! Endi ilovani ochishingiz mumkin.",
    "phone_saved_no_url": (
        "Rahmat! Raqamingiz qabul qilindi. Ilova havolasi tez orada tayyor bo'ladi."
    ),
    "open_app": "Shahrim'ni ochish",
    "return_to_app": "Rahmat! Endi Shahrim ilovasiga qayting — tizimga kirdingiz.",
    "welcome_back": "Xush kelibsiz! Ilovani quyidagi tugma orqali istalgan vaqtda oching.",
    "menu_button": "Shahrim",
}
