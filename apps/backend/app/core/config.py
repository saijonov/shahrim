from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, populated from environment variables (see .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 43200  # 30 days

    # Database (psycopg3 driver — works for both async app engine and sync Alembic).
    database_url: str = "postgresql+psycopg://shahrim:shahrim@db:5432/shahrim"

    # Storage (Phase 2) — local filesystem behind a Storage interface.
    upload_dir: str = "/app/uploads"
    public_base_url: str = "http://localhost:8000"

    # CORS — comma-separated list of allowed origins.
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    # Telegram (Phase 1)
    telegram_bot_token: str = ""
    miniapp_url: str = ""

    # AI / OpenAI (Phase 3)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # AI / Google Gemini (AI Studio) — preferred when set.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"

    # Admin portal (Phase 5) — an admin account is seeded on startup if both are set.
    admin_email: str = ""
    admin_password: str = ""

    # Rate limiting (Phase 8) — disabled in the test suite.
    rate_limit_enabled: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
