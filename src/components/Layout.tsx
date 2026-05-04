import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <NavLink className="navbar-brand fw-bold" to="/">
            ProcurePortal
          </NavLink>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item">
                <NavLink className="nav-link" to="/">
                  Tenders
                </NavLink>
              </li>
              {user && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/my-company">
                    My Company
                  </NavLink>
                </li>
              )}
              {user && user.role === "admin" && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/admin/companies">
                    All Companies
                  </NavLink>
                </li>
              )}
            </ul>
            <ul className="navbar-nav ms-auto">
              {user ? (
                <>
                  <li className="nav-item">
                    <span className="nav-link text-light">
                      {user.fullName}
                    </span>
                  </li>
                  <li className="nav-item">
                    <button
                      className="btn btn-outline-light btn-sm my-1"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/login">
                    Login
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
