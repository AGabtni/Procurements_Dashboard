import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getSettings, updateSettings, sendConfirmationEmail, changePassword } from "../api/authApi";
import type { SettingsDto } from "../types/auth";
import { useAuth } from "../context/AuthContext";
import { SUPPORTED_LOCALES, normalizeLocale, type SupportedLocale } from "../i18n";

export default function SettingsPage() {
  const { user, setLocale, setCommsLocale } = useAuth();
  const { t } = useTranslation(["settings", "common"]);
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingConfirm, setSendingConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);
  const [langMessage, setLangMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);
  const [savingLocale, setSavingLocale] = useState<"locale" | "commsLocale" | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const s = await getSettings();
      setSettings(s);
      setEmail(s.email);
      setNotifications(s.notificationsEnabled);
    } catch {
      setMessage({ type: "danger", text: t("messages.loadFailed") });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateSettings({
        email: email !== settings?.email ? email : undefined,
        notificationsEnabled: notifications,
      });
      setSettings(updated);
      setMessage({ type: "success", text: email !== settings?.email
        ? t("messages.savedEmailConfirm")
        : t("messages.saved") });
    } catch (err) {
      setMessage({ type: "danger", text: err instanceof Error ? err.message : t("messages.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendConfirmation() {
    setSendingConfirm(true);
    setMessage(null);
    try {
      await sendConfirmationEmail();
      setMessage({ type: "success", text: t("messages.confirmationSent") });
    } catch (err) {
      setMessage({ type: "danger", text: err instanceof Error ? err.message : t("messages.confirmationFailed") });
    } finally {
      setSendingConfirm(false);
    }
  }

  async function handleLocaleChange(kind: "locale" | "commsLocale", value: SupportedLocale) {
    setLangMessage(null);
    setSavingLocale(kind);
    try {
      if (kind === "locale") {
        await setLocale(value);
        setLangMessage({ type: "success", text: t("language.savedInterface") });
      } else {
        await setCommsLocale(value);
        setLangMessage({ type: "success", text: t("language.savedComms") });
      }
    } catch (err) {
      setLangMessage({ type: "danger", text: err instanceof Error ? err.message : t("language.failed") });
    } finally {
      setSavingLocale(null);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "danger", text: t("password.tooShort") });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "danger", text: t("password.mismatch") });
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: t("password.changed") });
    } catch (err) {
      setPasswordMessage({ type: "danger", text: err instanceof Error ? err.message : t("password.changeFailed") });
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <h2 className="mb-4">{t("title")}</h2>

        {message && (
          <div className={`alert alert-${message.type} alert-dismissible`}>
            {message.text}
            <button className="btn-close" onClick={() => setMessage(null)} />
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Email Section */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">{t("email.sectionTitle")}</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">{t("email.label")}</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="d-flex align-items-center gap-2">
                {settings?.emailConfirmed ? (
                  <span className="badge bg-success">
                    <i className="bi bi-check-circle me-1" />{t("email.confirmed")}
                  </span>
                ) : (
                  <>
                    <span className="badge bg-warning text-dark">{t("email.notConfirmed")}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleSendConfirmation}
                      disabled={sendingConfirm || email !== settings?.email}
                    >
                      {sendingConfirm ? t("email.sending") : t("email.sendConfirmation")}
                    </button>
                  </>
                )}
              </div>
              {email !== settings?.email && (
                <div className="form-text text-info mt-2">
                  {t("email.pendingChangeHint")}
                </div>
              )}
            </div>
          </div>

          {/* Language Section */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">{t("language.title")}</h5>
            </div>
            <div className="card-body">
              {langMessage && (
                <div className={`alert alert-${langMessage.type} alert-dismissible py-2`}>
                  {langMessage.text}
                  <button className="btn-close" onClick={() => setLangMessage(null)} />
                </div>
              )}
              <div className="mb-1">
                <label className="form-label">{t("language.interfaceLabel")}</label>
                <select
                  className="form-select"
                  value={normalizeLocale(user?.locale)}
                  onChange={(e) => handleLocaleChange("locale", e.target.value as SupportedLocale)}
                  disabled={savingLocale === "locale"}
                >
                  {SUPPORTED_LOCALES.map((code) => (
                    <option key={code} value={code}>
                      {t(`languageSwitcher.${code.slice(0, 2)}`, { ns: "common" })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">{t("notifications.sectionTitle")}</h5>
            </div>
            <div className="card-body">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="notificationsEnabled"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="notificationsEnabled">
                  {t("notifications.toggleLabel")}
                </label>
              </div>
              <p className="form-text mt-2 mb-3">
                {t("notifications.toggleHelp")}
              </p>
              <div className="mb-1">
                <label className="form-label">{t("language.commsLabel")}</label>
                <select
                  className="form-select"
                  value={normalizeLocale(user?.commsLocale)}
                  onChange={(e) => handleLocaleChange("commsLocale", e.target.value as SupportedLocale)}
                  disabled={savingLocale === "commsLocale"}
                >
                  {SUPPORTED_LOCALES.map((code) => (
                    <option key={code} value={code}>
                      {t(`languageSwitcher.${code.slice(0, 2)}`, { ns: "common" })}
                    </option>
                  ))}
                </select>
                <div className="form-text">{t("language.commsHelp")}</div>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">{t("account.sectionTitle")}</h5>
            </div>
            <div className="card-body">
              <p className="mb-1"><strong>{t("account.name")}:</strong> {user?.fullName}</p>
              <p className="mb-0"><strong>{t("account.role")}:</strong> {user?.role}</p>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t("actions.saving") : t("actions.save")}
          </button>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="mt-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">{t("password.sectionTitle")}</h5>
            </div>
            <div className="card-body">
              {passwordMessage && (
                <div className={`alert alert-${passwordMessage.type} alert-dismissible py-2`}>
                  {passwordMessage.text}
                  <button className="btn-close" onClick={() => setPasswordMessage(null)} />
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">{t("password.current")}</label>
                <input type="password" className="form-control" value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">{t("password.new")}</label>
                <input type="password" className="form-control" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
                <div className="form-text">{t("password.minHelp")}</div>
              </div>
              <div className="mb-3">
                <label className="form-label">{t("password.confirm")}</label>
                <input type="password" className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={confirmPassword && confirmPassword !== newPassword ? { borderColor: "var(--bs-danger)" } : {}}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <div className="form-text text-danger">{t("password.mismatch")}</div>
                )}
              </div>
              <button type="submit" className="btn btn-primary" disabled={changingPassword}>
                {changingPassword ? t("password.submitting") : t("password.submit")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
