import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { messages, defaultLanguage } from "@shahrim/i18n";

// The shared @shahrim/i18n package cannot be edited from here, so a few
// shell-only strings live locally and are merged on top of the shared set.
// All strings stay Uzbek (Latin) per the PRD language rule.
const localMessages = {
  open_in_telegram:
    "Ilovadan foydalanish uchun uni Telegram ilovasi ichida oching.",
  greeting: "Assalomu alaykum, {{name}}!",
  greeting_noname: "Assalomu alaykum!",
  phone_label: "Telefon raqami",
  loading: "Yuklanmoqda...",
  auth_failed: "Tizimga kirishda xatolik yuz berdi. Qayta urinib ko'ring.",
  coming_soon: "Bu bo'lim tez orada ishga tushadi.",
} as const;

const translation = { ...messages, ...localMessages };

void i18n.use(initReactI18next).init({
  resources: {
    uz: { translation },
  },
  lng: defaultLanguage,
  fallbackLng: "uz",
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
  react: {
    // Resources are inlined, so init is synchronous — no Suspense needed.
    useSuspense: false,
  },
});

export default i18n;
