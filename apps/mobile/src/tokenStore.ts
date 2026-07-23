/**
 * Session-token storage backed by expo-secure-store (Keychain / Keystore).
 *
 * The shared API client wants a *synchronous* `getToken()`, but secure-store is
 * async, so we keep an in-memory cache that is hydrated once at startup
 * (`load()`) and updated on every `set()` / `clear()`. `get()` returns the cache.
 */
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "shahrim_token";

let cached: string | null = null;

export const tokenStore = {
  /** Synchronous read of the cached token (used by the API client). */
  get(): string | null {
    return cached;
  },

  /** Hydrate the cache from secure storage. Call once on app start. */
  async load(): Promise<string | null> {
    try {
      cached = await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      cached = null;
    }
    return cached;
  },

  async set(token: string): Promise<void> {
    cached = token;
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch {
      // Non-fatal: token still lives in memory for this session.
    }
  },

  async clear(): Promise<void> {
    cached = null;
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};
