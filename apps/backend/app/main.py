from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the local upload directory exists (Phase 2 storage).
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Shahrim API", version="0.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": "Shahrim API", "status": "ok"}


@app.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    """Readiness probe — confirms the database is reachable."""
    await session.execute(text("SELECT 1"))
    return {"status": "ok"}
