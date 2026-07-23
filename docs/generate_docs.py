"""Generate the Shahrim PDF documentation.

Run:  uv run --with fpdf2 --python 3.12 python docs/generate_docs.py
Outputs:
  docs/Shahrim-User-Guide.pdf         (onboarding for citizens, operators, super-admins)
  docs/Shahrim-Technical-Overview.pdf (stack, architecture, deployment/hosting)

Content is intentionally ASCII-safe so it renders with the core PDF fonts.
"""

from __future__ import annotations

import os

from fpdf import FPDF

COBALT = (20, 60, 140)  # #143C8C Samarkand cobalt
TURQUOISE = (28, 165, 160)  # #1CA5A0 dome turquoise
INK = (22, 32, 46)
MUTED = (107, 118, 134)
WHITE = (255, 255, 255)

DOCS_DIR = os.path.dirname(os.path.abspath(__file__))
DATE = "2026-07-23"


class ShahrimPDF(FPDF):
    def __init__(self, doc_title: str) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.doc_title = doc_title
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(18, 18, 18)

    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("helvetica", "B", 9)
        self.set_text_color(*COBALT)
        self.set_xy(18, 8)
        self.cell(0, 6, "Shahrim", align="L")
        self.set_font("helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 6, self.doc_title, align="R")
        self.set_draw_color(*TURQUOISE)
        self.set_line_width(0.4)
        self.line(18, 15, 192, 15)
        self.set_y(22)
        self.set_text_color(*INK)

    def footer(self) -> None:
        if self.page_no() == 1:
            return
        self.set_y(-14)
        self.set_font("helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 6, f"Shahrim - {self.doc_title}", align="L")
        self.cell(0, 6, f"{self.page_no() - 1}", align="R")

    def cover(self, title: str, subtitle: str) -> None:
        self.add_page()
        self.set_fill_color(*COBALT)
        self.rect(0, 0, 210, 297, style="F")
        self.set_fill_color(*TURQUOISE)
        self.rect(0, 120, 210, 6, style="F")
        # Wordmark
        self.set_xy(18, 60)
        self.set_font("helvetica", "B", 40)
        self.set_text_color(*WHITE)
        self.cell(0, 20, "Shahrim", align="L")
        self.set_xy(18, 90)
        self.set_font("helvetica", "", 13)
        self.set_text_color(220, 230, 245)
        self.cell(0, 8, "Shahar muammolarini birgalikda hal qilamiz", align="L")
        # Title
        self.set_xy(18, 140)
        self.set_font("helvetica", "B", 24)
        self.set_text_color(*WHITE)
        self.multi_cell(174, 12, title, align="L")
        self.set_xy(18, 170)
        self.set_font("helvetica", "", 13)
        self.set_text_color(180, 205, 235)
        self.multi_cell(174, 8, subtitle, align="L")
        # Footer of cover
        self.set_xy(18, 270)
        self.set_font("helvetica", "", 10)
        self.set_text_color(200, 215, 240)
        self.cell(0, 6, f"Samarqand pilot - {DATE}", align="L")

    def body(self, html: str) -> None:
        self.add_page()
        self.set_font("helvetica", "", 11)
        self.set_text_color(*INK)
        try:
            from fpdf.fonts import FontFace

            tag_styles = {
                "h1": FontFace(color=COBALT, size_pt=19, emphasis="BOLD"),
                "h2": FontFace(color=COBALT, size_pt=14, emphasis="BOLD"),
                "h3": FontFace(color=TURQUOISE, size_pt=12, emphasis="BOLD"),
            }
            self.write_html(html, tag_styles=tag_styles)
        except Exception:
            self.write_html(html)


def build_user_guide() -> str:
    return """
<h1>User & Operations Guide</h1>
<p>Shahrim ("My City") is a civic issue-reporting platform for Samarkand. A citizen
photographs a street problem; AI writes a description and category; the city sees it on a
live map and resolves it; the citizen is notified and rates the fix. All user-facing text
is in Uzbek (Latin script). This guide explains how each type of user works with Shahrim.</p>

<h2>1. Who uses Shahrim</h2>
<ul>
<li><b>Citizen (fuqaro)</b> - reports problems, tracks them, and rates resolutions. Uses the Telegram Mini App or the native mobile app.</li>
<li><b>Government operator / Admin</b> - sees all issues on a map and dashboard, filters them, and resolves them. Uses the web admin portal from a computer.</li>
<li><b>Super-admin (planned)</b> - manages operators, categories, and districts.</li>
</ul>

<h2>2. For Citizens</h2>
<h3>Getting started</h3>
<p>There are two ways to use Shahrim, both sharing the same account:</p>
<ul>
<li><b>Telegram Mini App</b> (fastest): open the bot in Telegram, tap Start (Boshlash), and share your phone number when asked. No password, no signup form.</li>
<li><b>Native app</b> (iOS/Android): install the app, tap "Telegram orqali kirish", confirm in Telegram (share phone), and you are signed in.</li>
</ul>
<p>Sharing your phone through Telegram is what verifies your identity - it happens once.</p>

<h3>Reporting a problem</h3>
<p>1. Tap <b>Muammo yuborish</b> (Report a problem).<br></br>
2. Take a photo (or choose one from the gallery). The photo uploads and the AI analyzes it.<br></br>
3. The AI suggests 1-2 short descriptions (tap one to use it) and pre-selects a category and urgency. You can always type your own description and change the category.<br></br>
4. Your location is captured automatically; adjust the pin on the map if needed.<br></br>
5. Tap <b>Yuborish</b> (Submit). You will see "Murojaatingiz qabul qilindi".</p>
<p>If the photo is clearly not a city problem (for example a selfie or food), the app asks you to retake it.</p>

<h3>Tracking your reports</h3>
<p>Open <b>Mening murojaatlarim</b> (My reports) to see every report with its photo, category, date, and current status. Tap one for the full detail, including the status timeline and - once resolved - the city's result photo.</p>
<p>Statuses:</p>
<ul>
<li><b>Yuborildi</b> - submitted, received by the city.</li>
<li><b>Ko'rib chiqilmoqda</b> - under review.</li>
<li><b>Jarayonda</b> - work in progress.</li>
<li><b>Hal qilindi</b> - resolved.</li>
<li><b>Rad etildi</b> - rejected (with a reason).</li>
</ul>

<h3>Notifications and rating</h3>
<p>The bot messages you in Uzbek whenever your report's status changes. When a problem is resolved you are asked to rate the work from 1 to 5 stars and optionally leave a comment (<b>Bajarilgan ishni baholang</b>).</p>

<h2>3. For Government Operators (Admin portal)</h2>
<h3>Signing in</h3>
<p>The admin portal is a separate website used from a computer. Open the portal URL in a browser and sign in with the email and password issued to you. Access is role-restricted (RBAC) - only admin accounts can open it.</p>

<h3>The dashboard</h3>
<ul>
<li><b>Map</b> - all issues shown as pins colored by urgency (red = high, amber = medium, green = low) plus a heatmap of density. Click a pin to open the issue.</li>
<li><b>Analytics</b> - totals, counts by status, most common categories, a 30-day volume trend, average resolution time, and average citizen rating.</li>
<li><b>Filters</b> - narrow everything by category, status, urgency, date range, or district.</li>
<li><b>Issue queue</b> - a sortable, paginated table; click a row to open an issue.</li>
</ul>

<h3>Handling an issue</h3>
<p>1. Open the issue to see the photo, description, reporter (name + phone), category, location, and status timeline.<br></br>
2. <b>Change status</b> to "Ko'rib chiqilmoqda" or "Jarayonda" as you work on it.<br></br>
3. <b>Resolve</b>: upload a result photo and a note, which sets the status to "Hal qilindi".<br></br>
4. <b>Reject</b>: set "Rad etildi" and provide a reason.</p>
<p>Every status change automatically sends the citizen a Telegram message; resolving also invites them to rate the work. Your average rating appears in analytics.</p>

<h2>4. For Super-admins (planned)</h2>
<p>A future super-admin role will manage operator accounts, edit the category list, and configure districts (including routing reports to the right office). The data model and role field already support this; the management screens are on the roadmap.</p>

<h2>5. Category reference</h2>
<ul>
<li>Yo'l shikasti - road damage</li>
<li>Ko'cha yoritilishi - street lighting</li>
<li>Chiqindi / axlat - garbage / waste</li>
<li>Suv oqishi / quvur - water leak / pipes</li>
<li>Kanalizatsiya - sewage</li>
<li>Shikastlangan belgi - damaged sign</li>
<li>Yiqilgan daraxt / shox - fallen tree / branch</li>
<li>Jamoat transporti - public transport</li>
<li>Boshqa - other</li>
</ul>

<h2>6. Privacy note</h2>
<p>When you submit a report, its photo and location are shared with the city government so they can find and fix the problem. Shahrim stores only what is needed to handle your report.</p>
"""


def build_technical() -> str:
    return """
<h1>Technical Overview</h1>
<p>This document describes the technology, architecture, and deployment of Shahrim - a civic
issue-reporting platform with one backend serving three clients. It is a pnpm + Turborepo
monorepo; the backend is Python/FastAPI; the clients are React and React Native.</p>

<h2>1. Architecture at a glance</h2>
<p>One backend API is consumed by three frontends:</p>
<ul>
<li><b>Backend API + Telegram bot</b> - FastAPI (async) + PostgreSQL/PostGIS.</li>
<li><b>Telegram Mini App</b> (primary citizen client) - React + TypeScript + Vite.</li>
<li><b>Native mobile app</b> (iOS + Android) - Expo / React Native.</li>
<li><b>Admin portal</b> (government operators, desktop web) - React + TypeScript + Vite.</li>
</ul>
<p>Shared logic lives in workspace packages so the clients stay consistent: the typed API
client, the design tokens, and the Uzbek i18n strings.</p>

<h2>2. Technology stack</h2>
<h3>Backend</h3>
<ul>
<li><b>FastAPI</b> (async) with <b>SQLAlchemy 2.0</b> (async ORM) and <b>Alembic</b> migrations.</li>
<li><b>PostgreSQL 16 + PostGIS</b> - geospatial storage for issue locations (Geometry Point, SRID 4326) with a GIST index for maps and district queries.</li>
<li><b>psycopg 3</b> driver; <b>pydantic-settings</b> for env-driven config.</li>
<li><b>aiogram</b> Telegram bot (runs as its own service).</li>
<li><b>PyJWT</b> sessions; <b>bcrypt</b> for admin passwords.</li>
<li>AI via the <b>OpenAI</b> SDK (GPT-4o vision) behind a pluggable interface.</li>
</ul>
<h3>Clients</h3>
<ul>
<li><b>Mini App / Admin</b>: React 18 + TypeScript + Vite; i18next; Leaflet + OpenStreetMap for maps; Recharts for admin analytics.</li>
<li><b>Native app</b>: Expo SDK 51 + expo-router; expo-image-picker, expo-location, react-native-maps, expo-secure-store.</li>
</ul>
<h3>Shared packages</h3>
<ul>
<li><b>@shahrim/api-client</b> - typed fetch client + domain types.</li>
<li><b>@shahrim/ui-tokens</b> - Samarkand color/type/spacing tokens.</li>
<li><b>@shahrim/i18n</b> - Uzbek (Latin) strings; structured for adding more languages.</li>
</ul>
<h3>Tooling</h3>
<ul>
<li>Docker Compose for local infra; <b>ruff</b> (lint+format) for Python; <b>ESLint/TSC</b> for JS.</li>
<li>Tests: <b>pytest</b> (backend), <b>Vitest</b> (web), <b>jest-expo</b> (native). GitHub Actions CI on every push.</li>
</ul>

<h2>3. Repository structure</h2>
<ul>
<li><b>apps/backend</b> - FastAPI app, bot, Alembic migrations, tests.</li>
<li><b>apps/miniapp</b> - Telegram Mini App.</li>
<li><b>apps/admin</b> - admin portal.</li>
<li><b>apps/mobile</b> - Expo native app.</li>
<li><b>packages/{api-client, ui-tokens, i18n}</b> - shared code.</li>
<li><b>assets/</b> - placeholder brand assets + ASSETS.md swap list.</li>
</ul>

<h2>4. Data model</h2>
<ul>
<li><b>User</b> - telegram_id, name, username, photo, phone, email + password_hash (admins), language, role (citizen/admin).</li>
<li><b>Category</b> - code, name_uz, icon (9 seeded categories).</li>
<li><b>Issue</b> - user, photo_url, ai/user/final description, category, urgency, status, lat/lng + PostGIS geom, address/district, timestamps.</li>
<li><b>Resolution</b> - issue, admin, result_photo_url, note, resolved_at.</li>
<li><b>Rating</b> - issue (unique), user, stars (1-5), comment.</li>
<li><b>StatusHistory</b> - issue, status, changed_by, note, timestamp (the timeline).</li>
<li><b>LoginCode</b> - one-time nonce for native-app deep-link auth.</li>
</ul>

<h2>5. Authentication</h2>
<ul>
<li><b>Mini App</b>: the client sends Telegram <b>initData</b>; the backend validates its HMAC signature with the bot token (never trusts the client), upserts the user, and issues a JWT.</li>
<li><b>Native app</b>: the app generates a nonce and opens the bot with a deep link; after the user shares their phone, the bot binds the nonce to the user; the app exchanges the nonce for a JWT (one-time).</li>
<li><b>Admin</b>: email + password (bcrypt) -> JWT; a role check (get_current_admin) enforces RBAC on every admin route.</li>
</ul>

<h2>6. AI pipeline</h2>
<p>Photo analysis sits behind an <b>AIProvider</b> interface. The default is OpenAI GPT-4o vision with a strict Uzbek JSON-only prompt returning suggestions, category, urgency, and an is_valid_city_issue flag. Guardrails validate and coerce the output, retry once on bad JSON, and fall back safely - an AI failure never blocks a report. When no API key is set, a mock provider keeps the whole flow working in development.</p>

<h2>7. Storage, maps, notifications</h2>
<ul>
<li><b>Photos</b>: a Storage interface with a local-filesystem implementation today (served under /media); an S3-compatible backend can drop in without touching callers.</li>
<li><b>Maps</b>: Leaflet + OpenStreetMap (no key) behind an abstraction; Yandex can replace it for better Uzbekistan coverage in the pilot.</li>
<li><b>Notifications</b>: on every status change the backend sends the citizen an Uzbek Telegram message via the Bot API (non-blocking).</li>
</ul>

<h2>8. Hardening</h2>
<ul>
<li>Per-IP rate limiting on abuse-prone POST endpoints (report, upload, auth) returning HTTP 429.</li>
<li>Structured request logging (method, path, status, duration).</li>
<li>Secrets only via environment variables; nothing sensitive is committed.</li>
</ul>

<h2>9. Deployment and hosting</h2>
<p>The pieces are hosted differently because a native app is a client, not a website.</p>
<h3>Backend (server-hosted)</h3>
<ul>
<li>Run the same Docker Compose stack (or Kubernetes) on a VPS / cloud host.</li>
<li>Put a reverse proxy (Caddy, Nginx, or Traefik) in front for a real domain + automatic TLS.</li>
<li>Use managed PostgreSQL with the PostGIS extension; use an S3-compatible bucket for photos (swap the Storage backend).</li>
<li>Provide secrets (bot token, JWT secret, OpenAI key, DB URL, admin credentials) as environment variables / a secrets manager.</li>
<li>The bot runs as its own service; for production, a Telegram webhook can replace long-polling.</li>
</ul>
<h3>Mini App and Admin portal (static web, server-hosted)</h3>
<ul>
<li>Build each with Vite and serve the static output over HTTPS (any static host / CDN, or behind the same reverse proxy).</li>
<li>The Mini App must be served from a single fixed HTTPS domain (Telegram is enabling origin-restriction protection for Mini Apps on 20 July 2026).</li>
<li>The admin portal sits on its own domain/subdomain, behind login.</li>
</ul>
<h3>Native app (built and distributed, not hosted)</h3>
<p>The Expo app is not hosted like a web page - it is compiled to native binaries and installed on phones, and it talks to the hosted backend over HTTPS. The standard flow:</p>
<ul>
<li><b>EAS Build</b> produces the iOS (.ipa) and Android (.aab/.apk) binaries in the cloud - no local Xcode/Android Studio required to build, though those are needed for local simulators.</li>
<li>Publish to the <b>App Store</b> and <b>Google Play</b> (or use internal / enterprise distribution for a closed pilot).</li>
<li><b>EAS Update</b> pushes over-the-air JavaScript updates between store releases.</li>
<li>The app reads the backend URL from an environment/config value (EXPO_PUBLIC_API_URL), so pointing it at production is a config change.</li>
<li>During development the app runs in <b>Expo Go</b> on a real phone against a tunnelled backend - no store submission needed.</li>
</ul>
<p>This is a mainstream, well-supported pattern and works reliably: server-hosted backend + web builds, store-distributed native client, OTA updates for fast iteration.</p>

<h2>10. Testing and CI</h2>
<p>The suite has 91 automated tests: backend 51 (pytest - auth/initData, issues, AI guardrails, notifications, admin RBAC/analytics/resolve, rating, rate limiting, native exchange), Mini App 17 and admin 7 (Vitest), and native 16 (jest-expo). GitHub Actions runs lint + migrate + tests on each push; a full Metro bundle validates the native app.</p>

<h2>11. Open decisions / roadmap</h2>
<ul>
<li>AI provider + key (OpenAI selected; mock until a key is set).</li>
<li>Map provider (OSM now; Yandex for pilot coverage).</li>
<li>Photo storage (local now; S3-compatible for production).</li>
<li>Government partnership - which office receives and acts on reports.</li>
<li>Per-district routing and the super-admin management screens.</li>
</ul>
"""


def main() -> None:
    guide = ShahrimPDF("User & Operations Guide")
    guide.cover(
        "User & Operations Guide",
        "How citizens, government operators, and administrators use Shahrim.",
    )
    guide.body(build_user_guide())
    guide.output(os.path.join(DOCS_DIR, "Shahrim-User-Guide.pdf"))

    tech = ShahrimPDF("Technical Overview")
    tech.cover(
        "Technical Overview",
        "Stack, architecture, data model, security, and how everything is hosted.",
    )
    tech.body(build_technical())
    tech.output(os.path.join(DOCS_DIR, "Shahrim-Technical-Overview.pdf"))

    print("Generated:")
    print(" - docs/Shahrim-User-Guide.pdf")
    print(" - docs/Shahrim-Technical-Overview.pdf")


if __name__ == "__main__":
    main()
