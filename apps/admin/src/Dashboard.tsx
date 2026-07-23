import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import { createAdminClient } from "./api";
import type { AdminIssue, Analytics, IssueFilters, MapPoint } from "./api";
import { Filters } from "./Filters";
import { IssueTable } from "./IssueTable";
import { IssueDetailDrawer } from "./IssueDetailDrawer";
import { Icon } from "./components/Icon";
import { Spinner, ErrorRetry } from "./ui";

// Code-split the two heaviest dependencies out of the initial bundle: the map
// (Leaflet + leaflet.heat) and the analytics charts (Recharts) each load into
// their own async chunk on demand, so the login + shell entry stays lean. The
// `.then(m => ...)` unwraps the named export React.lazy expects as `default`.
const AnalyticsRow = lazy(() =>
  import("./AnalyticsRow").then((m) => ({ default: m.AnalyticsRow })),
);
const IssueMap = lazy(() => import("./IssueMap").then((m) => ({ default: m.IssueMap })));

const PAGE_SIZE = 20;

export interface DashboardProps {
  adminName: string;
  onLogout: () => void;
}

/**
 * Operator dashboard shell (PRD §7): header + filter bar, an analytics band,
 * the city map (heatmap + urgency pins) and the paginated issue queue. Selecting
 * a pin or a table row opens the detail drawer; mutations there refetch here.
 */
export function Dashboard({ adminName, onLogout }: DashboardProps) {
  const { t } = useTranslation();
  const api = useMemo(() => createAdminClient(), []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [points, setPoints] = useState<MapPoint[]>([]);

  const [filters, setFilters] = useState<IssueFilters>({ limit: PAGE_SIZE, offset: 0 });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [listPhase, setListPhase] = useState<"loading" | "error" | "ready">("loading");

  const offset = filters.offset ?? 0;

  // Categories once (reference data for the filter dropdown + labels).
  useEffect(() => {
    api
      .listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [api]);

  // Analytics — a global view; reloaded on demand after mutations.
  const loadAnalytics = useCallback(() => {
    api
      .analytics()
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [api]);

  useEffect(() => loadAnalytics(), [loadAnalytics]);

  // Issues + map points follow the filters.
  const loadIssues = useCallback(() => {
    setListPhase("loading");
    Promise.all([api.listIssues(filters), api.mapPoints(filters)])
      .then(([list, mapPoints]) => {
        setIssues(list.items);
        setTotal(list.total);
        setPoints(mapPoints);
        setListPhase("ready");
      })
      .catch(() => setListPhase("error"));
  }, [api, filters]);

  useEffect(() => loadIssues(), [loadIssues]);

  const reloadAll = useCallback(() => {
    loadIssues();
    loadAnalytics();
  }, [loadIssues, loadAnalytics]);

  return (
    <div className="adm-app">
      <div className="adm-topbar" aria-hidden="true" />

      <header className="adm-header">
        <div className="adm-brandrow" style={{ gap: tokens.space[3] }}>
          <Icon id="logo-mark" size={34} className="adm-logo" />
          <div>
            <h1 className="adm-wordmark" style={{ fontSize: tokens.fontSize.xl }}>
              {t("app_name")}
            </h1>
            <p className="adm-brandsub">{t("admin_dashboard")}</p>
          </div>
        </div>
        <div className="adm-header__right">
          {adminName ? <span className="adm-muted">{adminName}</span> : null}
          <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={onLogout}>
            {t("logout")}
          </button>
        </div>
      </header>

      <main className="adm-content">
        <Filters categories={categories} value={filters} onChange={setFilters} />

        {analytics ? (
          <Suspense
            fallback={
              <div className="adm-card" style={{ padding: tokens.space[6] }}>
                <Spinner />
              </div>
            }
          >
            <AnalyticsRow data={analytics} />
          </Suspense>
        ) : (
          <div className="adm-card" style={{ padding: tokens.space[6] }}>
            <Spinner />
          </div>
        )}

        <div className="adm-split">
          <section className="adm-card adm-mapcard" aria-label={t("map_title")}>
            <Suspense
              fallback={
                <div className="adm-center adm-map" style={{ padding: tokens.space[6] }}>
                  <Spinner />
                </div>
              }
            >
              <IssueMap points={points} onSelect={setSelectedId} />
            </Suspense>
          </section>

          <div className="adm-split__side">
            {listPhase === "loading" && (
              <div className="adm-card" style={{ padding: tokens.space[6] }}>
                <Spinner />
              </div>
            )}
            {listPhase === "error" && (
              <div className="adm-card" style={{ padding: tokens.space[6] }}>
                <ErrorRetry onRetry={() => loadIssues()} />
              </div>
            )}
            {listPhase === "ready" && (
              <IssueTable
                items={issues}
                total={total}
                limit={filters.limit ?? PAGE_SIZE}
                offset={offset}
                onOpen={setSelectedId}
                onPage={(next) => setFilters((f) => ({ ...f, offset: next }))}
              />
            )}
          </div>
        </div>
      </main>

      {selectedId != null && (
        <IssueDetailDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={reloadAll}
        />
      )}
    </div>
  );
}

export default Dashboard;
