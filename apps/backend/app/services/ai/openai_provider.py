from __future__ import annotations

import base64
import json

from openai import AsyncOpenAI

from app.services.ai.base import AIProvider, AIProviderError, AnalysisResult, parse_analysis

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


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str) -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def analyze_image(self, image_bytes: bytes, *, categories: list[str]) -> AnalysisResult:
        data_url = "data:image/jpeg;base64," + base64.b64encode(image_bytes).decode()
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": build_user_prompt(categories)},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ]

        last_error: Exception | None = None
        # Retry once on a parse failure (PRD §8 guardrail).
        for _ in range(2):
            try:
                resp = await self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=400,
                )
                raw = resp.choices[0].message.content or "{}"
                return parse_analysis(raw, categories)
            except json.JSONDecodeError as exc:
                last_error = exc
                continue
            except Exception as exc:  # network/auth/rate-limit — do not retry, fall back
                raise AIProviderError(f"AI request failed: {exc}") from exc

        raise AIProviderError(f"AI response was not valid JSON: {last_error}")
