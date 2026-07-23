/**
 * Pure helpers for the native Telegram deep-link login (Phase 7 / PRD §5).
 *
 * Kept dependency-free so they can be unit-tested without any native modules.
 * The runtime nonce generator lives in `AuthContext` (expo-crypto); here we only
 * build the URL and validate the nonce shape.
 */

/**
 * Telegram `start` deep-link payloads accept only [A-Za-z0-9_-], up to 64 chars.
 * A UUID (hyphens allowed) prefixed with `login_` fits comfortably.
 */
export function isValidStartPayload(payload: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(payload);
}

/**
 * Build the Telegram deep link that opens the bot and hands it the login nonce.
 * The backend bot reads `login_<nonce>` on /start and binds the nonce to the
 * user once they share their phone; the app then polls /auth/native/exchange.
 */
export function buildTelegramLoginUrl(botUsername: string, nonce: string): string {
  const clean = botUsername.replace(/^@/, "").trim();
  const payload = `login_${nonce}`;
  if (!isValidStartPayload(payload)) {
    throw new Error(`Invalid Telegram start payload: ${payload}`);
  }
  return `https://t.me/${clean}?start=${payload}`;
}
