import { useTranslation } from "react-i18next";
import tokens from "@shahrim/ui-tokens";
import { formatDate } from "./lib/status";
import { StatusBadge, UrgencyDot } from "./ui";
import type { AdminIssue } from "./api";

export interface IssueTableProps {
  items: AdminIssue[];
  total: number;
  limit: number;
  offset: number;
  onOpen: (id: number) => void;
  onPage: (offset: number) => void;
}

/**
 * Issue queue (PRD §7): a sortable-by-recency table — date / category / status /
 * urgency / reporter — with limit/offset paging. Rows are keyboard-openable.
 */
export function IssueTable({
  items,
  total,
  limit,
  offset,
  onOpen,
  onPage,
}: IssueTableProps) {
  const { t } = useTranslation();

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <section className="adm-card adm-queue" aria-label={t("issue_queue")}>
      <header className="adm-queue__head">
        <h3 className="adm-queue__title" style={{ fontFamily: tokens.font.display }}>
          {t("issue_queue")}
        </h3>
        <span className="adm-muted adm-queue__count">
          {t("showing", { from, to, total })}
        </span>
      </header>

      {items.length === 0 ? (
        <p className="adm-muted adm-queue__empty">{t("no_issues")}</p>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">{t("date")}</th>
                <th scope="col">{t("category")}</th>
                <th scope="col">{t("status")}</th>
                <th scope="col">{t("urgency")}</th>
                <th scope="col">{t("reporter")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((issue) => (
                <tr
                  key={issue.id}
                  className="adm-table__row"
                  tabIndex={0}
                  role="button"
                  onClick={() => onOpen(issue.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(issue.id);
                    }
                  }}
                >
                  <td>{formatDate(issue.created_at)}</td>
                  <td>{t(`cat_${issue.category_code}`, { defaultValue: issue.category_code })}</td>
                  <td>
                    <StatusBadge status={issue.status} />
                  </td>
                  <td>
                    <UrgencyDot urgency={issue.urgency} />
                  </td>
                  <td>{issue.reporter_name?.trim() || t("anonymous")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="adm-queue__foot">
        <button
          type="button"
          className="adm-btn adm-btn--secondary adm-btn--sm"
          disabled={!hasPrev}
          onClick={() => onPage(Math.max(0, offset - limit))}
        >
          ← {t("prev")}
        </button>
        <button
          type="button"
          className="adm-btn adm-btn--secondary adm-btn--sm"
          disabled={!hasNext}
          onClick={() => onPage(offset + limit)}
        >
          {t("next")} →
        </button>
      </footer>
    </section>
  );
}

export default IssueTable;
