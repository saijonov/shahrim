import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AdminIssue, Analytics } from "./api";

// Shared stub client — the same object is returned to every component so the
// dashboard, table and drawer all see the mocked data.
const api = {
  listCategories: vi.fn(),
  analytics: vi.fn(),
  listIssues: vi.fn(),
  mapPoints: vi.fn(),
  getIssue: vi.fn(),
  setStatus: vi.fn(),
  resolve: vi.fn(),
  uploadPhoto: vi.fn(),
};
vi.mock("./api", () => ({ createAdminClient: () => api }));

// The Leaflet map + recharts are jsdom-hostile — stub them.
vi.mock("./IssueMap", () => ({ IssueMap: () => <div data-testid="issue-map" /> }));
vi.mock("recharts", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Null = () => null;
  return {
    ResponsiveContainer: Pass,
    LineChart: Pass,
    BarChart: Pass,
    Line: Null,
    Bar: Pass,
    XAxis: Null,
    YAxis: Null,
    CartesianGrid: Null,
    Tooltip: Null,
    Legend: Null,
    Cell: Null,
  };
});

import { Dashboard } from "./Dashboard";
import "./i18n";

const issue: AdminIssue = {
  id: 7,
  user_id: 3,
  photo_url: null,
  ai_description: null,
  user_description: "Yo'lda chuqur",
  final_description: null,
  category_code: "road_damage",
  urgency: "high",
  status: "submitted",
  lat: 39.65,
  lng: 66.96,
  address_text: null,
  district: null,
  created_at: "2026-07-20T09:00:00Z",
  updated_at: "2026-07-20T09:00:00Z",
  reporter_name: "Ali Valiyev",
  reporter_phone: "+998901234567",
};

const analytics: Analytics = {
  total: 12,
  by_status: { submitted: 5, in_review: 2, in_progress: 3, resolved: 2, rejected: 0 },
  by_category: [{ code: "road_damage", name_uz: "Yo'l shikasti", count: 7 }],
  avg_resolution_hours: 30,
  avg_rating: 4.2,
  trend: [{ date: "2026-07-19", count: 4 }],
};

describe("Dashboard (analytics + queue)", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.listCategories.mockResolvedValue([
      { code: "road_damage", name_uz: "Yo'l shikasti", icon: null },
    ]);
    api.analytics.mockResolvedValue(analytics);
    api.listIssues.mockResolvedValue({ items: [issue], total: 1 });
    api.mapPoints.mockResolvedValue([]);
  });

  it("renders analytics cards and a table row from mocked data", async () => {
    render(<Dashboard adminName="Ali" onLogout={vi.fn()} />);

    // Analytics: the total-reports card value.
    expect(await screen.findByText("12")).toBeInTheDocument();
    // Average rating card, formatted with a star.
    expect(screen.getByText("4.2 ★")).toBeInTheDocument();

    // Queue: the reporter cell for the single mocked issue.
    expect(await screen.findByText("Ali Valiyev")).toBeInTheDocument();
    // Status badge (submitted → "Yuborildi") renders in the row.
    expect(screen.getAllByText("Yuborildi").length).toBeGreaterThan(0);

    // The data was actually fetched.
    expect(api.analytics).toHaveBeenCalled();
    expect(api.listIssues).toHaveBeenCalled();
  });
});
