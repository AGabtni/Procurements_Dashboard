import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import frCommon from "./locales/fr/common.json";
import enSettings from "./locales/en/settings.json";
import frSettings from "./locales/fr/settings.json";

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
      "en-CA": { common: enCommon, settings: enSettings },
      "fr-CA": { common: frCommon, settings: frSettings },
    },
    lng: initialLang,
    fallbackLng: "en-CA",
    supportedLngs: [...SUPPORTED_LOCALES],
    ns: ["common", "settings"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    returnNull: false,
  });

document.documentElement.lang = initialLang;

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = normalizeLocale(lng);
});

export default i18n;
