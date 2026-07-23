import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { IssueDetail as IssueDetailData } from "@shahrim/api-client";

// Stub the shared API client so no real network call happens in tests.
const listMyIssues = vi.fn();
const getIssue = vi.fn();
vi.mock("@shahrim/api-client", () => ({
  createClient: () => ({ listMyIssues, getIssue }),
  ApiError: class ApiError extends Error {},
}));

import { IssueDetail } from "./IssueDetail";
import "./i18n";

function makeDetail(overrides: Partial<IssueDetailData> = {}): IssueDetailData {
  return {
    id: 7,
    user_id: 1,
    photo_url: "/media/photos/abc.jpg",
    ai_description: null,
    user_description: "Ko'chada chiroq yonmayapti",
    final_description: null,
    category_code: "street_light",
    urgency: "medium",
    status: "in_progress",
    lat: 39.65,
    lng: 66.96,
    address_text: "Registon ko'chasi",
    district: null,
    created_at: "2026-07-20T09:00:00Z",
    updated_at: "2026-07-21T09:00:00Z",
    status_history: [
      { status: "submitted", note: null, created_at: "2026-07-20T09:00:00Z" },
      {
        status: "in_progress",
        note: "Ish boshlandi",
        created_at: "2026-07-21T09:00:00Z",
      },
    ],
    resolution: null,
    ...overrides,
  };
}

describe("IssueDetail (Phase 4 detail)", () => {
  beforeEach(() => {
    listMyIssues.mockReset();
    getIssue.mockReset();
  });

  it("renders the description, category, urgency and a status timeline", async () => {
    getIssue.mockResolvedValue(makeDetail());
    render(<IssueDetail id={7} onExit={vi.fn()} />);

    await waitFor(() => expect(getIssue).toHaveBeenCalledWith(7));

    // Description + category + urgency.
    expect(
      await screen.findByText("Ko'chada chiroq yonmayapti"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ko'cha yoritilishi")).toBeInTheDocument();
    expect(screen.getByText("O'rta")).toBeInTheDocument();

    // Timeline heading + an entry label + its note.
    expect(screen.getByText("Holatlar tarixi")).toBeInTheDocument();
    expect(screen.getByText("Ish boshlandi")).toBeInTheDocument();
    // "submitted" status label appears in the timeline.
    expect(screen.getByText("Yuborildi")).toBeInTheDocument();
  });

  it("shows the result-photo section when the issue is resolved", async () => {
    getIssue.mockResolvedValue(
      makeDetail({
        status: "resolved",
        resolution: {
          result_photo_url: "/media/photos/fixed.jpg",
          note: "Chiroq almashtirildi",
          resolved_at: "2026-07-22T09:00:00Z",
        },
      }),
    );
    render(<IssueDetail id={7} onExit={vi.fn()} />);

    // "Natija surati" heading + the resolution note render.
    expect(await screen.findByText("Natija surati")).toBeInTheDocument();
    expect(screen.getByText("Chiroq almashtirildi")).toBeInTheDocument();
  });
});
