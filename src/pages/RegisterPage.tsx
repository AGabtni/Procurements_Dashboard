import { useState, type FormEvent } from "react";
import { register } from "../api/authApi";
import { Link } from "react-router-dom";

export default function RegisterPage() {
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
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register({ email, fullName, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
            <h2>Account Created</h2>
            <p>Your account is pending admin activation. You'll be able to sign in once approved.</p>
          </div>
          <Link to="/login" className="pp-btn pp-btn-primary w-100 justify-content-center">
            Back to Sign In
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
          <h2>Create Account</h2>
          <p>Start discovering procurement opportunities</p>
        </div>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="fullName" className="form-label">Full Name</label>
            <input
              id="fullName"
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
              placeholder="John Smith"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
              minLength={8}
              placeholder="••••••••"
            />
            <div className="form-text">Minimum 8 characters</div>
          </div>
          <div className="mb-3">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
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
              {loading ? "Creating account…" : "Sign Up"}
            </button>
        </form>
        <p className="text-center mt-3 mb-0" style={{ fontSize: ".9rem" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
