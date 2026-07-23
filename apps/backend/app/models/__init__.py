"""ORM models. Importing this package registers every table on Base.metadata."""

from __future__ import annotations

from app.models.category import Category
from app.models.enums import IssueStatus, Role, Urgency
from app.models.issue import Issue
from app.models.login_code import LoginCode
from app.models.rating import Rating
from app.models.resolution import Resolution
from app.models.status_history import StatusHistory
from app.models.user import User

__all__ = [
    "Category",
    "Issue",
    "IssueStatus",
    "LoginCode",
    "Rating",
    "Resolution",
    "Role",
    "StatusHistory",
    "Urgency",
    "User",
]
