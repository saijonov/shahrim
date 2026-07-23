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
  // Report flow (Phase 2) — strings not yet in the shared @shahrim/i18n set.
  add_photo: "Surat qo'shing",
  retake: "Boshqa surat",
  uploading: "Surat yuklanmoqda...",
  getting_location: "Joylashuv aniqlanmoqda...",
  location_hint: "Belgini kerakli joyga surib, aniq manzilni belgilang.",
  select_on_map: "Joylashuvni aniqlab bo'lmadi. Xaritada joyni o'zingiz belgilang.",
  photo_required: "Iltimos, avval surat qo'shing.",
  report_error: "Murojaatni yuborishda xatolik yuz berdi. Qayta urinib ko'ring.",
  sending: "Yuborilmoqda...",
  optional: "Ixtiyoriy",
  // AI analysis (Phase 3) — heading above the suggested-description chips.
  ai_suggestions: "Tavsiya etilgan tavsiflar",
  // My reports + detail (Phase 4) — strings not yet in the shared set.
  // (status_*, cat_*, category, location, result_photo, urgency, back, loading,
  //  retry and no_reports_yet are all reused from @shahrim/i18n.)
  timeline: "Holatlar tarixi",
  no_photo: "Surat yo'q",
  load_error: "Murojaatlarni yuklashda xatolik yuz berdi. Qayta urinib ko'ring.",
  // Rating (Phase 6). rate_resolution, leave_comment, thank_you, submit and
  // retry are reused from the shared @shahrim/i18n set; these are extras.
  your_rating: "Sizning bahoyingiz",
  // Per-star aria label. `n` (not i18next's plural-triggering `count`) keeps it
  // a plain substitution: "1 yulduz" … "5 yulduz".
  star_aria: "{{n}} yulduz",
  rating_error: "Baho yuborishda xatolik. Qayta urinib ko'ring.",
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
