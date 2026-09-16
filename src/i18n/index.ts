import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import frCommon from "./locales/fr/common.json";

export const SUPPORTED_LOCALES = ["en-CA", "fr-CA"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = "procureportal_locale";

// Map any detected value (e.g. "fr", "fr-FR", "en-US") onto one of our two supported codes.
export function normalizeLocale(raw: string | undefined | null): SupportedLocale {
  if (!raw) return "en-CA";
  return raw.toLowerCase().startsWith("fr") ? "fr-CA" : "en-CA";
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-CA": { common: enCommon },
      "fr-CA": { common: frCommon },
    },
    fallbackLng: "en-CA",
    supportedLngs: [...SUPPORTED_LOCALES],
    nonExplicitSupportedLngs: true,
    ns: ["common"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    returnNull: false,
  });

const initialLang = normalizeLocale(i18n.language);
if (initialLang !== i18n.language) {
  void i18n.changeLanguage(initialLang);
}
document.documentElement.lang = initialLang;

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = normalizeLocale(lng);
});

export default i18n;
