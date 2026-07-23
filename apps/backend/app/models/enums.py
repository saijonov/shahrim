from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    citizen = "citizen"
    admin = "admin"


class Urgency(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class IssueStatus(StrEnum):
    submitted = "submitted"
    in_review = "in_review"
    in_progress = "in_progress"
    resolved = "resolved"
    rejected = "rejected"
