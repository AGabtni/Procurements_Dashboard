import { useEffect, useState, useRef, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../api/authApi";
import { useSearchParams, Link } from "react-router-dom";
import { resolveError } from "../utils/resolveError";

export default function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setError(t("resetPassword.noToken"));
      return;
    }

    setToken(token);

  }, [searchParams, t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("resetPassword.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token: token, newPassword: password });
      setSuccess(true);
    } catch (err) {
      setError(resolveError(err, t, "resetPassword.failed"));
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
            <h2>{t("resetPassword.success.title")}</h2>
            <p>{t("resetPassword.success.message")}</p>
          </div>
          <Link to="/login" className="pp-btn pp-btn-primary w-100 justify-content-center">
            {t("resetPassword.success.backToLogin")}
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
          <h2>{t("resetPassword.title")}</h2>
          <p>{t("resetPassword.subtitle")}</p>
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {status !== "error" && <div>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">{t("resetPassword.passwordLabel")}</label>
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
              <div className="form-text">{t("resetPassword.passwordHelp")}</div>
            </div>
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">{t("resetPassword.confirmPasswordLabel")}</label>
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
              {loading ? t("resetPassword.submitting") : t("resetPassword.submit")}
            </button>
          </form>
        </div>
        }
        <p className="text-center mt-3 mb-0" style={{ fontSize: ".9rem" }}>
          {t("register.haveAccount")}{" "}
          <Link to="/login" style={{ fontWeight: 600 }}>{t("register.signInLink")}</Link>
        </p>

      </div>
    </div>
  );
}
