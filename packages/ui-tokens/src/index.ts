/**
 * Shahrim design tokens — grounded in Samarkand majolica tilework (deep cobalt +
 * dome turquoise on warm paper). This is the single source of truth for color,
 * type, spacing and radii shared across the Mini App, admin portal and native app.
 * (PRD §13.)
 */

export const color = {
  primary: "#143C8C", // Samarkand cobalt
  accent: "#1CA5A0", // dome turquoise
  surface: "#F5F2EC", // warm paper
  ink: "#16202E", // near-black text
  // Urgency scale (also used for map pins)
  urgencyHigh: "#C0392B",
  urgencyMedium: "#E08A00",
  urgencyLow: "#2E8B57",
  // Neutrals
  white: "#FFFFFF",
  muted: "#6B7686",
  border: "#DED8CC",
} as const;

/** Urgency code -> color, matching the backend `urgency` enum. */
export const urgencyColor: Record<"low" | "medium" | "high", string> = {
  low: color.urgencyLow,
  medium: color.urgencyMedium,
  high: color.urgencyHigh,
};

export const font = {
  // Display: a clean, confident sans with character; body: a highly legible sans.
  // Both must render Uzbek Latin diacritics (oʻ gʻ) correctly.
  display: '"Space Grotesk", "Inter", system-ui, sans-serif',
  body: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
} as const;

/** Deliberate type scale (px). */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 36,
  display: 48,
} as const;

/** Spacing scale (px) — 4px base. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const tokens = { color, urgencyColor, font, fontSize, space, radius } as const;

export default tokens;
