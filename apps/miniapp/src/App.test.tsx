import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Stub the API client so the shell can never make a real network call in tests.
vi.mock("@shahrim/api-client", () => ({
  createClient: () => ({
    authTelegram: vi.fn(),
    me: vi.fn(),
  }),
}));

import { App } from "./App";

describe("App (Mini App auth shell)", () => {
  beforeEach(() => {
    // Simulate opening the page in a plain browser (no Telegram runtime).
    delete (window as unknown as { Telegram?: unknown }).Telegram;
  });

  it('renders the Uzbek "open in Telegram" notice outside Telegram', async () => {
    render(<App />);
    const notice = await screen.findByText(/Telegram ilovasi ichida oching/i);
    expect(notice).toBeInTheDocument();
  });

  it("does not crash and shows the app name", async () => {
    render(<App />);
    expect(await screen.findByText("Shahrim")).toBeInTheDocument();
  });
});
