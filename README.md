# Shahrim

**Shahrim** ("My City") is a civic issue-reporting platform for Samarkand, Uzbekistan. A citizen photographs a street problem → AI writes a description and category → the city government sees it on a live map/dashboard and resolves it → the citizen is notified and rates the fix.

All user-facing text is in **Uzbek (Latin script)**.

## Clients (one backend, three frontends)

| App | Path | Stack | Status |
|---|---|---|---|
| Telegram Mini App (primary) | `apps/miniapp` | React + TS + Vite + `@telegram-apps/sdk` | Phase 1+ |
| Admin portal (government, desktop) | `apps/admin` | React + TS + Vite | Phase 5 |
| Native app (iOS + Android) | `apps/mobile` | Expo (React Native) | Phase 7 |
| Backend API + Telegram bot | `apps/backend` | FastAPI + PostgreSQL/PostGIS + aiogram | Phase 0+ |

Shared code lives in `packages/`: `i18n` (Uzbek strings), `ui-tokens` (design tokens), `api-client` (typed API client).

## Prerequisites

- **Docker** + Docker Compose (runs the backend + database)
- **Node ≥ 20** and **pnpm** (for the web/mobile clients)
- `uv` (optional — for running backend tooling outside Docker)

## Quickstart

```bash
cp .env.example .env        # fill in secrets as phases require them
make up                     # build + start db (PostGIS) + backend + adminer
curl http://localhost:8000/health   # -> {"status":"ok"}
```

- API: http://localhost:8000  (docs at `/docs`)
- Adminer (DB inspector): http://localhost:8080
- JS packages: `pnpm install` then `pnpm typecheck`

Common tasks are in the [`Makefile`](./Makefile) (`make test-backend`, `make lint-backend`, `make migrate`, …).

## Build phases

The product is built phase by phase. Current status lives in [`PROGRESS.md`](./PROGRESS.md).

## Assets

Placeholder brand/design assets and the swap-in checklist for the designer are in [`assets/ASSETS.md`](./assets/ASSETS.md).
