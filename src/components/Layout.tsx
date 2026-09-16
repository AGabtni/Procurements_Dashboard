import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";

// Single source of truth for the trial clock: company_profile.trial_ends_at + subscription_status.
// (Not app_user.activated_at — that only marks admin activation now.)
function TrialBanner({ subscriptionStatus, trialEndsAt }: { subscriptionStatus: string | null; trialEndsAt: string | null }) {
  const { t } = useTranslation("common");
  // Trial ended — one red bar that matches the server-side lock exactly.
  if (subscriptionStatus === "expired") {
    return (
      <div style={{
        background: "#b91c1c",
        color: "rgba(255,255,255,.9)",
        textAlign: "center",
        padding: "6px 16px",
        fontSize: ".85rem",
      }}>
        <Trans i18nKey="trial.endedBanner" t={t} components={{ 1: <strong /> }} />
        {" "}{t("trial.questions")}{" "}
        <a href="mailto:admin.procureportal@gmail.com" style={{ color: "rgba(255,255,255,.9)", textDecoration: "underline" }}>
          admin.procureportal@gmail.com
        </a>
      </div>
    );
  }

  // Paid or no company yet → no banner.
  if (subscriptionStatus !== "trialing" || !trialEndsAt) return null;

  const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft <= 0) return null; // status not yet refreshed to expired; lock still governs
  return (
    <div style={{
      background: "#1d4ed8",
      color: "rgba(255,255,255,.75)",
      textAlign: "center",
      padding: "6px 16px",
      fontSize: ".85rem",
    }}>
      <Trans i18nKey="trial.daysLeftBanner" t={t} count={daysLeft} components={{ 1: <strong /> }} />
      {" "}{t("trial.questions")}{" "}
      <a href="mailto:admin.procureportal@gmail.com" style={{ color: "rgba(255,255,255,.75)", textDecoration: "underline" }}>
        admin.procureportal@gmail.com
      </a>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <>
      {user && user.role !== "admin" && <TrialBanner subscriptionStatus={user.subscriptionStatus} trialEndsAt={user.trialEndsAt} />}
      <nav className="pp-navbar navbar navbar-expand-lg">
        <div className="container">
          <NavLink className="navbar-brand d-flex align-items-center gap-2" to="/">
            <span className="brand-icon">◆</span>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>
              {t("appName")}
            </span>
          </NavLink>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label={t("nav.toggle")}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-4 gap-1">
              {user && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/">
                    ⌂ {t("nav.dashboard")}
                  </NavLink>
                </li>
              )}
              <li className="nav-item">
                <NavLink className="nav-link" to="/tenders">
                  ☰ {t("nav.tenders")}
                </NavLink>
              </li>
              {user && user.role !== "admin" && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/my-company">
                    ◈ {t("nav.myCompany")}
                  </NavLink>
                </li>
              )}
              {user && user.role === "admin" && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/admin">
                    ⚙ {t("nav.admin")}
                  </NavLink>
                </li>
              )}
            </ul>

            <div className="ms-auto d-flex align-items-center gap-2">
              <LanguageSwitcher />
              {user ? (
                <>
                  <NavLink className="nav-link" to="/settings" style={{ color: "#94a3b8", fontSize: ".85rem" }}>
                    {t("nav.settings")}
                  </NavLink>
                  <div className="pp-user-pill">
                    <span className="pp-user-avatar">
                      {getInitials(user.fullName)}
                    </span>
                    <span>{user.fullName}</span>
                  </div>
                  <button
                    className="pp-btn pp-btn-ghost pp-btn-sm"
                    onClick={handleLogout}
                    style={{ color: "#94a3b8", borderColor: "rgba(255,255,255,.1)" }}
                  >
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <NavLink className="pp-btn pp-btn-primary pp-btn-sm" to="/login">
                  {t("nav.signIn")}
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
