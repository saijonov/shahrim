"""AI provider interface + shared result parsing/guardrails.

The provider is pluggable (PRD §8): OpenAI GPT-4o vision by default, a mock when no
key is configured. Parsing is centralised here so every provider gets the same
validation and safe coercion.
"""

from __future__ import annotations

import json
from abc import ABC, abstractmethod

from pydantic import BaseModel

VALID_URGENCIES = ("low", "medium", "high")


class AnalysisResult(BaseModel):
    suggestions: list[str] = []
    category: str = "other"
    urgency: str = "medium"
    is_valid_city_issue: bool = True


class AIProviderError(Exception):
    """Raised when the provider cannot produce a usable result (never blocks reporting)."""


class AIProvider(ABC):
    @abstractmethod
    async def analyze_image(self, image_bytes: bytes, *, categories: list[str]) -> AnalysisResult:
        """Return suggestions/category/urgency/validity for a city-issue photo."""


def parse_analysis(raw: str, valid_codes: list[str]) -> AnalysisResult:
    """Parse the model's JSON reply, coercing anything out-of-range to safe defaults.

    Raises json.JSONDecodeError if the text is not valid JSON (caller may retry).
    """
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise json.JSONDecodeError("expected object", raw, 0)

    suggestions_raw = data.get("suggestions") or []
    if isinstance(suggestions_raw, str):
        suggestions_raw = [suggestions_raw]
    suggestions = [str(s).strip() for s in suggestions_raw if str(s).strip()][:2]

    category = str(data.get("category") or "other")
    if category not in valid_codes:
        category = "other"

    urgency = str(data.get("urgency") or "medium").lower()
    if urgency not in VALID_URGENCIES:
        urgency = "medium"

    is_valid = bool(data.get("is_valid_city_issue", True))

    return AnalysisResult(
        suggestions=suggestions,
        category=category,
        urgency=urgency,
        is_valid_city_issue=is_valid,
    )
