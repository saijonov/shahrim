import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { IssueStatus } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import { createAdminClient } from "./api";
import type { AdminIssueDetail } from "./api";
import { STATUS_KEY, formatDateTime } from "./lib/status";
import { StatusBadge, UrgencyDot, Spinner, ErrorRetry } from "./ui";

// Statuses an operator can move an issue to via the quick buttons. `resolved`
// has its own section (needs an optional result photo); `submitted` is only ever
// the initial state, never a manual target.
const STATUS_ACTIONS: IssueStatus[] = ["in_review", "in_progress", "rejected"];

export interface IssueDetailDrawerProps {
  id: number;
  onClose: () => void;
  /** Fired after any successful mutation so the list/map/analytics can refetch. */
  onChanged: () => void;
}

type Phase = "loading" | "error" | "ready";

/**
 * Issue detail drawer (PRD §7): photo, description, reporter, category, urgency,
 * location and a status timeline. Actions: set status (rejected requires a
 * reason) and Resolve (optional result photo → upload → resolve). After any
 * action the detail reloads and the parent refetches. Notifying the citizen is
 * handled server-side.
 */
export function IssueDetailDrawer({ id, onClose, onChanged }: IssueDetailDrawerProps) {
  const { t } = useTranslation();
  const api = useMemo(() => createAdminClient(), []);

  const [phase, setPhase] = useState<Phase>("loading");
  const [issue, setIssue] = useState<AdminIssueDetail | null>(null);

  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    let alive = true;
    setPhase("loading");
    api
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
  }, [api, id]);

  useEffect(() => load(), [load]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function afterMutation() {
    // Refresh this drawer's detail and let the dashboard refetch its data.
    load();
    onChanged();
  }

  async function changeStatus(status: IssueStatus) {
    if (busy) return;
    setActionError(null);
    setFlash(null);
    if (status === "rejected" && !note.trim()) {
      setActionError(t("reject_reason"));
      return;
    }
    setBusy(true);
    try {
      await api.setStatus(id, { status, note: note.trim() || undefined });
      setNote("");
      setFlash(t("status_changed_ok"));
      await afterMutation();
    } catch {
      setActionError(t("action_error"));
    } finally {
      setBusy(false);
    }
  }

  async function resolve() {
    if (busy) return;
    setActionError(null);
    setFlash(null);
    setBusy(true);
    try {
      let resultPhotoUrl: string | undefined;
      if (resultFile) {
        const up = await api.uploadPhoto(resultFile);
        resultPhotoUrl = up.photo_url;
      }
      await api.resolve(id, {
        result_photo_url: resultPhotoUrl,
        note: note.trim() || undefined,
      });
      setNote("");
      setResultFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setFlash(t("resolved_ok"));
      await afterMutation();
    } catch {
      setActionError(t("action_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adm-drawer" role="dialog" aria-modal="true" aria-label={t("detail_title")}>
      <button
        type="button"
        className="adm-drawer__scrim"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div className="adm-drawer__panel">
        <header className="adm-drawer__head">
          <h2 className="adm-drawer__title" style={{ fontFamily: tokens.font.display }}>
            {t("detail_title")}
          </h2>
          <button type="button" className="adm-linkbtn" onClick={onClose}>
            {t("close")} ✕
          </button>
        </header>

        {phase === "loading" && <Spinner />}
        {phase === "error" && <ErrorRetry onRetry={() => load()} />}

        {phase === "ready" && issue && (
          <div className="adm-drawer__body">
            <div className="adm-detail__photo">
              {issue.photo_url ? (
                <img className="adm-detail__img" src={issue.photo_url} alt="" />
              ) : (
                <span className="adm-muted">{t("no_photo")}</span>
              )}
            </div>

            <div className="adm-detail__badges">
              <StatusBadge status={issue.status} />
              <UrgencyDot urgency={issue.urgency} />
            </div>

            {(issue.final_description || issue.user_description || issue.ai_description) && (
              <p className="adm-detail__desc">
                {issue.final_description?.trim() ||
                  issue.user_description?.trim() ||
                  issue.ai_description?.trim()}
              </p>
            )}

            <dl className="adm-facts">
              <div className="adm-facts__row">
                <dt>{t("category")}</dt>
                <dd>{t(`cat_${issue.category_code}`, { defaultValue: issue.category_code })}</dd>
              </div>
              <div className="adm-facts__row">
                <dt>{t("reporter")}</dt>
                <dd>{issue.reporter_name?.trim() || t("anonymous")}</dd>
              </div>
              {issue.reporter_phone ? (
                <div className="adm-facts__row">
                  <dt>{t("phone")}</dt>
                  <dd>
                    <a href={`tel:${issue.reporter_phone}`}>{issue.reporter_phone}</a>
                  </dd>
                </div>
              ) : null}
              {issue.address_text ? (
                <div className="adm-facts__row">
                  <dt>{t("location")}</dt>
                  <dd>{issue.address_text}</dd>
                </div>
              ) : null}
              {issue.lat != null && issue.lng != null ? (
                <div className="adm-facts__row">
                  <dt>{t("coordinates")}</dt>
                  <dd className="adm-muted">
                    {issue.lat.toFixed(5)}, {issue.lng.toFixed(5)}
                  </dd>
                </div>
              ) : null}
            </dl>

            {/* Resolution the city already recorded, if any. */}
            {issue.resolution && (
              <section className="adm-card adm-resolution">
                <h3 className="adm-section__title">{t("result_photo")}</h3>
                {issue.resolution.result_photo_url ? (
                  <div className="adm-detail__photo">
                    <img
                      className="adm-detail__img"
                      src={issue.resolution.result_photo_url}
                      alt=""
                    />
                  </div>
                ) : null}
                {issue.resolution.note ? <p>{issue.resolution.note}</p> : null}
              </section>
            )}

            {/* Timeline (newest first). */}
            {issue.status_history.length > 0 && (
              <section className="adm-timeline">
                <h3 className="adm-section__title">{t("timeline")}</h3>
                <ol className="adm-timeline__list">
                  {[...issue.status_history]
                    .sort(
                      (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime(),
                    )
                    .map((entry, i) => (
                      <li key={i} className="adm-timeline__item">
                        <span className="adm-timeline__dot" aria-hidden="true" />
                        <div className="adm-timeline__content">
                          <p className="adm-timeline__status">{t(STATUS_KEY[entry.status])}</p>
                          <p className="adm-muted adm-timeline__time">
                            {formatDateTime(entry.created_at)}
                          </p>
                          {entry.note ? <p>{entry.note}</p> : null}
                        </div>
                      </li>
                    ))}
                </ol>
              </section>
            )}

            {/* Actions. */}
            <section className="adm-actions">
              <h3 className="adm-section__title">{t("change_status")}</h3>

              <label className="adm-field">
                <span className="adm-field__label">{t("note")}</span>
                <textarea
                  className="adm-textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </label>

              <div className="adm-actions__row">
                {STATUS_ACTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={
                      s === "rejected"
                        ? "adm-btn adm-btn--danger adm-btn--sm"
                        : "adm-btn adm-btn--secondary adm-btn--sm"
                    }
                    disabled={busy}
                    onClick={() => changeStatus(s)}
                  >
                    {t(STATUS_KEY[s])}
                  </button>
                ))}
              </div>

              <div className="adm-resolvebox">
                <h4 className="adm-section__title">{t("resolve")}</h4>
                <label className="adm-field">
                  <span className="adm-field__label">{t("resolve_photo")}</span>
                  <input
                    ref={fileRef}
                    className="adm-input"
                    type="file"
                    accept="image/*"
                    aria-label={t("resolve_photo")}
                    onChange={(e) => setResultFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="button"
                  className="adm-btn adm-btn--primary adm-btn--sm"
                  disabled={busy}
                  onClick={() => resolve()}
                >
                  {busy ? t("uploading") : t("resolve")}
                </button>
              </div>

              {actionError ? (
                <p className="adm-error" role="alert">
                  {actionError}
                </p>
              ) : null}
              {flash ? (
                <p className="adm-flash" role="status">
                  {flash}
                </p>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default IssueDetailDrawer;
