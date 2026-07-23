# Progress

Tracking the phased build of Shahrim. Each phase ends with: tests written + passing, manual end-to-end check, this file updated, and a commit + push.

Legend: ⬜ not started · 🟡 in progress · ✅ done

## Phase status

| Phase | Description | Status |
|---|---|---|
| 0 | Foundation (repo, tooling, DB + migrations, health, assets, CI) | ✅ |
| 1 | Telegram auth + user | ✅ |
| 2 | Report flow (no AI) | ✅ |
| 3 | AI pipeline (OpenAI GPT-4o vision) | ✅ |
| 4 | My reports + statuses + notifications | ✅ |
| 5 | Admin portal (map, filters, analytics, resolve) | ✅ |
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

---

## Phase 1 — Telegram auth + user

**Goal:** bot `/start` → Mini App; server-side `initData` validation (never trust the client); phone capture; user upsert; JWT session.

### Log
- **Backend:** `POST /auth/telegram` validates the raw `initData` HMAC with the bot token (`app/services/telegram_auth.py`), upserts the citizen, and returns a JWT + user. `GET /me` returns the current user (JWT bearer). JWT in `app/core/security.py`; user upsert in `app/crud/user.py`; auth dependency in `app/api/deps.py`.
- **Bot (aiogram, own Docker service):** `/start` greets in Uzbek and shows a "share phone" contact button; on a valid own-contact it upserts the phone, then offers a WebApp button opening `MINIAPP_URL`. Uzbek copy centralised in `app/bot/messages.py`.
- **Mini App (`apps/miniapp`, Vite + React + TS):** on load reads `window.Telegram.WebApp.initData`, calls `/auth/telegram` via the shared `@shahrim/api-client`, stores the token, shows an Uzbek home (greeting + phone + report/history buttons). Graceful states for non-Telegram browsers, loading, and auth errors. Styled from `@shahrim/ui-tokens` (Samarkand palette), i18n only.
- Vite proxies `/api` → backend and allows `*.trycloudflare.com`, so one tunnel serves the whole Mini App.

### What was tested (all green)
- Backend `pytest`: **15 passed** — initData validation (valid / tampered / wrong-token / expired / missing-hash / missing-user / empty-token); auth API (`/auth/telegram` creates user → `/me` works, bad hash → 401, `/me` without/with garbage token → 401/403); bot logic (own-contact check, phone upsert create+update).
- `ruff check` + `ruff format --check`: clean.
- Bot container starts and polls successfully with the real token (token validated by Telegram).
- Mini App: `tsc --noEmit` clean; `vitest` **2 passed** (renders without Telegram → shows Uzbek "open in Telegram" notice; wordmark present). Full workspace typecheck (4 projects) green.

### Live in-Telegram check (manual — you run it via the cloudflared tunnel)
Ready to run: start the Mini App dev server + a cloudflared tunnel, set `MINIAPP_URL`, then in Telegram open the bot → `/start` → share phone → open app → confirm the home screen shows your name + phone. Steps provided in chat.

---

## Phase 2 — Report flow (no AI)

**Goal:** a citizen submits a geo-located issue end-to-end in the Mini App: photo → description → category → location → submit.

### Log
- **Backend:** `POST /uploads` (multipart image, validated, saved via a `Storage` interface → local FS, served at `/media`), `POST /issues` (creates the issue with a PostGIS point from lat/lng, status `submitted`, and a `StatusHistory` row), `GET /categories`. Storage is behind an interface so S3 can drop in later. Files: `app/services/storage.py`, `app/crud/issue.py`, `app/crud/category.py`, `app/api/routes/{issues,categories}.py`.
- **Mini App (`apps/miniapp`):** a 4-step report flow (`ReportFlow.tsx`) — photo capture (`capture=environment`) with **client-side canvas compression** (`lib/image.ts`, ≤1600px JPEG q0.8) → upload; always-editable description; category picker (from `/categories`, Uzbek fallback list); **geolocation with a Leaflet/OSM draggable-pin fallback** centered on Samarkand (`LocationMap.tsx`); submit → success screen. Vite proxies `/media` too, so photos render through the tunnel.
- `@shahrim/api-client` gained `uploadPhoto()`, `createIssue()`, `listCategories()`.

### What was tested (all green)
- Backend `pytest`: **20 passed** (adds: categories list = 9; upload→create issue with PostGIS geometry populated + status-history row; create requires auth; upload rejects non-image; bad category → 422). `ruff` + format clean.
- Mini App: `tsc --noEmit` clean; `vitest` **5 passed** (auth shell 2 + report flow 3). Full workspace typecheck (4 projects) green.
- Live: `/categories` served by the running backend; report flow HMR-loaded into the Mini App behind the existing cloudflared tunnel.

---

## Phase 3 — AI pipeline (OpenAI GPT-4o vision)

**Goal:** photographing a real problem yields Uzbek suggestions + a sensible category + urgency; the AI-down path still lets the user submit.

