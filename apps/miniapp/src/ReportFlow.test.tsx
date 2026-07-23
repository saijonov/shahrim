import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// The report flow talks to the shared API client — stub it so no real network
// call happens. uploadPhoto/createIssue resolve with backend-shaped values.
const uploadPhoto = vi.fn();
const createIssue = vi.fn();
const listCategories = vi.fn();
vi.mock("@shahrim/api-client", () => ({
  createClient: () => ({ uploadPhoto, createIssue, listCategories }),
  ApiError: class ApiError extends Error {},
}));

// Keep image compression out of jsdom (no real canvas): return the file as-is.
vi.mock("./lib/image", () => ({
  compressImage: (file: File) => Promise.resolve(file),
}));

// The Leaflet map is lazy-loaded on the location step; mock it so jsdom never
// has to mount real Leaflet.
vi.mock("./LocationMap", () => ({
  LocationMap: () => <div data-testid="location-map" />,
}));

import { ReportFlow } from "./ReportFlow";
import "./i18n";

describe("ReportFlow (Phase 2 report flow)", () => {
  beforeEach(() => {
    uploadPhoto.mockReset();
    createIssue.mockReset();
    listCategories.mockReset();
    listCategories.mockResolvedValue([]);
    uploadPhoto.mockResolvedValue({ photo_url: "/media/photos/abc.jpg" });
    createIssue.mockResolvedValue({ id: 1 });

    // jsdom lacks the object-URL API used for the local photo preview.
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: () => "blob:mock",
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: () => undefined,
    });

    // Deterministic geolocation.
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({
            coords: { latitude: 39.65, longitude: 66.96 },
          } as GeolocationPosition),
      },
    });
  });

  it("shows the photo step first with the Uzbek report title", () => {
    render(<ReportFlow onExit={vi.fn()} />);
    // "Muammo yuborish" is the report title on the first step.
    expect(screen.getByText("Muammo yuborish")).toBeInTheDocument();
    expect(screen.getByText("Surat qo'shing")).toBeInTheDocument();
  });

  it("uploads a photo then advances to the Uzbek description step", async () => {
    render(<ReportFlow onExit={vi.fn()} />);

    const input = screen.getByTestId("photo-input") as HTMLInputElement;
    const file = new File(["x"], "photo.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    // Upload is invoked with the (compressed) file.
    await waitFor(() => expect(uploadPhoto).toHaveBeenCalledTimes(1));

    // Advance to the description step and assert an Uzbek label appears.
    fireEvent.click(screen.getByText("Keyingi"));
    expect(await screen.findByText("Muammoni tavsiflang")).toBeInTheDocument();
  });

  it("blocks advancing past the photo step until a photo exists", () => {
    render(<ReportFlow onExit={vi.fn()} />);
    fireEvent.click(screen.getByText("Keyingi"));
    // Still on the photo step; the Uzbek "photo required" alert shows.
    expect(screen.getByText("Iltimos, avval surat qo'shing.")).toBeInTheDocument();
  });
});
