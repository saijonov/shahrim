from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LoginCode(Base):
    """One-time nonce linking a native-app login attempt to a Telegram user.

    The app generates the nonce and opens the bot with it; once the user shares
    their phone, the bot binds the nonce to their user id; the app then exchanges
    the nonce for a session token.
    """

    __tablename__ = "login_codes"

    nonce: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
