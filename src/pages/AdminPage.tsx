import { useEffect, useState } from "react";
import { getAllUsers, activateUser, deactivateUser } from "../api/authApi";
import type { UserDto } from "../types/auth";
import AdminCompaniesPage from "./AdminCompaniesPage";

type Tab = "users" | "profiles";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await getAllUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(id: number) {
    try {
      await activateUser(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: true } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDeactivate(id: number) {
    try {
      await deactivateUser(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: false } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border" /></div>;
  }

  return (
    <div>
      <h2 className="mb-3">Admin Panel</h2>
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
            Users ({users.length})
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === "profiles" ? "active" : ""}`} onClick={() => setTab("profiles")}>
            Company Profiles
          </button>
        </li>
      </ul>

      {/* ── Users Tab ── */}
      {tab === "users" && (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
                <th>Company</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td>
                    {u.email}
                    {u.emailConfirmed && <span className="badge bg-success ms-1" title="Email confirmed">✓</span>}
                  </td>
                  <td><span className={`badge ${u.role === "admin" ? "bg-warning text-dark" : "bg-secondary"}`}>{u.role}</span></td>
                  <td>
                    {u.isActive
                      ? <span className="badge bg-success">Active</span>
                      : <span className="badge bg-danger">Inactive</span>}
                  </td>
                  <td>{u.companyName ?? <span className="text-muted">—</span>}</td>
                  <td className="small">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    {u.role !== "admin" && (
                      u.isActive ? (
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeactivate(u.id)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="btn btn-outline-success btn-sm" onClick={() => handleActivate(u.id)}>
                          Activate
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Profiles Tab ── */}
      {tab === "profiles" && <AdminCompaniesPage />}
    </div>
  );
}
