import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// The report flow talks to the shared API client — stub it so no real network
// call happens. uploadPhoto/createIssue resolve with backend-shaped values.
const uploadPhoto = vi.fn();
const createIssue = vi.fn();
const listCategories = vi.fn();
const analyzePhoto = vi.fn();
vi.mock("@shahrim/api-client", () => ({
  createClient: () => ({ uploadPhoto, createIssue, listCategories, analyzePhoto }),
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
    analyzePhoto.mockReset();
    listCategories.mockResolvedValue([]);
    uploadPhoto.mockResolvedValue({ photo_url: "/media/photos/abc.jpg" });
    createIssue.mockResolvedValue({ id: 1 });
    // Default AI analysis: a valid city issue with two Uzbek suggestions.
    analyzePhoto.mockResolvedValue({
      suggestions: ["Yo'lda katta chuqur bor", "Yo'l qoplamasi buzilgan"],
      category: "road_damage",
      urgency: "high",
      is_valid_city_issue: true,
    });

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

  it("runs AI analysis after upload and shows suggestion chips that fill the description", async () => {
    render(<ReportFlow onExit={vi.fn()} />);

    const input = screen.getByTestId("photo-input") as HTMLInputElement;
    const file = new File(["x"], "photo.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    // Analysis is triggered with the uploaded photo URL.
    await waitFor(() => expect(analyzePhoto).toHaveBeenCalledTimes(1));
    expect(analyzePhoto).toHaveBeenCalledWith("/media/photos/abc.jpg");

    // Advance to the description step; the AI suggestion chips render.
    fireEvent.click(screen.getByText("Keyingi"));
    expect(await screen.findByText("Tavsiya etilgan tavsiflar")).toBeInTheDocument();
    const chip = await screen.findByText("Yo'lda katta chuqur bor");

    // Tapping a chip fills the (still editable) description textarea.
    fireEvent.click(chip);
    const textarea = screen.getByLabelText("Muammoni tavsiflang") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Yo'lda katta chuqur bor");
  });

  it("carries the AI-suggested category and urgency through to submit", async () => {
    render(<ReportFlow onExit={vi.fn()} />);

    const input = screen.getByTestId("photo-input") as HTMLInputElement;
    const file = new File(["x"], "photo.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(analyzePhoto).toHaveBeenCalledTimes(1));

    // photo → description → category
    fireEvent.click(screen.getByText("Keyingi"));
    await screen.findByText("Muammoni tavsiflang");
    fireEvent.click(screen.getByText("Keyingi"));

    // The AI-suggested category ("Yo'l shikasti" / road_damage) is pre-selected.
    const roadDamage = await screen.findByText("Yo'l shikasti");
    expect(roadDamage).toHaveAttribute("aria-pressed", "true");

    // category → location, then submit.
    fireEvent.click(screen.getByText("Keyingi"));
    await screen.findByTestId("location-map");
    fireEvent.click(screen.getByText("Yuborish"));

    await waitFor(() => expect(createIssue).toHaveBeenCalledTimes(1));
    expect(createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ category_code: "road_damage", urgency: "high" }),
    );
  });

  it("asks the user to retake when the photo is not a valid city issue", async () => {
    analyzePhoto.mockResolvedValue({
      suggestions: [],
      category: "other",
      urgency: "medium",
      is_valid_city_issue: false,
    });

    render(<ReportFlow onExit={vi.fn()} />);

    const input = screen.getByTestId("photo-input") as HTMLInputElement;
    const file = new File(["x"], "selfie.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(analyzePhoto).toHaveBeenCalledTimes(1));

    // The friendly Uzbek retake message appears.
    expect(
      await screen.findByText(
        "Bu shahar muammosiga o'xshamaydi. Qaytadan suratga oling.",
      ),
    ).toBeInTheDocument();

    // Next is blocked (photoUrl was cleared): we stay on the photo step.
    fireEvent.click(screen.getByText("Keyingi"));
    expect(screen.getByText("Muammo yuborish")).toBeInTheDocument();
    expect(screen.queryByText("Muammoni tavsiflang")).not.toBeInTheDocument();
  });
});
