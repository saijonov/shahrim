/**
 * Native theme derived from the shared @shahrim/ui-tokens (Samarkand cobalt +
 * dome turquoise on warm paper, PRD §13). LIGHT-ONLY: the native app mirrors the
 * bright Mini App, so there is no dark palette and no OS colour-scheme switching.
 * Spacing / radius / type scales come straight from the shared tokens so the
 * native app matches the Mini App and admin. Display type is Bricolage
 * Grotesque; body is Figtree (loaded in app/_layout.tsx).
 */
import tokens from "@shahrim/ui-tokens";

export const space = tokens.space;
export const radius = tokens.radius;
export const fontSize = tokens.fontSize;
export const urgencyColor = tokens.urgencyColor;

/**
 * Loaded-font family names. These match the identifiers exported by the
 * @expo-google-fonts packages and registered via useFonts() in the root layout.
 * Weight is carried by the family itself (per-weight files), so components set
 * `fontFamily` rather than relying on `fontWeight`.
 */
export const font = {
  /** Bricolage Grotesque — display / headings. */
  display: "BricolageGrotesque_700Bold",
  displayExtra: "BricolageGrotesque_800ExtraBold",
  /** Figtree — body copy. */
  body: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semibold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
} as const;

/** Complete light palette (warm Samarkand paper), keyed for native consumers. */
const lt = tokens.light;
export interface Palette {
  bg: string;
  card: string;
  card2: string;
  text: string;
  muted: string;
  dim: string;
  border: string;
  line: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  gold: string;
  field: string;
  shadow: string;
  danger: string;
  high: string;
  med: string;
  low: string;
  highSoft: string;
  medSoft: string;
  lowSoft: string;
}

const light: Palette = {
  bg: lt.bg,
  card: lt.card,
  card2: lt.card2,
  text: lt.text,
  muted: lt.dim,
  dim: lt.dim,
  border: lt.border,
  line: lt.line,
  primary: lt.primary,
  primarySoft: lt.primarySoft,
  primaryText: lt.ink,
  accent: lt.accent,
  accentSoft: lt.accentSoft,
  onAccent: "#FFFFFF",
  gold: lt.gold,
  field: lt.field,
  shadow: lt.shadow,
  danger: lt.high,
  high: lt.high,
  med: lt.med,
  low: lt.low,
  highSoft: lt.highSoft,
  medSoft: lt.medSoft,
  lowSoft: lt.lowSoft,
};

/**
 * Soft elevation for cards / rows — a low, wide, cool shadow that matches the
 * Mini App's `0 4px 18px -12px shadow`. (RN maps to iOS shadow* + Android
 * elevation.)
 */
export const cardShadow = {
  shadowColor: "#16202E",
  shadowOpacity: 0.1,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

/** The cobalt glow under the primary button / camera hero. */
export const primaryShadow = {
  shadowColor: lt.primary,
  shadowOpacity: 0.32,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 12 },
  elevation: 6,
};

export type ThemeMode = "light";

export interface Theme {
  mode: ThemeMode;
  color: Palette;
  space: typeof space;
  radius: typeof radius;
  fontSize: typeof fontSize;
  urgencyColor: typeof urgencyColor;
  font: typeof font;
  cardShadow: typeof cardShadow;
  primaryShadow: typeof primaryShadow;
}

/** Always the light theme — the native app is light-only (mirrors the Mini App). */
export function getTheme(_mode?: ThemeMode): Theme {
  return {
    mode: "light",
    color: light,
    space,
    radius,
    fontSize,
    urgencyColor,
    font,
    cardShadow,
    primaryShadow,
  };
}

export function useTheme(): Theme {
  return getTheme();
}
