import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import tokens from "@shahrim/ui-tokens";
import { STATUSES, STATUS_KEY, STATUS_COLOR, formatShortDate } from "./lib/status";
import type { Analytics } from "./api";

function formatNumber(value: number | null): string {
  if (value == null) return "—";
  return String(Math.round(value));
}

function formatRating(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(1);
}

/** A single summary tile. */
function Card({
  label,
  value,
  accent,
  suffix,
}: {
  label: string;
  value: string;
  accent?: string;
  suffix?: string;
}) {
  return (
    <div className="adm-card adm-stat" style={{ borderTopColor: accent ?? tokens.color.primary }}>
      <span className="adm-stat__label">{label}</span>
      <span className="adm-stat__value" style={{ fontFamily: tokens.font.display }}>
        {value}
        {suffix ? <span className="adm-stat__suffix"> {suffix}</span> : null}
      </span>
    </div>
  );
}

export interface AnalyticsRowProps {
  data: Analytics;
}

/**
 * Analytics band (PRD §7): summary tiles (total, per-status counts, avg
 * resolution hours, avg rating) + a 30-day trend line + a category bar chart.
 * Colours come from ui-tokens; charts stay clean and readable.
 */
export function AnalyticsRow({ data }: AnalyticsRowProps) {
  const { t } = useTranslation();

  const trendData = data.trend.map((p) => ({
    date: formatShortDate(p.date),
    count: p.count,
  }));

  const categoryData = data.by_category.map((c) => ({
    name: t(`cat_${c.code}`, { defaultValue: c.name_uz }),
    count: c.count,
  }));

  const axisColor = tokens.color.muted;

  return (
    <section className="adm-analytics" aria-label={t("analytics")}>
      <div className="adm-stats">
        <Card label={t("total_reports")} value={String(data.total)} accent={tokens.color.primary} />
        {STATUSES.map((s) => (
          <Card
            key={s}
            label={t(STATUS_KEY[s])}
            value={String(data.by_status?.[s] ?? 0)}
            accent={STATUS_COLOR[s]}
          />
        ))}
        <Card
          label={t("avg_resolution")}
          value={formatNumber(data.avg_resolution_hours)}
          suffix={data.avg_resolution_hours == null ? undefined : t("hours")}
          accent={tokens.color.accent}
        />
        <Card
          label={t("avg_rating")}
          value={data.avg_rating == null ? "—" : `${formatRating(data.avg_rating)} ★`}
          accent={tokens.color.accent}
        />
      </div>

      <div className="adm-charts">
        <div className="adm-card adm-chart">
          <h3 className="adm-chart__title">{t("trend")}</h3>
          <div className="adm-chart__body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid stroke={tokens.color.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} allowDecimals={false} width={40} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={tokens.color.primary}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="adm-card adm-chart">
          <h3 className="adm-chart__title">{t("most_common")}</h3>
          <div className="adm-chart__body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                <CartesianGrid stroke={tokens.color.line} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: axisColor, fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={64}
                />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} allowDecimals={false} width={40} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={tokens.color.accent}>
                  {categoryData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i % 2 === 0 ? tokens.color.accent : tokens.color.primary}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AnalyticsRow;
