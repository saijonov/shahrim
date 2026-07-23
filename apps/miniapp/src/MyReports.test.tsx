import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Issue } from "@shahrim/api-client";

// Stub the shared API client so no real network call happens in tests.
const listMyIssues = vi.fn();
const getIssue = vi.fn();
vi.mock("@shahrim/api-client", () => ({
  createClient: () => ({ listMyIssues, getIssue }),
  ApiError: class ApiError extends Error {},
}));

import { MyReports } from "./MyReports";
import "./i18n";

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 1,
    user_id: 1,
    photo_url: "/media/photos/abc.jpg",
    ai_description: null,
    user_description: "Yo'lda katta chuqur bor",
    final_description: null,
    category_code: "road_damage",
    urgency: "high",
    status: "in_progress",
    lat: 39.65,
    lng: 66.96,
    address_text: null,
    district: null,
    created_at: "2026-07-20T09:00:00Z",
    updated_at: "2026-07-21T09:00:00Z",
    ...overrides,
  };
}

describe("MyReports (Phase 4 history)", () => {
  beforeEach(() => {
    listMyIssues.mockReset();
    getIssue.mockReset();
  });

  it("renders a report card with a status badge from listMyIssues", async () => {
    listMyIssues.mockResolvedValue([makeIssue()]);
    render(<MyReports onExit={vi.fn()} onOpen={vi.fn()} />);

    await waitFor(() => expect(listMyIssues).toHaveBeenCalledTimes(1));

    // Title (falls back to user_description) + category name render on the card.
    expect(await screen.findByText("Yo'lda katta chuqur bor")).toBeInTheDocument();
    expect(screen.getByText("Yo'l shikasti")).toBeInTheDocument();
    // Status badge shows the Uzbek label for in_progress.
    expect(screen.getByText("Jarayonda")).toBeInTheDocument();
  });

  it("opens the detail screen for the tapped issue", async () => {
    listMyIssues.mockResolvedValue([makeIssue({ id: 42 })]);
    const onOpen = vi.fn();
    render(<MyReports onExit={vi.fn()} onOpen={onOpen} />);

    const card = await screen.findByText("Yo'lda katta chuqur bor");
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalledWith(42);
  });

  it("shows the Uzbek empty state when there are no reports", async () => {
    listMyIssues.mockResolvedValue([]);
    render(<MyReports onExit={vi.fn()} onOpen={vi.fn()} />);

    expect(
      await screen.findByText("Hozircha murojaatlar yo'q"),
    ).toBeInTheDocument();
  });

  it("shows an error state with retry when the request fails", async () => {
    listMyIssues.mockRejectedValueOnce(new Error("boom"));
    render(<MyReports onExit={vi.fn()} onOpen={vi.fn()} />);

    // Error copy + retry button appear.
    const retry = await screen.findByText("Qayta urinish");
    expect(retry).toBeInTheDocument();

    // Retry re-issues the request; this time it succeeds.
    listMyIssues.mockResolvedValueOnce([makeIssue()]);
    fireEvent.click(retry);
    expect(await screen.findByText("Yo'lda katta chuqur bor")).toBeInTheDocument();
    expect(listMyIssues).toHaveBeenCalledTimes(2);
  });
});
