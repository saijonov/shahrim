import type { IssueStatus } from "@shahrim/api-client";
import tokens from "@shahrim/ui-tokens";
import {
  STATUS_COLOR,
  STATUS_KEY,
  categoryKey,
  formatDate,
  formatDateTime,
} from "../src/lib/status";

const ALL: IssueStatus[] = [
  "submitted",
  "in_review",
  "in_progress",
  "resolved",
  "rejected",
];

describe("status maps", () => {
  it("has an i18n key and colour for every status", () => {
    for (const s of ALL) {
      expect(STATUS_KEY[s]).toMatch(/^status_/);
      expect(STATUS_COLOR[s]).toMatch(/^#/);
    }
  });

  it("uses the ui-tokens palette for badge colours", () => {
    expect(STATUS_COLOR.resolved).toBe(tokens.color.urgencyLow);
    expect(STATUS_COLOR.rejected).toBe(tokens.color.urgencyHigh);
    expect(STATUS_COLOR.in_review).toBe(tokens.color.primary);
    expect(STATUS_COLOR.submitted).toBe(tokens.color.muted);
  });
});

describe("date formatters", () => {
  it("formats dd.MM.yyyy (locale-independent, local time)", () => {
    // No trailing Z → parsed as local time, so the day is stable across TZs.
    expect(formatDate("2026-01-05T12:00:00")).toBe("05.01.2026");
  });

  it("formats dd.MM.yyyy HH:mm for the timeline", () => {
    expect(formatDateTime("2026-01-05T09:07:00")).toBe("05.01.2026 09:07");
  });

  it("returns the raw input for an unparseable date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("categoryKey", () => {
  it("prefixes the category code for i18n lookup", () => {
    expect(categoryKey("road_damage")).toBe("cat_road_damage");
  });
});