### Log
- **Backend:** pluggable `AIProvider` interface (`app/services/ai/`). `OpenAIProvider` sends the photo to GPT-4o vision with a strict **Uzbek JSON-only** prompt → `{suggestions[1-2], category, urgency, is_valid_city_issue}`; guardrails: `parse_analysis` coerces out-of-range category→`other`/urgency→`medium`, retries once on bad JSON. `MockProvider` used when no key is set. `get_ai_provider()` picks based on `OPENAI_API_KEY`. New `POST /issues/analyze {photo_url}` reads the stored photo (`Storage.read`) and returns the analysis; on any AI failure it returns a safe default so **reporting is never blocked**.
- **Mini App:** after upload, calls `analyzePhoto()`; shows an "analyzing" state, renders 1–2 Uzbek **suggestion chips** (tap fills the editable description), pre-selects the AI category, sends the AI `urgency` on submit, and if `is_valid_city_issue` is false shows the `retake_photo` prompt and requires a new photo. Fully graceful if AI returns nothing.
- `@shahrim/api-client` gained `analyzePhoto()` + `AnalysisResult`.

### What was tested (all green)
- Backend `pytest`: **30 passed** (adds: `parse_analysis` valid/coercion/cap-2/invalid-JSON; MockProvider; factory picks mock-without-key / openai-with-key; `/issues/analyze` returns a valid result via mock; missing photo → 400; requires auth). `ruff` + format clean.
- Mini App: `tsc --noEmit` clean; `vitest` **8 passed** (adds: analysis runs after upload + chip fills description; AI category+urgency reach `createIssue`; invalid photo → retake). Workspace typecheck green.

### Note
Real GPT-4o analysis activates automatically once `OPENAI_API_KEY` is set in `.env` (dev currently uses the mock provider, so no key is required to run/test).

---

## Phase 4 — My reports + statuses + notifications

**Goal:** the citizen sees their reports + a status timeline, and gets a Telegram message when a status changes.

### Log
- **Backend:** `GET /issues/mine` (the user's reports, newest first), `GET /issues/{id}` (owner-scoped detail: issue + `status_history` timeline + `resolution`). `change_issue_status()` service updates status, records a `StatusHistory` row, and fires an Uzbek Telegram notification. Notifications sent via the Bot API (`httpx` sendMessage), messages per PRD §11, non-blocking (a failure never blocks the status change). Files: `app/services/notifications.py`, `app/services/issue_status.py`.
- **Mini App:** "Mening murojaatlarim" opens a **history list** (`MyReports.tsx`) — photo thumbnail, title, category, colored status badge, date, empty/loading/error states — and a **detail screen** (`IssueDetail.tsx`) with the photo, description, category, urgency, location, a newest-first **status timeline**, and a result-photo section when resolved. Status→color/label maps in `lib/status.ts`.

### What was tested (all green)
- Backend `pytest`: **37 passed** (adds: `/issues/mine` list + newest-first; detail with status history; other-user detail → 404; `/mine` requires auth; status-change service records history + notifies via a mocked sender; Uzbek status-message mapping incl. rejection reason). Re-runnable (fixed a test-isolation issue). `ruff` + format clean.
- Mini App: `tsc --noEmit` clean; `vitest` **14 passed** (adds history list/badge/tap/empty/error + detail description/timeline/resolution). Workspace typecheck green.

### Note
The live "get a Telegram message on status change" is exercised end-to-end in Phase 5, when an admin resolves an issue (that action calls `change_issue_status`).

---

## Phase 5 — Admin portal

**Goal:** an operator logs in from the desktop, sees issues on a map + queue, filters, and resolves one with a result photo; the citizen is notified.

### Log
- **Backend (`app/api/routes/admin.py`, `app/crud/admin.py`):** email+password login (bcrypt) → JWT; `get_current_admin` RBAC. `GET /admin/issues` (filters: status/category/urgency/date range/district + paging, with reporter name/phone), `GET /admin/issues/map` (geo points), `GET /admin/issues/{id}` (detail + timeline + resolution + reporter), `POST /admin/issues/{id}/status`, `POST /admin/issues/{id}/resolve` (creates Resolution, sets resolved) — both notify the citizen via `change_issue_status`. `GET /admin/analytics` (counts by status/category, avg resolution hours, avg rating, 30-day trend). Admin account seeded on startup from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- **Admin web app (`apps/admin`, React+TS+Vite, port 5174):** login page + auth guard (401 → logout); dashboard with analytics cards + recharts trend/category charts; Leaflet/OSM map with urgency-colored pins + `leaflet.heat` heatmap (click pin → detail); filter bar; paginated issue table; issue detail drawer with status-change + upload-and-resolve actions. Uzbek throughout, Samarkand tokens, light+dark.

### What was tested (all green)
- Backend `pytest`: **44 passed** (adds: admin login ok/wrong-password; `/admin/me`; citizen → 403; auth required; issue list + filter + reporter; map; analytics shape; change-status; resolve → Resolution + resolved + timeline). Live admin login verified (seeded from `.env`). `ruff` + format clean.
- Admin app: `tsc --noEmit` clean; `vitest` **7 passed** (login flow + 401; dashboard cards/table; detail status-change/reject-reason/upload-resolve). **Production build succeeds** (`vite build`). Full workspace typecheck (5 projects) green.

### Notes
- Admin dev server runs on **http://localhost:5174**; log in with the `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env`.
- The admin JS bundle is ~780 KB (Leaflet + Recharts) — code-splitting deferred to Phase 8 polish.
