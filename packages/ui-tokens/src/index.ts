/**
 * Shahrim design tokens — grounded in Samarkand majolica tilework (deep cobalt +
 * dome turquoise) with a warm-paper light theme and a deep-night dark theme, a
 * gold accent, and a girih star-lattice motif. This is the single source of
 * truth for colour, type, spacing and radii shared across the Mini App, admin
 * portal and native app. (PRD §13.)
 *
 * Display type is **Bricolage Grotesque**; body is **Figtree** — both render
 * Uzbek Latin diacritics (oʻ gʻ) correctly.
 *
 * The full light + dark palettes live in `theme.light` / `theme.dark` (keyed to
 * the `--co-*` CSS custom properties the clients expose). The flat `color`
 * object mirrors the light theme's key values and preserves the historical
 * export shape every consumer already imports.
 */

/** Complete light-theme palette, keyed to the `--co-*` CSS custom properties. */
export const light = {
  bg: "#F5F2EC", // warm paper
  card: "#FFFFFF",
  card2: "#FBF8F1",
  text: "#16202E", // ink
  dim: "#5B6675",
  primary: "#143C8C", // Samarkand cobalt
  primarySoft: "#E7EDF8",
  ink: "#FFFFFF", // text that sits on primary
  accent: "#1CA5A0", // dome turquoise
  accentSoft: "#DBF1F0",
  border: "rgba(20,32,46,.13)",
  line: "rgba(20,32,46,.07)",
  gold: "#C9A24B",
  shadow: "rgba(20,32,46,.10)",
  field: "#FFFFFF",
  high: "#C0392B",
  med: "#E08A00",
  low: "#2E8B57",
  highSoft: "rgba(192,57,43,.13)",
  medSoft: "rgba(224,138,0,.15)",
  lowSoft: "rgba(46,139,87,.15)",
} as const;

/** Complete dark-theme palette (deep Samarkand night). */
export const dark = {
  bg: "#0D1622",
  card: "#152238",
  card2: "#1B2A44",
  text: "#F1EEE6",
  dim: "#93A1B5",
  primary: "#3F6FD8", // lightened cobalt for contrast on night
  primarySoft: "#20304F",
  ink: "#FFFFFF",
  accent: "#26B7B1",
  accentSoft: "#123330",
  border: "rgba(255,255,255,.15)",
  line: "rgba(255,255,255,.09)",
  gold: "#D8B65E",
  shadow: "rgba(0,0,0,.55)",
  field: "#101B2C",
  high: "#E86152",
  med: "#F0A63A",
  low: "#4CB37E",
  highSoft: "rgba(232,97,82,.16)",
  medSoft: "rgba(240,166,58,.16)",
  lowSoft: "rgba(76,179,126,.16)",
} as const;

export const theme = { light, dark } as const;

/**
 * Flat palette (light theme). Historical key names are preserved so existing
 * consumers (`tokens.color.primary`, `.surface`, `.urgencyMedium`, …) keep
 * working unchanged; the majolica/gold extras are additive.
 */
export const color = {
  primary: light.primary, // Samarkand cobalt
  accent: light.accent, // dome turquoise
  surface: light.bg, // warm paper
  ink: light.text, // near-black text
  // Urgency scale (also used for map pins)
  urgencyHigh: light.high,
  urgencyMedium: light.med,
  urgencyLow: light.low,
  // Neutrals
  white: "#FFFFFF",
  muted: light.dim,
  border: light.border,
  // Majolica extras
  card: light.card,
  card2: light.card2,
  dim: light.dim,
  gold: light.gold,
  line: light.line,
  field: light.field,
  shadow: light.shadow,
  primarySoft: light.primarySoft,
  accentSoft: light.accentSoft,
} as const;

/** Urgency code -> color, matching the backend `urgency` enum. */
export const urgencyColor: Record<"low" | "medium" | "high", string> = {
  low: color.urgencyLow,
  medium: color.urgencyMedium,
  high: color.urgencyHigh,
};

export const font = {
  // Display: Bricolage Grotesque — a confident, characterful grotesque.
  // Body: Figtree — a highly legible, warm humanist sans.
  // Both render Uzbek Latin diacritics (oʻ gʻ) correctly.
  display: '"Bricolage Grotesque", "Figtree", system-ui, sans-serif',
  body: '"Figtree", system-ui, -apple-system, "Segoe UI", sans-serif',
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
  display: 46,
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

/** Radii (px) — soft, generous corners in the majolica direction. */
export const radius = {
  sm: 10,
  md: 16,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

export const tokens = {
  color,
  urgencyColor,
  font,
  fontSize,
  space,
  radius,
  theme,
  light,
  dark,
} as const;

export default tokens;
