import { useEffect, useState } from "react";
import { getAllUsers, getUnlinkedUsers, activateUser, deactivateUser } from "../api/authApi";
import { getAllProfiles, adminCreateProfile } from "../api/companyApi";
import type { UserDto } from "../types/auth";
import type { CompanyProfileDto, AdminCreateCompanyRequest } from "../types/company";
import { useNavigate } from "react-router-dom";

type Tab = "users" | "profiles";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserDto[]>([]);
  const [profiles, setProfiles] = useState<CompanyProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create profile form
  const [showCreate, setShowCreate] = useState(false);
  const [unlinkedUsers, setUnlinkedUsers] = useState<UserDto[]>([]);
  const [createForm, setCreateForm] = useState({ companyName: "", userId: "" });
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [u, p] = await Promise.all([getAllUsers(), getAllProfiles()]);
      setUsers(u);
      setProfiles(p);
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

  async function openCreateForm() {
    setShowCreate(true);
    setCreateForm({ companyName: "", userId: "" });
    try {
      setUnlinkedUsers(await getUnlinkedUsers());
    } catch {
      setUnlinkedUsers([]);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.companyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const req: AdminCreateCompanyRequest = {
        companyName: createForm.companyName.trim(),
        userId: createForm.userId ? Number(createForm.userId) : undefined,
      };
      await adminCreateProfile(req);
      setShowCreate(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setCreating(false);
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
            Company Profiles ({profiles.length})
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
      {tab === "profiles" && (
        <div>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-primary btn-sm" onClick={openCreateForm}>
              + Create Profile
            </button>
          </div>

          {showCreate && (
            <div className="card mb-3">
              <div className="card-body">
                <h6>Create Company Profile</h6>
                <form onSubmit={handleCreate} className="row g-2 align-items-end">
                  <div className="col-md-4">
                    <label className="form-label">Company Name <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      required
                      value={createForm.companyName}
                      onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Link to User (optional)</label>
                    <select
                      className="form-select"
                      value={createForm.userId}
                      onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                    >
                      <option value="">— No user (standalone) —</option>
                      {unlinkedUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4 d-flex gap-2">
                    <button className="btn btn-success btn-sm" type="submit" disabled={creating}>
                      {creating ? "Creating..." : "Create"}
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setShowCreate(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Owner</th>
                  <th>Industry</th>
                  <th>Province</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td>{p.companyName}</td>
                    <td className="small">{p.ownerName ?? <span className="text-muted">—</span>}</td>
                    <td>{p.industry ?? "—"}</td>
                    <td>{p.province ?? "—"}</td>
                    <td>{getStatusBadge(p.matchingStatus)}</td>
                    <td>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`/admin/companies?id=${p.id}`)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "running":
    case "pending_rematch":
    case "pending_reset":
      return <span className="badge bg-warning text-dark">Matching...</span>;
    case "idle":
      return <span className="badge bg-success">Idle</span>;
    case "failed":
      return <span className="badge bg-danger">Failed</span>;
    default:
      return <span className="badge bg-light text-muted">{status}</span>;
  }
}
