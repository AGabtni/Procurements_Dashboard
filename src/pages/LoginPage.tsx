import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
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
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pp-auth-page">
      <div className="pp-auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">◆</div>
          <h2>ProcurePortal</h2>
          <p>Sign in to your account</p>
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@company.com"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
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
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-center mt-3 mb-0" style={{ fontSize: ".9rem" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ fontWeight: 600 }}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
