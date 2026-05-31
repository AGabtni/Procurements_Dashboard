import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
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
      <nav className="pp-navbar navbar navbar-expand-lg">
        <div className="container">
          <NavLink className="navbar-brand d-flex align-items-center gap-2" to="/">
            <span className="brand-icon">◆</span>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>
              ProcurePortal
            </span>
          </NavLink>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
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
                    ⌂ Dashboard
                  </NavLink>
                </li>
              )}
              <li className="nav-item">
                <NavLink className="nav-link" to="/tenders">
                  ☰ Tenders
                </NavLink>
              </li>
              {user && user.role !== "admin" && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/my-company">
                    ◈ My Company
                  </NavLink>
                </li>
              )}
              {user && user.role === "admin" && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/admin">
                    ⚙ Admin
                  </NavLink>
                </li>
              )}
            </ul>

            <div className="ms-auto d-flex align-items-center gap-2">
              {user ? (
                <>
                  <NavLink className="nav-link" to="/settings" style={{ color: "#94a3b8", fontSize: ".85rem" }}>
                    Settings
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
                    Logout
                  </button>
                </>
              ) : (
                <NavLink className="pp-btn pp-btn-primary pp-btn-sm" to="/login">
                  Sign In
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
