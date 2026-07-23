import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AdminIssueDetail } from "./api";

const api = {
  getIssue: vi.fn(),
  setStatus: vi.fn(),
  resolve: vi.fn(),
  uploadPhoto: vi.fn(),
};
vi.mock("./api", () => ({ createAdminClient: () => api }));

import { IssueDetailDrawer } from "./IssueDetailDrawer";
import "./i18n";

const detail: AdminIssueDetail = {
  id: 7,
  user_id: 3,
  photo_url: "/media/photos/x.jpg",
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
  status_history: [{ status: "submitted", note: null, created_at: "2026-07-20T09:00:00Z" }],
  resolution: null,
};

describe("IssueDetailDrawer actions", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getIssue.mockResolvedValue(detail);
    api.setStatus.mockResolvedValue({ ...detail });
    api.resolve.mockResolvedValue({ ...detail, status: "resolved" });
    api.uploadPhoto.mockResolvedValue({ photo_url: "/media/photos/result.jpg" });
  });

  it("calls setStatus with the chosen status", async () => {
    const onChanged = vi.fn();
    render(<IssueDetailDrawer id={7} onClose={vi.fn()} onChanged={onChanged} />);

    // Wait for the loaded detail, then move the issue to in_progress.
    const btn = await screen.findByRole("button", { name: "Jarayonda" });
    fireEvent.click(btn);

    await waitFor(() =>
      expect(api.setStatus).toHaveBeenCalledWith(7, {
        status: "in_progress",
        note: undefined,
      }),
    );
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("blocks rejecting without a reason, then rejects with the note", async () => {
    render(<IssueDetailDrawer id={7} onClose={vi.fn()} onChanged={vi.fn()} />);

    const reject = await screen.findByRole("button", { name: "Rad etildi" });
    fireEvent.click(reject);

    // Without a note, the Uzbek reason prompt shows and no call is made.
    expect(await screen.findByText("Rad etish sababini kiriting.")).toBeInTheDocument();
    expect(api.setStatus).not.toHaveBeenCalled();

    // Provide a reason and reject again.
    fireEvent.change(screen.getByLabelText("Izoh"), {
      target: { value: "Bu shahar muammosi emas" },
    });
    fireEvent.click(reject);
    await waitFor(() =>
      expect(api.setStatus).toHaveBeenCalledWith(7, {
        status: "rejected",
        note: "Bu shahar muammosi emas",
      }),
    );
  });

  it("uploads the result photo then calls resolve", async () => {
    render(<IssueDetailDrawer id={7} onClose={vi.fn()} onChanged={vi.fn()} />);

    // Attach a result photo.
    const fileInput = (await screen.findByLabelText(
      "Natija suratini tanlang",
    )) as HTMLInputElement;
    const file = new File(["x"], "result.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Hal qilish" }));

    await waitFor(() => expect(api.uploadPhoto).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(api.resolve).toHaveBeenCalledWith(7, {
        result_photo_url: "/media/photos/result.jpg",
        note: undefined,
      }),
    );
  });
});
