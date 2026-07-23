from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.routes import auth as auth_routes
from app.api.routes import categories as category_routes
from app.api.routes import issues as issue_routes
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

app.include_router(auth_routes.router)
app.include_router(category_routes.router)
app.include_router(issue_routes.router)

# Serve uploaded photos (local storage). Created here so the mount succeeds at import.
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.upload_dir), name="media")


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": "Shahrim API", "status": "ok"}


@app.get("/health")
async def health(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    """Readiness probe — confirms the database is reachable."""
    await session.execute(text("SELECT 1"))
    return {"status": "ok"}
