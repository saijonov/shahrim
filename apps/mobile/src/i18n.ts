import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { messages, defaultLanguage } from "@shahrim/i18n";

/**
 * Same pattern as the Mini App (apps/miniapp/src/i18n.ts): the shared
 * @shahrim/i18n set is the source of truth; a few native-only strings live here
 * and are merged on top. Everything stays Uzbek (Latin) per the PRD.
 */
export const localMessages = {
  // Onboarding / login (native deep-link flow)
  onboarding_title: "Shahringizni yaxshilashga yordam bering",
  onboarding_body:
    "Ko'chadagi muammoni suratga oling — sun'iy intellekt uni tavsiflaydi, shahar xizmatlari esa hal qiladi.",
  login_with_telegram: "Telegram orqali kirish",
  waiting_for_telegram: "Telegramda telefon raqamingizni ulashing...",
  waiting_hint:
    "Telegram ochildi. Telefon raqamingizni ulashgach, bu yerga qayting — kirish avtomatik yakunlanadi.",
  open_telegram: "Telegramni ochish",
  login_failed: "Kirishda xatolik yuz berdi. Qayta urinib ko'ring.",
  login_timeout: "Kutish vaqti tugadi. Qaytadan urinib ko'ring.",
  logout: "Chiqish",

  // Tab bar labels
  tab_home: "Bosh sahifa",
  tab_reports: "Murojaatlar",

  // Home
  greeting: "Assalomu alaykum, {{name}}!",
  greeting_noname: "Assalomu alaykum!",
  home_subtitle: "Bugun shahringizda nima yaxshilanishi kerak?",
  phone_label: "Telefon raqami",

  // Report flow
  add_photo: "Surat qo'shing",
  retake: "Boshqa surat",
  camera: "Kamera",
  gallery: "Galereya",
  uploading: "Surat yuklanmoqda...",
  getting_location: "Joylashuv aniqlanmoqda...",
  location_hint: "Belgini kerakli joyga surib, aniq manzilni belgilang.",
  select_on_map: "Joylashuvni aniqlab bo'lmadi. Xaritada joyni o'zingiz belgilang.",
  use_current_location: "Joriy joylashuvni ishlatish",
  coordinates: "Koordinatalar",
  map_unavailable: "Xarita mavjud emas. Quyidagi koordinatalar ishlatiladi.",
  photo_required: "Iltimos, avval surat qo'shing.",
  report_error: "Murojaatni yuborishda xatolik yuz berdi. Qayta urinib ko'ring.",
  sending: "Yuborilmoqda...",
  optional: "Ixtiyoriy",
  ai_suggestions: "Tavsiya etilgan tavsiflar",
  permission_needed: "Ruxsat kerak",
  camera_permission_denied: "Kameraga ruxsat berilmadi.",
  gallery_permission_denied: "Galereyaga ruxsat berilmadi.",

  // My reports + detail
  timeline: "Holatlar tarixi",
  no_photo: "Surat yo'q",
  load_error: "Murojaatlarni yuklashda xatolik yuz berdi. Qayta urinib ko'ring.",

  // Rating
  your_rating: "Sizning bahoyingiz",
  star_aria: "{{n}} yulduz",
  rating_error: "Baho yuborishda xatolik. Qayta urinib ko'ring.",
} as const;

export type LocalKey = keyof typeof localMessages;

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
  compatibilityJSON: "v3",
});

export default i18n;
