# Progress

Tracking the phased build of Shahrim. Each phase ends with: tests written + passing, manual end-to-end check, this file updated, and a commit + push.

Legend: ⬜ not started · 🟡 in progress · ✅ done

## Phase status

| Phase | Description | Status |
|---|---|---|
| 0 | Foundation (repo, tooling, DB + migrations, health, assets, CI) | ✅ |
| 1 | Telegram auth + user | ⬜ |
| 2 | Report flow (no AI) | ⬜ |
| 3 | AI pipeline (OpenAI GPT-4o vision) | ⬜ |
| 4 | My reports + statuses + notifications | ⬜ |
| 5 | Admin portal (map, filters, analytics, resolve) | ⬜ |
| 6 | Rating | ⬜ |
| 7 | Native app (Expo) | ⬜ |
| 8 | Polish & hardening | ⬜ |

---

## Phase 0 — Foundation

**Goal:** a running skeleton — `docker compose up` starts backend + PostGIS; `GET /health` returns OK with the DB reachable; the full data model exists via an Alembic migration; the 9 categories are seeded; one test passes; lint is clean; CI is green; placeholder assets + `ASSETS.md` exist.

### Log
- Scaffolded the pnpm + Turborepo monorepo (`apps/`, `packages/`), backend (FastAPI async + SQLAlchemy 2.0 + psycopg3), Docker Compose (PostGIS + backend + adminer), Alembic with a full initial migration (all 6 tables + PostGIS point + GIST index, 9 categories seeded), shared packages (`@shahrim/i18n`, `@shahrim/ui-tokens`, `@shahrim/api-client`), GitHub Actions CI, and 28 placeholder SVG assets + `ASSETS.md`.
- Made backend startup robust to the PostGIS first-init quirk via a DB-wait loop in `entrypoint.sh`.

### What was tested (all green)
- `docker compose up -d --build` from a clean volume → services healthy, **no tracebacks**; backend waits for DB, migrates, serves.
- `GET /health` → `{"status":"ok"}` (performs a real `SELECT 1`, proving DB connectivity); `GET /` → ok.
- DB verified: 6 domain tables present, `postgis` extension enabled, **9 categories seeded** (correct Uzbek names), `ix_issues_geom` GIST spatial index created.
- `pytest -q` → **2 passed**.
- `ruff check .` → all checks passed; `ruff format --check .` → clean.
- `pnpm install` + `pnpm -r run typecheck` → all 3 packages green.
- Verified `.gitignore` excludes `CLAUDE.md`, `.env`, secrets, `.claude/`, plans, `__pycache__`, `uploads/`, `node_modules`; confirmed none appear in the commit set.
