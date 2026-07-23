import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the api layer so no real network call happens. vi.hoisted keeps the
// stub fns initialised before the hoisted vi.mock factory runs.
const { login, setToken } = vi.hoisted(() => ({ login: vi.fn(), setToken: vi.fn() }));
vi.mock("./api", () => ({
  createAdminClient: () => ({ login }),
  isUnauthorized: (e: unknown) => (e as { status?: number })?.status === 401,
  setToken,
}));

import { Login } from "./Login";
import "./i18n";

describe("Login (admin auth)", () => {
  beforeEach(() => {
    login.mockReset();
    setToken.mockReset();
  });

  it("renders the Uzbek login form", () => {
    render(<Login onSuccess={vi.fn()} />);
    // Title + labelled fields + submit button, all Uzbek.
    expect(screen.getByRole("heading", { name: "Tizimga kirish" })).toBeInTheDocument();
    expect(screen.getByLabelText("Elektron pochta")).toBeInTheDocument();
    expect(screen.getByLabelText("Parol")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirish" })).toBeInTheDocument();
  });

  it("submitting calls login and stores the token on success", async () => {
    login.mockResolvedValue({
      access_token: "tok-123",
      token_type: "bearer",
      admin: { id: 1, email: "operator@shahrim.uz", first_name: "Ali", role: "admin" },
    });
    const onSuccess = vi.fn();
    render(<Login onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("Elektron pochta"), {
      target: { value: "operator@shahrim.uz" },
    });
    fireEvent.change(screen.getByLabelText("Parol"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirish" }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith("operator@shahrim.uz", "secret"),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(setToken).toHaveBeenCalledWith("tok-123");
  });

  it("shows the Uzbek invalid-credentials message on 401", async () => {
    login.mockRejectedValueOnce({ status: 401 });
    render(<Login onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Elektron pochta"), {
      target: { value: "bad@shahrim.uz" },
    });
    fireEvent.change(screen.getByLabelText("Parol"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirish" }));

    expect(
      await screen.findByText("Elektron pochta yoki parol noto'g'ri."),
    ).toBeInTheDocument();
    expect(setToken).not.toHaveBeenCalled();
  });
});
