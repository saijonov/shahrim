/**
 * Status → Uzbek i18n key + badge colour, plus locale-independent date
 * formatters. Mirrors apps/miniapp/src/lib/status.ts so the two clients never
 * drift. Pure logic (no native modules) — covered by unit tests.
 */
import type { IssueStatus } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";

/** Status → shared uz.json translation key (all defined in @shahrim/i18n). */
export const STATUS_KEY: Record<IssueStatus, string> = {
  submitted: "status_submitted",
  in_review: "status_in_review",
  in_progress: "status_in_progress",
  resolved: "status_resolved",
  rejected: "status_rejected",
};

/**
 * Status → badge colour (ui-tokens only):
 *   submitted   → neutral/muted    in_review → cobalt/primary
 *   in_progress → amber            resolved  → green    rejected → red
 */
export const STATUS_COLOR: Record<IssueStatus, string> = {
  submitted: tokens.color.muted,
  in_review: tokens.color.primary,
  in_progress: tokens.color.urgencyMedium,
  resolved: tokens.color.urgencyLow,
  rejected: tokens.color.urgencyHigh,
};

/** dd.MM.yyyy — locale-independent so it is stable across environments/tests. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** dd.MM.yyyy HH:mm — used in the status timeline where the time matters. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)} ${hh}:${min}`;
}

/** Category code → shared uz.json key ("cat_<code>"). */
export function categoryKey(code: string): string {
  return `cat_${code}`;
}
