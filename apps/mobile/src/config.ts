/**
 * Client configuration, read from Expo public env vars at build time.
 * `EXPO_PUBLIC_*` values are inlined by Expo; `process.env` access must use the
 * literal key (no dynamic property access) for the inlining to work.
 */

/** Backend base URL, no trailing slash. The API client appends paths directly. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Telegram bot username (without @) used to build the login deep link. */
export const BOT_USERNAME =
  process.env.EXPO_PUBLIC_BOT_USERNAME ?? "ShahrimSamarqandBot";

/** Samarkand old town — graceful fallback when geolocation is denied/unavailable. */
export const SAMARKAND = { lat: 39.6542, lng: 66.9597 } as const;

/**
 * Turn a stored photo path into a loadable URL. The backend may return either an
 * absolute URL (PUBLIC_BASE_URL configured) or a relative path; prefix the API
 * base only in the relative case.
 */
export function photoSrc(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
