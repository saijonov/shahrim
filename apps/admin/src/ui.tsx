/**
 * Small presentational primitives shared across the dashboard: the status
 * badge, an urgency dot, a spinner and a compact error+retry block. All copy is
 * Uzbek via i18n; all colour comes from @shahrim/ui-tokens.
 */
import { useTranslation } from "react-i18next";
import type { IssueStatus, Urgency } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import { STATUS_KEY, urgencyColor } from "./lib/status";

export function StatusBadge({ status }: { status: IssueStatus }) {
  const { t } = useTranslation();
  // Soft-tinted pill + colour-matched dot per status (colours live in the CSS,
  // keyed off data-status) — matching the Mini App's badge.
  return (
    <span className="adm-badge" data-status={status} style={{ fontSize: tokens.fontSize.xs }}>
      {t(STATUS_KEY[status])}
    </span>
  );
}

export function UrgencyDot({ urgency }: { urgency: Urgency | null }) {
  const { t } = useTranslation();
  if (!urgency) return <span className="adm-muted">—</span>;
  return (
    <span className="adm-urgency">
      <span
        className="adm-urgency__dot"
        style={{ background: urgencyColor(urgency) }}
        aria-hidden="true"
      />
      {t(`urgency_${urgency}`)}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="adm-center" style={{ gap: tokens.space[3], padding: tokens.space[8] }}>
      <span className="adm-spinner" aria-hidden="true" />
      <p className="adm-muted">{label ?? t("loading")}</p>
    </div>
  );
}

export function ErrorRetry({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="adm-center" style={{ gap: tokens.space[4], padding: tokens.space[6] }}>
      <p className="adm-error">{message ?? t("load_error")}</p>
      <button type="button" className="adm-btn adm-btn--secondary" onClick={onRetry}>
        {t("retry")}
      </button>
    </div>
  );
}
