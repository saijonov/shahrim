import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { IssueDetail as IssueDetailData } from "@shahrim/api-client";

// Stub the shared API client so no real network call happens in tests.
const listMyIssues = vi.fn();
const getIssue = vi.fn();
const rateIssue = vi.fn();
vi.mock("@shahrim/api-client", () => ({
  createClient: () => ({ listMyIssues, getIssue, rateIssue }),
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
    rating: null,
    ...overrides,
  };
}

/** A resolved issue that has not been rated yet. */
function makeResolved(overrides: Partial<IssueDetailData> = {}): IssueDetailData {
  return makeDetail({
    status: "resolved",
    resolution: {
      result_photo_url: "/media/photos/fixed.jpg",
      note: "Chiroq almashtirildi",
      resolved_at: "2026-07-22T09:00:00Z",
    },
    ...overrides,
  });
}

describe("IssueDetail (Phase 4 detail)", () => {
  beforeEach(() => {
    listMyIssues.mockReset();
    getIssue.mockReset();
    rateIssue.mockReset();
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

  it("lets the citizen rate a resolved, unrated issue and shows a thank-you", async () => {
    getIssue.mockResolvedValue(makeResolved({ rating: null }));
    rateIssue.mockResolvedValue({
      stars: 4,
      comment: "Tez hal qilindi",
      created_at: "2026-07-23T09:00:00Z",
    });
    render(<IssueDetail id={7} onExit={vi.fn()} />);

    // The prompt + interactive star selector appear.
    expect(await screen.findByText("Bajarilgan ishni baholang")).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: "Yuborish" });
    // Disabled until at least one star is chosen.
    expect(submitBtn).toBeDisabled();

    // Choose 4 stars, add a comment, submit.
    fireEvent.click(screen.getByRole("button", { name: "4 yulduz" }));
    expect(submitBtn).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Izoh qoldiring (ixtiyoriy)"), {
      target: { value: "Tez hal qilindi" },
    });
    fireEvent.click(submitBtn);

    await waitFor(() =>
      expect(rateIssue).toHaveBeenCalledWith(7, {
        stars: 4,
        comment: "Tez hal qilindi",
      }),
    );

    // Thank-you + the submitted rating (read-only) + comment render;
    // the selector prompt is gone.
    expect(await screen.findByText("Rahmat!")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4 yulduz" })).toBeInTheDocument();
    expect(screen.getByText("Tez hal qilindi")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "4 yulduz" }),
    ).not.toBeInTheDocument();
  });

  it("shows an already-submitted rating read-only (no selector)", async () => {
    getIssue.mockResolvedValue(
      makeResolved({
        rating: { stars: 5, comment: "Ajoyib", created_at: "2026-07-22T10:00:00Z" },
      }),
    );
    render(<IssueDetail id={7} onExit={vi.fn()} />);

    expect(await screen.findByText("Sizning bahoyingiz")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "5 yulduz" })).toBeInTheDocument();
    expect(screen.getByText("Ajoyib")).toBeInTheDocument();
    // No interactive selector / submit while already rated.
    expect(
      screen.queryByRole("button", { name: "5 yulduz" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Yuborish" }),
    ).not.toBeInTheDocument();
  });

  it("shows no rating section when the issue is not resolved", async () => {
    getIssue.mockResolvedValue(makeDetail({ status: "in_progress" }));
    render(<IssueDetail id={7} onExit={vi.fn()} />);

    // Wait for the detail to render, then assert the rating UI is absent.
    expect(await screen.findByText("Ko'chada chiroq yonmayapti")).toBeInTheDocument();
    expect(screen.queryByText("Bajarilgan ishni baholang")).not.toBeInTheDocument();
    expect(screen.queryByText("Sizning bahoyingiz")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "1 yulduz" }),
    ).not.toBeInTheDocument();
  });
});
