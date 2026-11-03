import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { sendResetPasswordEmail } from "../api/authApi";
import { Link } from "react-router-dom";
import { resolveError } from "../utils/resolveError";

export default function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      await sendResetPasswordEmail({ email });

      setSuccess(true);
    } catch (err) {
      setError(resolveError(err, t, "forgotPassword.failed"));
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
            <h2>{t("forgotPassword.success.title")}</h2>
            <p>{t("forgotPassword.success.message")}</p>
          </div>
          <Link to="/login" className="pp-btn pp-btn-primary w-100 justify-content-center">
            {t("forgotPassword.success.backToLogin")}
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
          <h2>{t("forgotPassword.title")}</h2>
          <p>{t("forgotPassword.subtitle")}</p>
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit}>
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
          <button
            type="submit"
            className="pp-btn pp-btn-primary w-100 justify-content-center"
            style={{ padding: ".7rem" }}
            disabled={loading}
          >
            {loading ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
          </button>
        </form>
        <p className="text-center mt-3 mb-0" style={{ fontSize: ".9rem" }}>
          {t("forgotPassword.haveAccount")}{" "}
          <Link to="/login" style={{ fontWeight: 600 }}>{t("forgotPassword.signInLink")}</Link>
        </p>
      </div>
    </div>
  );
}
