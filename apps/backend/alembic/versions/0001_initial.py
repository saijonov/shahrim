"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-23

Creates the full Shahrim data model (PRD §10) with PostGIS geometry on issues,
and seeds the 9 categories (PRD §9).
"""

from __future__ import annotations

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (code, name_uz, icon) — PRD §9. icon points at the placeholder SVG basename in assets/.
CATEGORIES: list[tuple[str, str, str]] = [
    ("road_damage", "Yo'l shikasti", "road_damage"),
    ("street_light", "Ko'cha yoritilishi", "street_light"),
    ("garbage", "Chiqindi / axlat", "garbage"),
    ("water_leak", "Suv oqishi / quvur", "water_leak"),
    ("sewage", "Kanalizatsiya", "sewage"),
    ("damaged_sign", "Shikastlangan belgi", "damaged_sign"),
    ("fallen_tree", "Yiqilgan daraxt / shox", "fallen_tree"),
    ("public_transport", "Jamoat transporti", "public_transport"),
    ("other", "Boshqa", "other"),
]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # --- categories (reference data) ---
    op.create_table(
        "categories",
        sa.Column("code", sa.String(50), primary_key=True),
        sa.Column("name_uz", sa.String(120), nullable=False),
        sa.Column("icon", sa.String(120), nullable=True),
    )
    categories_tbl = sa.table(
        "categories",
        sa.column("code", sa.String),
        sa.column("name_uz", sa.String),
        sa.column("icon", sa.String),
    )
    op.bulk_insert(
        categories_tbl,
        [{"code": c, "name_uz": n, "icon": i} for c, n, i in CATEGORIES],
    )

    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("telegram_id", sa.BigInteger, nullable=True),
        sa.Column("first_name", sa.String(120), nullable=True),
        sa.Column("last_name", sa.String(120), nullable=True),
        sa.Column("username", sa.String(120), nullable=True),
        sa.Column("photo_url", sa.String(512), nullable=True),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("language", sa.String(8), server_default="uz", nullable=False),
        sa.Column("role", sa.String(20), server_default="citizen", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_unique_constraint("uq_users_telegram_id", "users", ["telegram_id"])
    op.create_unique_constraint("uq_users_email", "users", ["email"])
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"])

    # --- issues (with PostGIS point) ---
    op.create_table(
        "issues",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("photo_url", sa.String(512), nullable=True),
        sa.Column("ai_description", sa.Text, nullable=True),
        sa.Column("user_description", sa.Text, nullable=True),
        sa.Column("final_description", sa.Text, nullable=True),
        sa.Column(
            "category_code",
            sa.String(50),
            sa.ForeignKey("categories.code"),
            server_default="other",
            nullable=False,
        ),
        sa.Column("urgency", sa.String(10), nullable=True),
        sa.Column("status", sa.String(20), server_default="submitted", nullable=False),
        sa.Column("lat", sa.Float, nullable=True),
        sa.Column("lng", sa.Float, nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("address_text", sa.String(512), nullable=True),
        sa.Column("district", sa.String(120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_issues_user_id", "issues", ["user_id"])
    op.create_index("ix_issues_category_code", "issues", ["category_code"])
    op.create_index("ix_issues_status", "issues", ["status"])
    op.create_index("ix_issues_district", "issues", ["district"])
    op.execute("CREATE INDEX ix_issues_geom ON issues USING GIST (geom)")

    # --- resolutions ---
    op.create_table(
        "resolutions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "issue_id",
            sa.Integer,
            sa.ForeignKey("issues.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "admin_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("result_photo_url", sa.String(512), nullable=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column(
            "resolved_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_resolutions_issue_id", "resolutions", ["issue_id"])

    # --- ratings ---
    op.create_table(
        "ratings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "issue_id",
            sa.Integer,
            sa.ForeignKey("issues.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stars", sa.SmallInteger, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("stars >= 1 AND stars <= 5", name="ck_ratings_stars_range"),
        sa.UniqueConstraint("issue_id", name="uq_ratings_issue_id"),
    )

    # --- status_history ---
    op.create_table(
        "status_history",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "issue_id",
            sa.Integer,
            sa.ForeignKey("issues.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column(
            "changed_by",
            sa.Integer,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_status_history_issue_id", "status_history", ["issue_id"])


def downgrade() -> None:
    op.drop_table("status_history")
    op.drop_table("ratings")
    op.drop_table("resolutions")
    op.execute("DROP INDEX IF EXISTS ix_issues_geom")
    op.drop_table("issues")
    op.drop_table("users")
    op.drop_table("categories")
