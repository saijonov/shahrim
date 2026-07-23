from __future__ import annotations

import base64
import json

import httpx

from app.services.ai.base import AIProvider, AIProviderError, AnalysisResult, parse_analysis
from app.services.ai.prompts import SYSTEM_PROMPT, build_user_prompt

_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(AIProvider):
    """Google Gemini (AI Studio) vision provider via the REST API."""

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model

    async def analyze_image(self, image_bytes: bytes, *, categories: list[str]) -> AnalysisResult:
        prompt = f"{SYSTEM_PROMPT}\n\n{build_user_prompt(categories)}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": base64.b64encode(image_bytes).decode(),
                            }
                        },
                    ],
                }
            ],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
        }
        url = f"{_BASE_URL}/{self._model}:generateContent"

        last_error: Exception | None = None
        # Retry once on a parse failure (PRD §8 guardrail).
        for _ in range(2):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(
                        url, headers={"x-goog-api-key": self._api_key}, json=payload
                    )
                if resp.status_code != 200:
                    raise AIProviderError(f"Gemini HTTP {resp.status_code}: {resp.text[:200]}")
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return parse_analysis(text, categories)
            except json.JSONDecodeError as exc:
                last_error = exc
                continue
            except (KeyError, IndexError, TypeError) as exc:
                raise AIProviderError(f"Gemini response shape unexpected: {exc}") from exc
            except httpx.HTTPError as exc:
                raise AIProviderError(f"Gemini request failed: {exc}") from exc

        raise AIProviderError(f"Gemini response was not valid JSON: {last_error}")
