from __future__ import annotations

import base64
import json

from openai import AsyncOpenAI

from app.services.ai.base import AIProvider, AIProviderError, AnalysisResult, parse_analysis
from app.services.ai.prompts import SYSTEM_PROMPT, build_user_prompt


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
