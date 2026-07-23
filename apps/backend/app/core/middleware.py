"""Lightweight, dependency-free middleware: per-IP rate limiting on abuse-prone
POST endpoints, and structured request logging (PRD §16)."""

from __future__ import annotations

import logging
import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

logger = logging.getLogger("shahrim.request")

# Exact POST paths to protect -> (max requests, window seconds), per client IP.
_LIMITS: dict[str, tuple[int, int]] = {
    "/issues": (30, 60),
    "/uploads": (30, 60),
    "/issues/analyze": (30, 60),
    "/auth/telegram": (20, 60),
    "/auth/native/exchange": (60, 60),
    "/admin/auth/login": (10, 60),
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app) -> None:  # noqa: ANN001
        super().__init__(app)
        self._hits: dict[tuple[str, str], list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        if not settings.rate_limit_enabled or request.method != "POST":
            return await call_next(request)

        conf = _LIMITS.get(request.url.path)
        if conf is None:
            return await call_next(request)

        limit, window = conf
        ip = request.client.host if request.client else "unknown"
        key = (ip, request.url.path)
        now = time.time()
        recent = [t for t in self._hits[key] if now - t < window]
        if len(recent) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Juda ko'p so'rov. Birozdan so'ng qayta urinib ko'ring."},
            )
        recent.append(now)
        self._hits[key] = recent
        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        start = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start) * 1000, 1)
        logger.info(
            "request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
