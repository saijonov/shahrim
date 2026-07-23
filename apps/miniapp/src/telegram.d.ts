// Ambient typings for the Telegram Web App runtime injected by
// https://telegram.org/js/telegram-web-app.js (see index.html).
// Only the surface the Mini App shell needs is declared here.
export {};

declare global {
  interface TelegramWebApp {
    /** URL-encoded query string; validated verbatim by the backend. */
    initData: string;
    /** Parsed, unsigned copy of initData — never trust for auth. */
    initDataUnsafe: Record<string, unknown>;
    ready(): void;
    expand(): void;
    colorScheme: "light" | "dark";
    themeParams: Record<string, string>;
  }

  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}
