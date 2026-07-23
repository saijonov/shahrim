import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "@shahrim/api-client";
import { STATUSES, URGENCIES } from "./lib/status";
import type { IssueFilters } from "./api";

export interface FiltersProps {
  categories: Category[];
  value: IssueFilters;
  /** Commit a new committed filter set (triggers a refetch upstream). */
  onChange: (next: IssueFilters) => void;
}

/**
 * Filter bar shared by the table + map (PRD §7). Category / status / urgency /
 * dates commit immediately on change; the free-text district commits on Apply
 * or Enter. Reset clears everything. All labels Uzbek.
 */
export function Filters({ categories, value, onChange }: FiltersProps) {
  const { t } = useTranslation();
  const [district, setDistrict] = useState(value.district ?? "");

  // Committing resets pagination to the first page.
  function commit(patch: Partial<IssueFilters>) {
    onChange({ ...value, ...patch, offset: 0 });
  }

  function applyDistrict(event: React.FormEvent) {
    event.preventDefault();
    commit({ district: district.trim() });
  }

  function reset() {
    setDistrict("");
    onChange({ limit: value.limit, offset: 0 });
  }

  return (
    <form className="adm-filters" onSubmit={applyDistrict} aria-label={t("filters")}>
      <label className="adm-filters__field">
        <span className="adm-field__label">{t("category")}</span>
        <select
          className="adm-select"
          value={value.category ?? ""}
          onChange={(e) => commit({ category: e.target.value })}
        >
          <option value="">{t("category_all")}</option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {t(`cat_${c.code}`, { defaultValue: c.name_uz })}
            </option>
          ))}
        </select>
      </label>

      <label className="adm-filters__field">
        <span className="adm-field__label">{t("status")}</span>
        <select
          className="adm-select"
          value={value.status ?? ""}
          onChange={(e) => commit({ status: e.target.value as IssueFilters["status"] })}
        >
          <option value="">{t("status_all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="adm-filters__field">
        <span className="adm-field__label">{t("urgency")}</span>
        <select
          className="adm-select"
          value={value.urgency ?? ""}
          onChange={(e) => commit({ urgency: e.target.value as IssueFilters["urgency"] })}
        >
          <option value="">{t("urgency_all")}</option>
          {URGENCIES.map((u) => (
            <option key={u} value={u}>
              {t(`urgency_${u}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="adm-filters__field">
        <span className="adm-field__label">{t("date_from")}</span>
        <input
          className="adm-input"
          type="date"
          value={value.date_from ?? ""}
          onChange={(e) => commit({ date_from: e.target.value })}
        />
      </label>

      <label className="adm-filters__field">
        <span className="adm-field__label">{t("date_to")}</span>
        <input
          className="adm-input"
          type="date"
          value={value.date_to ?? ""}
          onChange={(e) => commit({ date_to: e.target.value })}
        />
      </label>

      <label className="adm-filters__field">
        <span className="adm-field__label">{t("district")}</span>
        <input
          className="adm-input"
          type="text"
          placeholder={t("district_placeholder")}
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          onBlur={() => commit({ district: district.trim() })}
        />
      </label>

      <div className="adm-filters__actions">
        <button type="submit" className="adm-btn adm-btn--primary adm-btn--sm">
          {t("apply")}
        </button>
        <button
          type="button"
          className="adm-btn adm-btn--secondary adm-btn--sm"
          onClick={reset}
        >
          {t("reset")}
        </button>
      </div>
    </form>
  );
}

export default Filters;
