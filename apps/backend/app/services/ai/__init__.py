"""AI pipeline. `get_ai_provider()` returns the OpenAI provider when a key is set,
otherwise a mock so the flow works with no key (and AI failures never block a report)."""

from __future__ import annotations

from app.core.config import settings
from app.services.ai.base import AIProvider, AIProviderError, AnalysisResult
from app.services.ai.mock_provider import MockProvider
from app.services.ai.openai_provider import OpenAIProvider

__all__ = ["AIProvider", "AIProviderError", "AnalysisResult", "get_ai_provider"]


def get_ai_provider() -> AIProvider:
    if settings.openai_api_key:
        return OpenAIProvider(settings.openai_api_key, settings.openai_model)
    return MockProvider()
