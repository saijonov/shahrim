from __future__ import annotations

from datetime import datetime
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ai_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_code: Mapped[str] = mapped_column(
        ForeignKey("categories.code"),
        default="other",
        server_default="other",
        index=True,
        nullable=False,
    )
    urgency: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="submitted", server_default="submitted", index=True, nullable=False
    )
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    # PostGIS point (WGS84). The spatial GIST index is created explicitly in the migration.
    geom: Mapped[Any | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=True
    )
    address_text: Mapped[str | None] = mapped_column(String(512), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
