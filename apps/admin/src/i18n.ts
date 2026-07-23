import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { messages, defaultLanguage } from "@shahrim/i18n";

// Shared keys come from @shahrim/i18n; the admin portal adds its own strings on
// top (that package cannot be edited from here). Every string is Uzbek (Latin)
// per the PRD language rule.
const localMessages = {
  // Auth
  login: "Tizimga kirish",
  email: "Elektron pochta",
  password: "Parol",
  sign_in: "Kirish",
  logout: "Chiqish",
  invalid_login: "Elektron pochta yoki parol noto'g'ri.",
  login_error: "Tizimga kirishda xatolik yuz berdi. Qayta urinib ko'ring.",

  // Filters
  filters: "Filtrlar",
  all: "Barchasi",
  category_all: "Barcha turkumlar",
  status_all: "Barcha holatlar",
  urgency_all: "Barcha darajalar",
  apply: "Qo'llash",
  reset: "Tozalash",
  district: "Tuman",
  district_placeholder: "Tuman nomi",
  date_from: "Sanadan",
  date_to: "Sanagacha",

  // Analytics
  analytics: "Tahlil",
  total_reports: "Jami murojaatlar",
  avg_resolution: "O'rtacha hal qilish vaqti",
  avg_rating: "O'rtacha baho",
  hours: "soat",
  trend: "Murojaatlar dinamikasi (30 kun)",

  // Map
  map_title: "Xarita",

  // Issue queue
  issue_queue: "Murojaatlar ro'yxati",
  reporter: "Murojaatchi",
  no_issues: "Murojaatlar topilmadi",
  prev: "Oldingi",
  showing: "{{from}}–{{to}} / {{total}}",
  anonymous: "Noma'lum",

  // Detail + actions
  detail_title: "Murojaat tafsilotlari",
  close: "Yopish",
  phone: "Telefon raqami",
  coordinates: "Koordinatalar",
  timeline: "Holatlar tarixi",
  no_photo: "Surat yo'q",
  change_status: "Holatni o'zgartirish",
  note: "Izoh",
  reject_reason: "Rad etish sababini kiriting.",
  resolve_photo: "Natija suratini tanlang",
  choose_file: "Fayl tanlash",
  uploading: "Yuklanmoqda...",
  resolved_ok: "Murojaat hal qilindi.",
  status_changed_ok: "Holat yangilandi.",
  action_error: "Amalni bajarishda xatolik yuz berdi. Qayta urinib ko'ring.",
  load_error: "Ma'lumotlarni yuklashda xatolik yuz berdi.",

  // Values (no dedicated shared "value none")
  none: "—",
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
