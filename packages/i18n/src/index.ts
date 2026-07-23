import uz from "../locales/uz.json";

/**
 * Uzbek (Latin) is the only shipped language. The structure keeps room for a
 * second language (e.g. uz-Cyrl) to be added without touching call sites.
 */
export const resources = { uz } as const;

export const defaultLanguage = "uz" as const;

export type Language = keyof typeof resources;
export type TranslationKey = keyof typeof uz;

/** The raw message map for the default language. Feed this to i18next in apps. */
export const messages: Record<TranslationKey, string> = uz;

/**
 * Lightweight synchronous translator. Apps typically initialise i18next with
 * `resources`; this helper is a dependency-free fallback for simple contexts.
 */
export function t(key: TranslationKey): string {
  return messages[key] ?? key;
}
