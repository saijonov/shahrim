FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# uv for fast, reproducible installs (psycopg[binary] bundles libpq — no apt build deps needed)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Install dependencies first (better layer caching). Copy only project metadata,
# then the source; a bind mount overrides /app in dev so live edits reload.
COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY tests ./tests
COPY entrypoint.sh ./

RUN uv pip install --system --no-cache ".[dev]"

EXPOSE 8000

CMD ["sh", "./entrypoint.sh"]
