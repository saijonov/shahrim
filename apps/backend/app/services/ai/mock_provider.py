from __future__ import annotations

from app.services.ai.base import AIProvider, AnalysisResult


class MockProvider(AIProvider):
    """Used when no OpenAI key is configured. Lets the whole flow work in dev and
    tests without any external call. Returns a neutral, valid, Uzbek result."""

    async def analyze_image(self, image_bytes: bytes, *, categories: list[str]) -> AnalysisResult:
        return AnalysisResult(
            suggestions=[
                "Ko'chadagi muammo suratga olindi",
                "Iltimos, tegishli xizmat ko'rib chiqsin",
            ],
            category="other",
            urgency="medium",
            is_valid_city_issue=True,
        )
