import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@shahrim/api-client";
import type { Issue } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import { STATUS_KEY, formatDate } from "./lib/status";
import { Icon } from "./components/Icon";
import { categoryIcon } from "./lib/categoryIcons";

const TOKEN_KEY = "shahrim_token";

type Phase = "loading" | "error" | "ready";

export interface MyReportsProps {
  /** Back to the home screen. */
  onExit: () => void;
  /** Open the detail screen for a given issue id. */
  onOpen: (id: number) => void;
}

/**
 * "Mening murojaatlarim" — the citizen's own reports, newest first (PRD §6.3).
 * Each row is a tappable card (photo thumbnail, title, category, status badge,
 * date). Loading / error (with retry) / empty states are all Uzbek via i18n.
 */
export function MyReports({ onExit, onOpen }: MyReportsProps) {
  const { t } = useTranslation();

  const client = useMemo(
    () =>
      createClient({
        baseUrl: import.meta.env.VITE_API_BASE || "/api",
        getToken: () => localStorage.getItem(TOKEN_KEY),
      }),
    [],
  );

  const [phase, setPhase] = useState<Phase>("loading");
  const [issues, setIssues] = useState<Issue[]>([]);

  const load = useCallback(() => {
    let alive = true;
    setPhase("loading");
    client
      .listMyIssues()
      .then((list) => {
        if (!alive) return;
        setIssues(list);
        setPhase("ready");
      })
      .catch(() => {
        if (alive) setPhase("error");
      });
    return () => {
      alive = false;
    };
  }, [client]);

  useEffect(() => load(), [load]);

  return (
    <div className="sh-flow" style={{ gap: tokens.space[5] }}>
      <div className="sh-flow__head">
        <button
          type="button"
          className="sh-linkbtn"
          onClick={onExit}
          aria-label={t("back")}
        >
          <Icon id="ic-back" size={18} />
          {t("back")}
        </button>
      </div>

      <h2 className="sh-step__title" style={{ fontSize: tokens.fontSize.xl }}>
        {t("my_reports")}
      </h2>

      {phase === "loading" && (
        <div
          className="sh-center"
          style={{ gap: tokens.space[3], padding: tokens.space[8] }}
        >
          <span className="sh-spinner" aria-hidden="true" />
          <p className="sh-meta" style={{ fontSize: tokens.fontSize.base }}>
            {t("loading")}
          </p>
        </div>
      )}

      {phase === "error" && (
        <section
          className="sh-card sh-card--notice"
          style={{
            padding: tokens.space[6],
            borderRadius: tokens.radius.lg,
            gap: tokens.space[4],
          }}
        >
          <p className="sh-notice-text" style={{ fontSize: tokens.fontSize.lg }}>
            {t("load_error")}
          </p>
          <button
            type="button"
            className="sh-btn sh-btn--secondary"
            style={{
              padding: `${tokens.space[4]}px ${tokens.space[6]}px`,
              borderRadius: tokens.radius.lg,
              fontSize: tokens.fontSize.lg,
            }}
            onClick={() => load()}
          >
            {t("retry")}
          </button>
        </section>
      )}

      {phase === "ready" && issues.length === 0 && (
        <section
          className="sh-card sh-card--notice"
          style={{
            padding: tokens.space[8],
            borderRadius: tokens.radius.lg,
            gap: tokens.space[3],
          }}
        >
          <span className="sh-emoji" aria-hidden="true">
            🗂
          </span>
          <p className="sh-notice-text" style={{ fontSize: tokens.fontSize.lg }}>
            {t("no_reports_yet")}
          </p>
        </section>
      )}

      {phase === "ready" && issues.length > 0 && (
        <ul className="sh-list" style={{ gap: tokens.space[3] }}>
          {issues.map((issue) => (
            <li key={issue.id}>
              <IssueCard issue={issue} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IssueCard({
  issue,
  onOpen,
}: {
  issue: Issue;
  onOpen: (id: number) => void;
}) {
  const { t } = useTranslation();
  const categoryName = t(`cat_${issue.category_code}`);
  const title =
    issue.final_description?.trim() ||
    issue.user_description?.trim() ||
    categoryName;

  return (
    <button
      type="button"
      className="sh-repcard"
      style={{ borderRadius: tokens.radius.lg }}
      onClick={() => onOpen(issue.id)}
    >
      <div className="sh-repcard__thumb" aria-hidden="true">
        {issue.photo_url ? (
          <img className="sh-repcard__img" src={issue.photo_url} alt="" />
        ) : (
          <Icon id={categoryIcon(issue.category_code)} size={26} />
        )}
      </div>

      <div className="sh-repcard__body" style={{ gap: tokens.space[1] }}>
        <p className="sh-repcard__title" style={{ fontSize: tokens.fontSize.base }}>
          {title}
        </p>
        <p className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
          {categoryName}
        </p>
        <div className="sh-repcard__foot" style={{ gap: tokens.space[2] }}>
          <StatusBadge status={issue.status} />
          <span className="sh-meta" style={{ fontSize: tokens.fontSize.xs }}>
            {formatDate(issue.created_at)}
          </span>
        </div>
      </div>
    </button>
  );
}

export function StatusBadge({ status }: { status: Issue["status"] }) {
  const { t } = useTranslation();
  return (
    <span
      className="sh-badge"
      data-status={status}
      style={{ fontSize: tokens.fontSize.xs }}
    >
      {t(STATUS_KEY[status])}
    </span>
  );
}

export default MyReports;
