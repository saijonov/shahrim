"""Shared Uzbek vision prompt for all AI providers (OpenAI, Gemini).

Asks the model to return JSON-only with 1-2 Uzbek descriptions, a category code,
an urgency, and an is_valid_city_issue flag.
"""

from __future__ import annotations

SYSTEM_PROMPT = (
    "Sen O'zbekistondagi shahar kommunal xizmatlari uchun fuqarolar yuborgan "
    "ko'cha va jamoat joylaridagi muammolar suratlarini tahlil qiluvchi yordamchisan. "
    "Har doim faqat JSON qaytar, boshqa hech qanday matnsiz."
)


def build_user_prompt(categories: list[str]) -> str:
    codes = ", ".join(categories)
    return (
        "Ushbu suratni tahlil qil. Bu jamoat yoki shahar muammosimi "
        "(yo'l, yoritish, chiqindi, suv, kanalizatsiya, belgi, daraxt, "
        "jamoat transporti va h.k.)?\n"
        "Faqat quyidagi JSON formatida javob ber (boshqa matnsiz):\n"
        "{\n"
        '  "suggestions": ["<qisqa o\'zbekcha tavsif 1>", "<qisqa o\'zbekcha tavsif 2>"],\n'
        '  "category": "<kod>",\n'
        '  "urgency": "low | medium | high",\n'
        '  "is_valid_city_issue": true\n'
        "}\n"
        "Qoidalar:\n"
        "- suggestions: fuqaro yuborishi mumkin bo'lgan 1-2 ta qisqa, tabiiy o'zbekcha tavsif.\n"
        f"- category faqat shu kodlardan biri bo'lsin: {codes}.\n"
        "- Agar surat shahar muammosi bo'lmasa (masalan selfi, ovqat), "
        'is_valid_city_issue=false va category="other".\n'
        "- Barcha matn o'zbek (lotin) tilida bo'lsin."
    )
