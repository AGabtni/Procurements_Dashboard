import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import frCommon from "./locales/fr/common.json";
import enSettings from "./locales/en/settings.json";
import frSettings from "./locales/fr/settings.json";
import enAuth from "./locales/en/auth.json";
import frAuth from "./locales/fr/auth.json";
import enDashboard from "./locales/en/dashboard.json";
import frDashboard from "./locales/fr/dashboard.json";

export const SUPPORTED_LOCALES = ["en-CA", "fr-CA"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = "procureportal_locale";

// Map any detected value (e.g. "fr", "fr-FR", "en-US") onto one of our two supported codes.
export function normalizeLocale(raw: string | undefined | null): SupportedLocale {
  if (!raw) return "en-CA";
  return raw.toLowerCase().startsWith("fr") ? "fr-CA" : "en-CA";
}

function detectInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) return normalizeLocale(stored);
  } catch {
    // localStorage unavailable — fall through to navigator.
  }
  return normalizeLocale(typeof navigator !== "undefined" ? navigator.language : null);
}

const initialLang = detectInitialLocale();

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      "en-CA": { common: enCommon, settings: enSettings, auth: enAuth, dashboard: enDashboard },
      "fr-CA": { common: frCommon, settings: frSettings, auth: frAuth, dashboard: frDashboard },
    },
    lng: initialLang,
    fallbackLng: "en-CA",
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: ["common", "settings", "auth", "dashboard"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    returnNull: false,
  });

document.documentElement.lang = initialLang;

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = normalizeLocale(lng);
});

export default i18n;
