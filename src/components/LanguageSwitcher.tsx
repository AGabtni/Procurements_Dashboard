import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { SUPPORTED_LOCALES, normalizeLocale, type SupportedLocale, LOCALE_STORAGE_KEY } from "../i18n";
import { useAuth } from "../context/AuthContext";

// Compact locale dropdown for the navbar. Persists via API when authenticated,
// otherwise only touches localStorage + i18next.
export default function LanguageSwitcher() {
  const { t } = useTranslation("common");
  const { user, setLocale } = useAuth();
  const [saving, setSaving] = useState(false);

  const current = normalizeLocale(user?.locale ?? i18n.language);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as SupportedLocale;
    if (next === current) return;
    if (user) {
      setSaving(true);
      try {
        await setLocale(next);
      } catch {
        // Fall back to client-only change so the UI still reflects the choice.
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
        void i18n.changeLanguage(next);
      } finally {
        setSaving(false);
      }
    } else {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      void i18n.changeLanguage(next);
    }
  }

  return (
    <select
      aria-label={t("languageSwitcher.label")}
      className="pp-btn pp-btn-ghost pp-btn-sm"
      style={{
        width: "auto",
        paddingRight: "1.75rem",
        background: "transparent",
        color: "#e2e8f0",
        borderColor: "rgba(255,255,255,.1)",
        appearance: "none",
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23e2e8f0'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right .5rem center",
        backgroundSize: ".7rem",
      }}
      value={current}
      onChange={handleChange}
      disabled={saving}
    >
      {SUPPORTED_LOCALES.map((code) => (
        <option key={code} value={code} style={{ color: "#0f172a", background: "#fff" }}>
          {t(`languageSwitcher.${code.slice(0, 2)}`)}
        </option>
      ))}
    </select>
  );
}
