# Shahrim — Asset Catalog

These are **placeholder assets**. Every file is a temporary, on-brand SVG meant to be
**swapped by the human designer, one by one, by filename**. Keep the same relative path
and filename when replacing so nothing in the apps needs re-wiring. Placeholders use the
Shahrim brand palette (Samarkand majolica: cobalt + turquoise on warm paper) so layouts
look correct before the real art lands.

Conventions:
- All placeholders are self-contained SVGs with a `viewBox` (no external references).
- Each placeholder carries a short visible label of what it represents.
- **Category icons are single-color** (they inherit `currentColor`; the file sets a
  default `color` so they preview on their own). Transparent background. Recolor by
  setting `color`/`fill` from the consuming component.
- **Binary deliverables:** a few assets must ultimately ship as raster/`.ico` files
  (store icons, bot avatar, favicon). Those cannot be produced as binaries here, so a
  `.svg` placeholder is provided and the required final binary is documented below.

## Catalog

| #  | Asset | File path (relative to `assets/`) | Purpose | Final format / size | Status |
|----|-------|-----------------------------------|---------|---------------------|--------|
| 1  | Logo — full (horizontal) | `logo/logo-full.svg` | Headers, splash | SVG + PNG | Placeholder — replace |
| 2  | Logo — mark only | `logo/logo-mark.svg` | Small spaces, favicon base | SVG | Placeholder — replace |
| 3  | App icon (native) | `app-icon/app-icon.svg` | iOS/Android store icon | **PNG 1024×1024** | Placeholder — replace |
| 4a | Adaptive icon — foreground | `app-icon/adaptive-icon-foreground.svg` | Android adaptive icon (fg) | **PNG (foreground layer)** | Placeholder — replace |
| 4b | Adaptive icon — background | `app-icon/adaptive-icon-background.svg` | Android adaptive icon (bg) | **PNG (background layer)** | Placeholder — replace |
| 5  | Splash screen | `splash/splash.svg` | App launch | SVG / PNG | Placeholder — replace |
| 6  | Telegram bot avatar | `telegram/bot-avatar.svg` | Bot profile picture | **PNG 512×512** | Placeholder — replace |
| 7  | Telegram Mini App header | `telegram/miniapp-header.svg` | Mini App header image | Per Telegram spec (raster) | Placeholder — replace |
| 8  | Category — Yo'l shikasti | `icons/categories/road_damage.svg` | Category: road damage | SVG, single-color | Placeholder — replace |
| 9  | Category — Ko'cha yoritilishi | `icons/categories/street_light.svg` | Category: street lighting | SVG, single-color | Placeholder — replace |
| 10 | Category — Chiqindi / axlat | `icons/categories/garbage.svg` | Category: garbage / waste | SVG, single-color | Placeholder — replace |
| 11 | Category — Suv oqishi / quvur | `icons/categories/water_leak.svg` | Category: water leak / pipes | SVG, single-color | Placeholder — replace |
| 12 | Category — Kanalizatsiya | `icons/categories/sewage.svg` | Category: sewage | SVG, single-color | Placeholder — replace |
| 13 | Category — Shikastlangan belgi | `icons/categories/damaged_sign.svg` | Category: damaged sign | SVG, single-color | Placeholder — replace |
| 14 | Category — Yiqilgan daraxt / shox | `icons/categories/fallen_tree.svg` | Category: fallen tree / branch | SVG, single-color | Placeholder — replace |
| 15 | Category — Jamoat transporti | `icons/categories/public_transport.svg` | Category: public transport | SVG, single-color | Placeholder — replace |
| 16 | Category — Boshqa | `icons/categories/other.svg` | Category: other | SVG, single-color | Placeholder — replace |
| 17 | Empty state — no reports | `illustrations/empty-no-reports.svg` | "Hozircha murojaatlar yo'q" | SVG | Placeholder — replace |
| 18 | Empty state — submitted | `illustrations/empty-submitted.svg` | Submitted confirmation | SVG | Placeholder — replace |
| 19 | Empty state — resolved | `illustrations/empty-resolved.svg` | Resolved confirmation | SVG | Placeholder — replace |
| 20 | Onboarding 1 | `illustrations/onboarding-1.svg` | Intro: take a photo | SVG | Placeholder — replace |
| 21 | Onboarding 2 | `illustrations/onboarding-2.svg` | Intro: AI describes it | SVG | Placeholder — replace |
| 22 | Onboarding 3 | `illustrations/onboarding-3.svg` | Intro: city resolves it | SVG | Placeholder — replace |
| 23 | Rating / thank-you | `illustrations/rating-thankyou.svg` | After rating a resolution | SVG | Placeholder — replace |
| 24 | Map pin — high urgency | `markers/pin-high.svg` | Map marker (high) `#C0392B` | SVG | Placeholder — replace |
| 25 | Map pin — medium urgency | `markers/pin-medium.svg` | Map marker (medium) `#E08A00` | SVG | Placeholder — replace |
| 26 | Map pin — low urgency | `markers/pin-low.svg` | Map marker (low) `#2E8B57` | SVG | Placeholder — replace |
| 27 | Favicon base | `favicon/favicon.svg` | Admin + web favicon | **ICO/PNG set** | Placeholder — replace |

> Note: item 4 (Android adaptive icon) is delivered as **two files** — a foreground and a
> background layer — so the catalog lists 28 files across the 27 asset entries.

## Binary deliverables that must be produced by the designer

These entries have an `.svg` placeholder here, but their **true final deliverable is a
binary file** that could not be generated in this environment. The designer must export
the real binary and place it alongside (or in place of) the SVG:

- **#3 — App icon:** `app-icon/app-icon.png` at **1024×1024** (opaque, no transparency; iOS/Android store icon).
- **#4 — Android adaptive icon:** `app-icon/adaptive-icon-foreground.png` and
  `app-icon/adaptive-icon-background.png` as **PNG layers** (foreground art within the
  central 66% safe zone; full-bleed background).
- **#6 — Telegram bot avatar:** `telegram/bot-avatar.png` at **512×512**.
- **#27 — Favicon:** a **favicon set** — `favicon/favicon.ico` plus PNG sizes
  (16×16, 32×32, 48×48, 180×180 apple-touch) for admin dashboard + web.

(Item #7, the Telegram Mini App header, is also ultimately a raster image per Telegram's
current header-image spec; provide the SVG source and export to the size Telegram requires.)

## Brand palette reference

| Token | Hex | Use |
|-------|-----|-----|
| Primary — Samarkand cobalt | `#143C8C` | Primary brand, logo, headers |
| Accent — dome turquoise | `#1CA5A0` | Accent, highlights |
| Surface — warm paper | `#F5F2EC` | Backgrounds, surfaces |
| Ink | `#16202E` | Text, outlines |
| Urgency — high | `#C0392B` | High-urgency pins/badges |
| Urgency — medium | `#E08A00` | Medium-urgency pins/badges |
| Urgency — low | `#2E8B57` | Low-urgency pins/badges |

Grounded in Samarkand's majolica tilework (deep cobalt + turquoise domes) — intentionally
distinct from generic AI defaults.
