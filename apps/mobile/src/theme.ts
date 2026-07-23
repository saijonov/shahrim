/**
 * Native theme derived from the shared @shahrim/ui-tokens (Samarkand cobalt +
 * dome turquoise on warm paper, PRD §13). Exposes a light and dark palette and a
 * `useTheme()` hook that follows the OS color scheme. Spacing / radius / type
 * scales come straight from the shared tokens so the native app matches the
 * Mini App and admin.
 */
import { useColorScheme } from "react-native";
import tokens from "@shahrim/ui-tokens";

export const space = tokens.space;
export const radius = tokens.radius;
export const fontSize = tokens.fontSize;
export const urgencyColor = tokens.urgencyColor;

export interface Palette {
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryText: string;
  accent: string;
  onAccent: string;
  danger: string;
}

const light: Palette = {
  bg: tokens.color.surface,
  card: tokens.color.white,
  text: tokens.color.ink,
  muted: tokens.color.muted,
  border: tokens.color.border,
  primary: tokens.color.primary,
  primaryText: tokens.color.white,
  accent: tokens.color.accent,
  onAccent: tokens.color.white,
  danger: tokens.color.urgencyHigh,
};

const dark: Palette = {
  bg: "#0E1621",
  card: "#16202E",
  text: "#F2EEE6",
  muted: "#8A94A6",
  border: "#2A3646",
  // Lightened cobalt keeps the brand identity readable on a dark surface.
  primary: "#3E6FD6",
  primaryText: "#FFFFFF",
  accent: tokens.color.accent,
  onAccent: "#062826",
  danger: "#E5675A",
};

export type ThemeMode = "light" | "dark";

export interface Theme {
  mode: ThemeMode;
  color: Palette;
  space: typeof space;
  radius: typeof radius;
  fontSize: typeof fontSize;
  urgencyColor: typeof urgencyColor;
  font: typeof tokens.font;
}

export function getTheme(mode: ThemeMode): Theme {
  return {
    mode,
    color: mode === "dark" ? dark : light,
    space,
    radius,
    fontSize,
    urgencyColor,
    font: tokens.font,
  };
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return getTheme(scheme === "dark" ? "dark" : "light");
}
