import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { register } from "../api/authApi";
import { Link } from "react-router-dom";
import { resolveError } from "../utils/resolveError";

export default function RegisterPage() {
  const { t } = useTranslation("auth");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await register({ email, fullName, password });
      setSuccess(true);
    } catch (err) {
      setError(resolveError(err, t, "register.failed"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="pp-auth-page">
        <div className="pp-auth-card text-center">
          <div className="auth-brand">
            <div className="auth-brand-icon">✓</div>
            <h2>{t("register.success.title")}</h2>
            <p>{t("register.success.message")}</p>
          </div>
          <Link to="/login" className="pp-btn pp-btn-primary w-100 justify-content-center">
            {t("register.success.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-auth-page">
      <div className="pp-auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">◆</div>
          <h2>{t("register.title")}</h2>
          <p>{t("register.subtitle")}</p>
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="fullName" className="form-label">{t("register.fullNameLabel")}</label>
            <input
              id="fullName"
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
              placeholder={t("register.fullNamePlaceholder")}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">{t("register.emailLabel")}</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t("register.emailPlaceholder")}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">{t("register.passwordLabel")}</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
            />
            <div className="form-text">{t("register.passwordHelp")}</div>
          </div>
          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label">{t("register.confirmPasswordLabel")}</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="pp-btn pp-btn-primary w-100 justify-content-center"
            style={{ padding: ".7rem" }}
              disabled={loading}
            >
              {loading ? t("register.submitting") : t("register.submit")}
            </button>
        </form>
        <p className="text-center mt-3 mb-0" style={{ fontSize: ".9rem" }}>
          {t("register.haveAccount")}{" "}
          <Link to="/login" style={{ fontWeight: 600 }}>{t("register.signInLink")}</Link>
        </p>
      </div>
    </div>
  );
}
