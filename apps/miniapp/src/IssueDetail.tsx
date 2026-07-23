import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@shahrim/api-client";
import type { IssueDetail as IssueDetailData } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import { StatusBadge } from "./MyReports";
import { STATUS_KEY, formatDateTime } from "./lib/status";

const TOKEN_KEY = "shahrim_token";

type Phase = "loading" | "error" | "ready";

export interface IssueDetailProps {
  /** The issue to load. */
  id: number;
  /** Back to the history list. */
  onExit: () => void;
}

/**
 * Single-report detail (PRD §6.3): the photo, description, category, urgency,
 * location, a status timeline built from `status_history`, and — when the city
 * has resolved it — the result photo + note. Loading / error / back are Uzbek.
 */
export function IssueDetail({ id, onExit }: IssueDetailProps) {
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
  const [issue, setIssue] = useState<IssueDetailData | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setPhase("loading");
    client
      .getIssue(id)
      .then((data) => {
        if (!alive) return;
        setIssue(data);
        setPhase("ready");
      })
      .catch(() => {
        if (alive) setPhase("error");
      });
    return () => {
      alive = false;
    };
  }, [client, id]);

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
          ← {t("back")}
        </button>
      </div>

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

      {phase === "ready" && issue && <Body issue={issue} />}
    </div>
  );
}

function Body({ issue }: { issue: IssueDetailData }) {
  const { t } = useTranslation();
  const categoryName = t(`cat_${issue.category_code}`);
  const description =
    issue.final_description?.trim() || issue.user_description?.trim() || "";

  // Timeline newest-first so the current status reads at the top.
  const timeline = [...issue.status_history].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <>
      <div className="sh-detail__photo">
        {issue.photo_url ? (
          <img className="sh-detail__img" src={issue.photo_url} alt="" />
        ) : (
          <span className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
            {t("no_photo")}
          </span>
        )}
      </div>

      <div className="sh-detail__badgerow" style={{ gap: tokens.space[2] }}>
        <StatusBadge status={issue.status} />
      </div>

      {description && (
        <p className="sh-detail__desc" style={{ fontSize: tokens.fontSize.lg }}>
          {description}
        </p>
      )}

      <dl className="sh-facts" style={{ gap: tokens.space[3] }}>
        <div className="sh-facts__row">
          <dt className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
            {t("category")}
          </dt>
          <dd style={{ fontSize: tokens.fontSize.base }}>{categoryName}</dd>
        </div>

        {issue.urgency && (
          <div className="sh-facts__row">
            <dt className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
              {t("urgency")}
            </dt>
            <dd style={{ fontSize: tokens.fontSize.base }}>
              {t(`urgency_${issue.urgency}`)}
            </dd>
          </div>
        )}

        {(issue.lat != null && issue.lng != null) || issue.address_text ? (
          <div className="sh-facts__row">
            <dt className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
              {t("location")}
            </dt>
            <dd style={{ fontSize: tokens.fontSize.base }}>
              {issue.address_text ? (
                <span>{issue.address_text}</span>
              ) : null}
              {issue.lat != null && issue.lng != null ? (
                <span className="sh-meta" style={{ fontSize: tokens.fontSize.sm }}>
                  {issue.address_text ? " · " : ""}
                  {issue.lat.toFixed(5)}, {issue.lng.toFixed(5)}
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>

      {/* Resolution (city's result photo + note), when present. */}
      {issue.resolution && (
        <section
          className="sh-card sh-resolution"
          style={{
            padding: tokens.space[5],
            borderRadius: tokens.radius.lg,
            gap: tokens.space[3],
          }}
        >
          <h3 className="sh-step__title" style={{ fontSize: tokens.fontSize.lg }}>
            {t("result_photo")}
          </h3>
          {issue.resolution.result_photo_url ? (
            <div className="sh-detail__photo">
              <img
                className="sh-detail__img"
                src={issue.resolution.result_photo_url}
                alt=""
              />
            </div>
          ) : null}
          {issue.resolution.note ? (
            <p style={{ fontSize: tokens.fontSize.base }}>
              {issue.resolution.note}
            </p>
          ) : null}
        </section>
      )}

      {/* Status timeline (newest first). */}
      {timeline.length > 0 && (
        <section className="sh-timeline" style={{ gap: tokens.space[3] }}>
          <h3 className="sh-step__title" style={{ fontSize: tokens.fontSize.lg }}>
            {t("timeline")}
          </h3>
          <ol className="sh-timeline__list" style={{ gap: tokens.space[3] }}>
            {timeline.map((entry, i) => (
              <li key={i} className="sh-timeline__item" style={{ gap: tokens.space[2] }}>
                <span className="sh-timeline__dot" aria-hidden="true" />
                <div className="sh-timeline__content" style={{ gap: tokens.space[1] }}>
                  <p
                    className="sh-timeline__status"
                    style={{ fontSize: tokens.fontSize.base }}
                  >
                    {t(STATUS_KEY[entry.status])}
                  </p>
                  <p className="sh-meta" style={{ fontSize: tokens.fontSize.xs }}>
                    {formatDateTime(entry.created_at)}
                  </p>
                  {entry.note ? (
                    <p style={{ fontSize: tokens.fontSize.sm }}>{entry.note}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

export default IssueDetail;
