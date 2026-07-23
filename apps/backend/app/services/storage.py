"""Photo storage behind an interface. Phase 2 ships a local-filesystem backend;
swapping to S3 later is a single new implementation of ``Storage``."""

from __future__ import annotations

import os
import uuid
from abc import ABC, abstractmethod

from fastapi import UploadFile

from app.core.config import settings

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


class StorageError(Exception):
    """Raised for oversized or otherwise unsavable uploads."""


class Storage(ABC):
    @abstractmethod
    async def save(self, file: UploadFile, subdir: str = "photos") -> str:
        """Persist an upload and return a URL path (served under /media)."""

    @abstractmethod
    async def read(self, url: str) -> bytes:
        """Read back bytes for a URL previously returned by ``save``."""


class LocalStorage(Storage):
    def __init__(self, base_dir: str) -> None:
        self.base_dir = base_dir

    async def save(self, file: UploadFile, subdir: str = "photos") -> str:
        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise StorageError("Rasm hajmi juda katta (maksimum 10 MB)")

        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in _IMAGE_EXTS:
            ext = ".jpg"

        name = f"{uuid.uuid4().hex}{ext}"
        dest_dir = os.path.join(self.base_dir, subdir)
        os.makedirs(dest_dir, exist_ok=True)
        with open(os.path.join(dest_dir, name), "wb") as fh:
            fh.write(content)

        return f"/media/{subdir}/{name}"

    async def read(self, url: str) -> bytes:
        prefix = "/media/"
        if not url or not url.startswith(prefix):
            raise StorageError("invalid media url")
        base = os.path.abspath(self.base_dir)
        path = os.path.abspath(os.path.join(base, url[len(prefix) :]))
        if os.path.commonpath([base, path]) != base:
            raise StorageError("invalid path")
        if not os.path.exists(path):
            raise StorageError("file not found")
        with open(path, "rb") as fh:
            return fh.read()


def get_storage() -> Storage:
    """FastAPI dependency returning the configured storage backend."""
    return LocalStorage(settings.upload_dir)
