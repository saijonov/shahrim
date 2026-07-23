import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createClient } from "@shahrim/api-client";
import type {
  IssueDetail as IssueDetailData,
  ApiClient,
  RatingInfo,
} from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import { StatusBadge } from "./MyReports";
import { STATUS_KEY, formatDateTime } from "./lib/status";
import { Icon } from "./components/Icon";
import { categoryIcon } from "./lib/categoryIcons";

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
          <Icon id="ic-back" size={18} />
          {t("back")}
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

      {phase === "ready" && issue && <Body issue={issue} client={client} />}
    </div>
  );
}

function Body({ issue, client }: { issue: IssueDetailData; client: ApiClient }) {
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
          <dd style={{ fontSize: tokens.fontSize.base }}>
            <Icon
              id={categoryIcon(issue.category_code)}
              size={18}
              className="sh-facts__ic"
            />
            {categoryName}
          </dd>
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

      {/* Rating (PRD §6.4) — only for resolved issues. */}
      {issue.status === "resolved" && (
        <RatingSection issue={issue} client={client} />
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

/**
 * Rating widget (PRD §6.4). Rendered only when the issue is resolved. If the
 * report is not yet rated it shows an interactive 1–5 star selector, an optional
 * comment and a submit button; after a successful submit (or if the issue was
 * already rated) it renders the given rating read-only. All copy is Uzbek.
 */
function RatingSection({
  issue,
  client,
}: {
  issue: IssueDetailData;
  client: ApiClient;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<RatingInfo | null>(issue.rating);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = () => {
    if (stars < 1 || sending) return;
    setSending(true);
    setFailed(false);
    client
      .rateIssue(issue.id, { stars, comment: comment.trim() || null })
      .then((info) => {
        setRating(info);
        setJustSubmitted(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setSending(false));
  };

  return (
    <section
      className="sh-card sh-rating"
      style={{
        padding: tokens.space[5],
        borderRadius: tokens.radius.lg,
        gap: tokens.space[3],
      }}
    >
      {rating ? (
        <>
          <h3
            className="sh-step__title"
            style={{ fontSize: tokens.fontSize.lg }}
          >
            {justSubmitted ? t("thank_you") : t("your_rating")}
          </h3>
          <StarDisplay stars={rating.stars} />
          {rating.comment ? (
            <p style={{ fontSize: tokens.fontSize.base }}>{rating.comment}</p>
          ) : null}
        </>
      ) : (
        <>
          <h3
            className="sh-step__title"
            style={{ fontSize: tokens.fontSize.lg }}
          >
            {t("rate_resolution")}
          </h3>

          <div
            className="sh-stars"
            role="group"
            aria-label={t("rate_resolution")}
            style={{ gap: tokens.space[1] }}
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = stars >= n;
              return (
                <button
                  key={n}
                  type="button"
                  className={`sh-star${filled ? " is-filled" : ""}`}
                  aria-label={t("star_aria", { n })}
                  aria-pressed={filled}
                  onClick={() => setStars(n)}
                  disabled={sending}
                >
                  <span aria-hidden="true">{filled ? "★" : "☆"}</span>
                </button>
              );
            })}
          </div>

          <textarea
            className="sh-textarea"
            style={{ borderRadius: tokens.radius.md, fontSize: tokens.fontSize.base }}
            placeholder={t("leave_comment")}
            aria-label={t("leave_comment")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={sending}
          />

          {failed && (
            <p className="sh-error" role="alert" style={{ fontSize: tokens.fontSize.sm }}>
              {t("rating_error")}
            </p>
          )}

          <button
            type="button"
            className="sh-btn sh-btn--primary"
            style={{
              padding: `${tokens.space[4]}px ${tokens.space[6]}px`,
              borderRadius: tokens.radius.lg,
              fontSize: tokens.fontSize.lg,
            }}
            onClick={submit}
            disabled={stars < 1 || sending}
          >
            {sending ? t("sending") : t("submit")}
          </button>
        </>
      )}
    </section>
  );
}

/** Read-only 1–5 star row. The count is exposed to assistive tech via a label. */
function StarDisplay({ stars }: { stars: number }) {
  const { t } = useTranslation();
  return (
    <div
      className="sh-stars sh-stars--readonly"
      role="img"
      aria-label={t("star_aria", { n: stars })}
      style={{ gap: tokens.space[1] }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`sh-star${stars >= n ? " is-filled" : ""}`}
          aria-hidden="true"
        >
          {stars >= n ? "★" : "☆"}
        </span>
      ))}
    </div>
  );
}

export default IssueDetail;
