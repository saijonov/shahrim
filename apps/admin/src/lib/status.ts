/**
 * Status/urgency presentation helpers for the admin portal. Single source of
 * truth for status → Uzbek key and → colour so the table badge, analytics cards
 * and map pins never drift. Mirrors the Mini App's status helper, plus the
 * urgency colour scale used for map pins (PRD §7, §13).
 */
import type { IssueStatus, Urgency } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";

/** Status → shared uz.json translation key (all defined in @shahrim/i18n). */
export const STATUS_KEY: Record<IssueStatus, string> = {
  submitted: "status_submitted",
  in_review: "status_in_review",
  in_progress: "status_in_progress",
  resolved: "status_resolved",
  rejected: "status_rejected",
};

/** All statuses, in workflow order (used to render filter options + cards). */
export const STATUSES: IssueStatus[] = [
  "submitted",
  "in_review",
  "in_progress",
  "resolved",
  "rejected",
];

export const URGENCIES: Urgency[] = ["low", "medium", "high"];

/**
 * Status → badge / chart colour (ui-tokens only):
 *   submitted   → cobalt (just arrived)
 *   in_review   → cobalt (being looked at)
 *   in_progress → amber   (work started)     — per spec urgencyMedium
 *   resolved    → green   (done)             — per spec urgencyLow
 *   rejected    → red     (closed, no fix)   — per spec urgencyHigh
 */
export const STATUS_COLOR: Record<IssueStatus, string> = {
  submitted: tokens.color.muted,
  in_review: tokens.color.primary,
  in_progress: tokens.color.urgencyMedium,
  resolved: tokens.color.urgencyLow,
  rejected: tokens.color.urgencyHigh,
};

/** Urgency → pin/label colour. `null` falls back to cobalt. */
export function urgencyColor(urgency: Urgency | null): string {
  if (urgency === "high") return tokens.color.urgencyHigh;
  if (urgency === "medium") return tokens.color.urgencyMedium;
  if (urgency === "low") return tokens.color.urgencyLow;
  return tokens.color.primary;
}

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

/** Short dd.MM for chart axis ticks. */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}
