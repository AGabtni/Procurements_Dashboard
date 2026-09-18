import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { resolveError } from "../utils/resolveError";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/");
    } catch (err) {
      setError(resolveError(err, t, "login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pp-auth-page">
      <div className="pp-auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">◆</div>
          <h2>{t("brand")}</h2>
          <p>{t("login.subtitle")}</p>
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">{t("login.emailLabel")}</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder={t("login.emailPlaceholder")}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">{t("login.passwordLabel")}</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="pp-btn pp-btn-primary w-100 justify-content-center"
            disabled={loading}
            style={{ padding: ".7rem" }}
          >
            {loading ? t("login.submitting") : t("login.submit")}
          </button>
        </form>
        <p className="text-center mt-3 mb-0" style={{ fontSize: ".9rem" }}>
          {t("login.noAccount")}{" "}
          <Link to="/register" style={{ fontWeight: 600 }}>{t("login.signUpLink")}</Link>
        </p>
      </div>
    </div>
  );
}
