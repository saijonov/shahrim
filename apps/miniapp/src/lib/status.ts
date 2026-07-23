/**
 * Shared helpers for the "My reports" history + detail screens (Phase 4).
 *
 * A single source of truth for how an issue status maps to its Uzbek i18n key
 * and its badge colour, plus small locale-independent date formatters. Kept
 * here so the list card, the status badge and the detail timeline never drift.
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
 *   submitted   → neutral/muted (just arrived, nothing done yet)
 *   in_review   → cobalt/primary (being looked at)
 *   in_progress → amber (work started)
 *   resolved    → green (done)
 *   rejected    → red (closed without a fix)
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
