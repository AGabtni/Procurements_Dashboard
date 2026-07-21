import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  getAllProfiles,
  getProfileById,
  updateProfile,
  updatePreferences,
  getMatches,
  getMatchStats,
  updateMatchStatus,
  triggerMatch,
  linkUserToProfile,
  adminCreateProfile,
} from "../api/companyApi";
import { getUnlinkedUsers } from "../api/authApi";
import type {
  CompanyProfileDto,
  CompanyMatchDto,
  MatchStatsDto,
  UpdateCompanyProfileRequest,
  CompanyPreferencesRequest,
  AdminCreateCompanyRequest,
} from "../types/company";
import type { UserDto } from "../types/auth";
import { CATEGORY_MAP } from "../utils/categoryMap";
import TagInput from "../components/TagInput";
import MatchesTable from "../components/MatchesTable";
import Pagination from "../components/Pagination";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import type { DropdownOption } from "../components/MultiSelectDropdown";
import IndustryPicker from "../components/IndustryPicker";

const PROVINCES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const COMMODITY_OPTIONS: DropdownOption[] = Object.entries(CATEGORY_MAP).map(([code, label]) => ({ value: code, label }));
const PROVINCE_OPTIONS: DropdownOption[] = PROVINCES.map((p) => ({ value: p, label: p }));
const NOTICE_TYPE_OPTIONS: DropdownOption[] = [
  "Advance Contract Award Notice","Not Applicable","Other","Request for Information",
  "Request for Proposal","Request for Proposal (Construction)","Request for Standing Offer",
  "RFP against Supply Arrangement",
].map((t) => ({ value: t, label: t }));

function descFingerprint(s: string) {
  return s.trim().replace(/\s+/g, ' ').replace(/[.,;!?]+$/, '');
}

type View = "list" | "detail";
type DetailTab = "profile" | "matches";

export default function AdminCompaniesPage() {
  const [view, setView] = useState<View>("list");
  const [profiles, setProfiles] = useState<CompanyProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail state
  const [selectedProfile, setSelectedProfile] = useState<CompanyProfileDto | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("profile");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);  // modal visibility

  // Form
  const [form, setForm] = useState({
    companyName: "", industryCodes: [] as string[], province: "", servicesDescription: "",
    keywords: [] as string[], certifications: [] as string[],
    companySize: "", commodityTypes: [] as string[],
  });
  const [prefsForm, setPrefsForm] = useState({
    preferredOrgs: [] as string[], preferredNtTypes: [] as string[],
    preferredProvinces: [] as string[], minValue: "", maxValue: "",
    excludeKeywords: [] as string[],
  });

  // Matches
  const [matches, setMatches] = useState<CompanyMatchDto[]>([]);
  const [matchPage, setMatchPage] = useState(1);
  const [matchTotalPages, setMatchTotalPages] = useState(1);
  const [matchTotalCount, setMatchTotalCount] = useState(0);
  const [stats, setStats] = useState<MatchStatsDto | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Trigger
  const [matchBusy, setMatchBusy] = useState<Set<number>>(new Set());
  const [matchMsg, setMatchMsg] = useState<Record<number, string>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create profile
  const [showCreate, setShowCreate] = useState(false);
  const [createUnlinkedUsers, setCreateUnlinkedUsers] = useState<UserDto[]>([]);
  const [createForm, setCreateForm] = useState({ companyName: "", userId: "" });
  const [creating, setCreating] = useState(false);

  // Link user
  const [showLinkUser, setShowLinkUser] = useState(false);
  const [linkableUsers, setLinkableUsers] = useState<UserDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => { loadProfiles(); }, []);

  async function openCreateForm() {
    setShowCreate(true);
    setCreateForm({ companyName: "", userId: "" });
    try {
      setCreateUnlinkedUsers(await getUnlinkedUsers());
    } catch {
      setCreateUnlinkedUsers([]);
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
        industryCodes: [],
      };
      await adminCreateProfile(req);
      setShowCreate(false);
      await loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    const hasActive = profiles.some(
      (p) => p.matchingStatus === "running" || p.matchingStatus === "pending_rematch" || p.matchingStatus === "pending_reset"
    );
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        try {
          const updated = await getAllProfiles();
          setProfiles(updated);
          setSelectedProfile((prev) => prev ? (updated.find((p) => p.id === prev.id) ?? prev) : null);
        } catch { /* ignore */ }
      }, 5000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [profiles]);

  async function loadProfiles() {
    setLoading(true);
    try { setProfiles(await getAllProfiles()); } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally { setLoading(false); }
  }

  async function openDetail(id: number) {
    setError(null);
    try {
      const p = await getProfileById(id);
      setSelectedProfile(p);
      setView("detail");
      setDetailTab("profile");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    }
  }

  function backToList() {
    setView("list");
    setSelectedProfile(null);
    setEditing(false);
    loadProfiles();
  }

  function startEdit() {
    if (!selectedProfile) return;
    setEditing(true);
    setForm({
      companyName: selectedProfile.companyName,
      industryCodes: selectedProfile.industryCodes ?? [],
      province: selectedProfile.province ?? "",
      servicesDescription: selectedProfile.servicesDescription ?? "",
      keywords: selectedProfile.keywords ?? [],
      certifications: selectedProfile.certifications ?? [],
      companySize: selectedProfile.companySize ?? "",
      commodityTypes: selectedProfile.commodityTypes ?? [],
    });
    const prefs = selectedProfile.preferences;
    setPrefsForm({
      preferredOrgs: prefs?.preferredOrgs ?? [],
      preferredNtTypes: prefs?.preferredNtTypes ?? [],
      preferredProvinces: prefs?.preferredProvinces ?? [],
      minValue: prefs?.minValue?.toString() ?? "",
      maxValue: prefs?.maxValue?.toString() ?? "",
      excludeKeywords: prefs?.excludeKeywords ?? [],
    });
    setShowPrefs(!!prefs);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfile) return;
    setSubmitted(true);
    if (!form.companyName.trim() || !form.province || !form.companySize || (form.servicesDescription?.length ?? 0) < 150 || form.industryCodes.length === 0 || form.commodityTypes.length === 0) return;
    if (!hasChanges()) { setEditing(false); return; }
    setConfirmSave(true);
  }

  async function executeSave() {
    if (!selectedProfile) return;
    setSaving(true);
    setError(null);
    setConfirmSave(false);  // close modal before API call
    try {
      const req: UpdateCompanyProfileRequest = {
        companyName: form.companyName || undefined,
        industryCodes: form.industryCodes,
        province: form.province || undefined,
        servicesDescription: descFingerprint(form.servicesDescription) !== descFingerprint(selectedProfile?.servicesDescription ?? "")
          ? form.servicesDescription
          : undefined,
        keywords: form.keywords,
        certifications: form.certifications,
        companySize: form.companySize || undefined,
        commodityTypes: form.commodityTypes.length ? form.commodityTypes : undefined,
      };
      await updateProfile(selectedProfile.id, req);
      if (showPrefs) {
        await updatePreferences(selectedProfile.id, buildPrefsRequest());
      }
      setSelectedProfile(await getProfileById(selectedProfile.id));
      setEditing(false);
      setSubmitted(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  }

  function buildPrefsRequest(): CompanyPreferencesRequest {
    return {
      preferredOrgs: prefsForm.preferredOrgs.length ? prefsForm.preferredOrgs : undefined,
      preferredNtTypes: prefsForm.preferredNtTypes.length ? prefsForm.preferredNtTypes : undefined,
      preferredProvinces: prefsForm.preferredProvinces.length ? prefsForm.preferredProvinces : undefined,
      minValue: prefsForm.minValue ? Number(prefsForm.minValue) : undefined,
      maxValue: prefsForm.maxValue ? Number(prefsForm.maxValue) : undefined,
      excludeKeywords: prefsForm.excludeKeywords.length ? prefsForm.excludeKeywords : undefined,
    };
  }

  function hasChanges(): boolean {
    if (!selectedProfile) return true;
    const arr = (a?: string[] | null, b?: string[] | null) =>
      [...(a ?? [])].sort().join("\0") !== [...(b ?? [])].sort().join("\0");
    const p = selectedProfile;
    const pr = p.preferences;
    return (
      form.companyName       !== p.companyName ||
      form.province          !== (p.province ?? "") ||
      form.companySize       !== (p.companySize ?? "") ||
      descFingerprint(form.servicesDescription) !== descFingerprint(p.servicesDescription ?? "") ||
      arr(form.keywords,       p.keywords) ||
      arr(form.certifications, p.certifications) ||
      arr(form.industryCodes,  p.industryCodes) ||
      arr(form.commodityTypes, p.commodityTypes) ||
      arr(prefsForm.preferredOrgs,      pr?.preferredOrgs) ||
      arr(prefsForm.preferredNtTypes,   pr?.preferredNtTypes) ||
      arr(prefsForm.preferredProvinces, pr?.preferredProvinces) ||
      arr(prefsForm.excludeKeywords,    pr?.excludeKeywords)
    );
  }

  async function handleTrigger(companyId: number) {
    setMatchBusy((prev) => new Set(prev).add(companyId));
    setMatchMsg((prev) => ({ ...prev, [companyId]: "" }));
    try {
      const result = await triggerMatch(companyId);
      if (result.started) {
        setMatchMsg((prev) => ({ ...prev, [companyId]: "Matching queued" }));
        setProfiles((prev) => prev.map((p) => p.id === companyId ? { ...p, matchingStatus: "pending_rematch" } : p));
        setSelectedProfile((prev) => prev?.id === companyId ? { ...prev, matchingStatus: "pending_rematch" } : prev);
        await loadProfiles();
      } else {
        setMatchMsg((prev) => ({ ...prev, [companyId]: result.message }));
      }
    } catch (err) {
      setMatchMsg((prev) => ({ ...prev, [companyId]: err instanceof Error ? err.message : "Failed" }));
    } finally {
      setMatchBusy((prev) => { const n = new Set(prev); n.delete(companyId); return n; });
    }
  }

  async function openLinkUser() {
    setShowLinkUser(true);
    setSelectedUserId(selectedProfile?.userId?.toString() ?? "");
    try {
      const users = await getUnlinkedUsers();
      // Also include the currently linked user if any
      if (selectedProfile?.userId && selectedProfile?.ownerName) {
        const current: UserDto = {
          id: selectedProfile.userId,
          email: selectedProfile.ownerEmail ?? "",
          fullName: selectedProfile.ownerName,
          role: "", isActive: true, createdAt: "", emailConfirmed: false,
          notificationsEnabled: false, companyId: selectedProfile.id,
          companyName: selectedProfile.companyName,
        };
        setLinkableUsers([current, ...users]);
      } else {
        setLinkableUsers(users);
      }
    } catch {
      setLinkableUsers([]);
    }
  }

  async function handleLinkUser() {
    if (!selectedProfile) return;
    setLinkBusy(true);
    setError(null);
    try {
      const userId = selectedUserId ? Number(selectedUserId) : null;
      await linkUserToProfile(selectedProfile.id, userId);
      setSelectedProfile(await getProfileById(selectedProfile.id));
      setShowLinkUser(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link user");
    } finally {
      setLinkBusy(false);
    }
  }

  // Load matches for detail view
  useEffect(() => {
    if (view === "detail" && detailTab === "matches" && selectedProfile) {
      loadDetailMatches(matchPage);
    }
  }, [detailTab, statusFilter, selectedProfile?.id, matchPage]);

  // Reset to page 1 when filter or company changes
  useEffect(() => {
    setMatchPage(1);
  }, [statusFilter, selectedProfile?.id]);

  async function loadDetailMatches(page = 1) {
    if (!selectedProfile) return;
    setMatchesLoading(true);
    try {
      const [result, s] = await Promise.all([
        getMatches(selectedProfile.id, statusFilter || undefined, page),
        getMatchStats(selectedProfile.id),
      ]);
      setMatches(result.items);
      setMatchPage(result.page);
      setMatchTotalPages(result.totalPages);
      setMatchTotalCount(result.totalCount);
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally { setMatchesLoading(false); }
  }

  async function handleStatusChange(matchId: number, newStatus: "new" | "viewed" | "saved" | "dismissed") {
    if (!selectedProfile) return;
    try {
      await updateMatchStatus(selectedProfile.id, matchId, { status: newStatus });
      await loadDetailMatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  function isMatchActive(p: CompanyProfileDto) {
    return p.matchingStatus === "running" || p.matchingStatus === "pending_rematch" || p.matchingStatus === "pending_reset";
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "running": case "pending_rematch": case "pending_reset":
        return <span className="badge bg-warning text-dark">Matching...</span>;
      case "completed": return <span className="badge bg-success">Matched</span>;
      case "failed": return <span className="badge bg-danger">Failed</span>;
      default: return <span className="badge bg-light text-muted">Not matched</span>;
    }
  }

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border" /></div>;
  }

  // ── List View ──
  if (view === "list") {
    return (
      <div>
        {error && <div className="alert alert-danger py-2">{error}</div>}

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
                    {createUnlinkedUsers.map((u) => (
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

        {profiles.length === 0 ? (
          <p className="text-muted">No company profiles yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Owner</th>
                  <th>Industries</th>
                  <th>Province</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button className="btn btn-link p-0" onClick={() => openDetail(p.id)}>
                        {p.companyName}
                      </button>
                    </td>
                    <td className="small">{p.ownerName ?? "—"}<br /><span className="text-muted">{p.ownerEmail ?? ""}</span></td>
                    <td className="small">{p.industryCodes?.length ? p.industryCodes.join(", ") : "—"}</td>
                    <td>{p.province ?? "—"}</td>
                    <td>{getStatusBadge(p.matchingStatus)}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleTrigger(p.id)}
                          disabled={matchBusy.has(p.id) || isMatchActive(p)}
                        >
                          {matchBusy.has(p.id) || isMatchActive(p) ? "..." : "Match"}
                        </button>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => openDetail(p.id)}>
                          View
                        </button>
                      </div>
                      {matchMsg[p.id] && <div className="text-muted small">{matchMsg[p.id]}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── Detail View ──
  if (!selectedProfile) return null;

  return (
    <div>
      {confirmSave && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card shadow-lg" style={{ maxWidth: 420, width: "90%", borderRadius: 10 }}>
            <div className="card-body p-4">
              <h5 className="mb-1">Save Changes</h5>
              <p className="text-muted small mb-4">Save changes to this company profile? If the description changed, keywords will be re-extracted on the next match run.</p>
              <div className="d-flex gap-2 justify-content-end">
                <button className="btn btn-secondary" onClick={() => setConfirmSave(false)}>Go Back</button>
                <button className="btn btn-primary" disabled={saving} onClick={executeSave}>
                  {saving ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      <button className="btn btn-outline-secondary btn-sm mb-3" onClick={backToList}>
        ← Back to Companies
      </button>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{selectedProfile.companyName}</h2>
        <div className="d-flex gap-2 align-items-center">
          {getStatusBadge(selectedProfile.matchingStatus)}
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => handleTrigger(selectedProfile.id)}
            disabled={matchBusy.has(selectedProfile.id) || isMatchActive(selectedProfile)}
          >
            Run Matching
          </button>
        </div>
      </div>

      {selectedProfile.ownerName ? (
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="text-muted">Owner: {selectedProfile.ownerName} ({selectedProfile.ownerEmail})</span>
          <button className="btn btn-outline-secondary btn-sm" onClick={openLinkUser}>Change</button>
        </div>
      ) : (
        <div className="d-flex align-items-center gap-2 mb-2">
          <span className="text-muted">No owner linked</span>
          <button className="btn btn-outline-primary btn-sm" onClick={openLinkUser}>Link User</button>
        </div>
      )}

      {showLinkUser && (
        <div className="card mb-3">
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Assign User</label>
                <select
                  className="form-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">— No user (unlink) —</option>
                  {linkableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 d-flex gap-2">
                <button className="btn btn-success btn-sm" onClick={handleLinkUser} disabled={linkBusy}>
                  {linkBusy ? "Saving..." : "Save"}
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowLinkUser(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${detailTab === "profile" ? "active" : ""}`} onClick={() => setDetailTab("profile")}>
            Profile
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${detailTab === "matches" ? "active" : ""}`} onClick={() => { setDetailTab("matches"); setStatusFilter(""); }}>
            Matches
          </button>
        </li>
      </ul>

      {/* Profile view/edit */}
      {detailTab === "profile" && !editing && (
        <div>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-primary btn-sm" onClick={startEdit}>Edit Profile</button>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card"><div className="card-body">
                <h6 className="card-subtitle text-muted mb-2">Company Details</h6>
                <p><strong>Name:</strong> {selectedProfile.companyName}</p>
                <p><strong>Industries:</strong>{" "}
                  {selectedProfile.industries?.length
                    ? selectedProfile.industries.map((i) => `${i.code} — ${i.titleEn}`).join(", ")
                    : "—"}
                </p>
                <p><strong>Province:</strong> {selectedProfile.province || "—"}</p>
                <p><strong>Size:</strong> {selectedProfile.companySize || "—"}</p>
                <p><strong>Commodity Types:</strong> {selectedProfile.commodityTypes?.length ? selectedProfile.commodityTypes.map((c) => CATEGORY_MAP[c] || c).join(", ") : "—"}</p>
              </div></div>
            </div>
            <div className="col-md-6">
              <div className="card"><div className="card-body">
                <h6 className="card-subtitle text-muted mb-2">Services & Keywords</h6>
                <p><strong>Description:</strong></p>
                <p className="text-muted">{selectedProfile.servicesDescription || "—"}</p>
                <p><strong>Keywords:</strong></p>
                <div>
                  {selectedProfile.keywords?.length ? selectedProfile.keywords.map((k) => (
                    <span key={k} className="badge bg-primary bg-opacity-10 text-primary me-1 mb-1">{k}</span>
                  )) : <span className="text-muted">None</span>}
                </div>
                {selectedProfile.autoKeywords && selectedProfile.autoKeywords.length > 0 && (
                  <>
                    <p className="mt-2"><strong>Auto Keywords:</strong></p>
                    <div>{selectedProfile.autoKeywords.map((k) => (
                      <span key={k} className="badge bg-info bg-opacity-10 text-info me-1 mb-1">{k}</span>
                    ))}</div>
                  </>
                )}
              </div></div>
            </div>
          </div>
        </div>
      )}

      {detailTab === "profile" && editing && (
        <form onSubmit={handleSave}>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Company Name <span className="text-danger fw-bold">*</span></label>
              <input className={`form-control${submitted && !form.companyName.trim() ? " is-invalid" : ""}`} required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Province <span className="text-danger fw-bold">*</span></label>
              <select className={`form-select${submitted && !form.province ? " is-invalid" : ""}`} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                <option value="">Select...</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {submitted && !form.province && <div className="text-danger small mt-1">Please select a province.</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label">Company Size <span className="text-danger fw-bold">*</span></label>
              <select className={`form-select${submitted && !form.companySize ? " is-invalid" : ""}`} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>
                <option value="">Select...</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {submitted && !form.companySize && <div className="text-danger small mt-1">Please select a company size.</div>}
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Industries <span className="text-danger fw-bold">*</span></label>
            <IndustryPicker
              value={form.industryCodes}
              onChange={(codes) => setForm({ ...form, industryCodes: codes })}
              initialLabels={Object.fromEntries((selectedProfile?.industries ?? []).map((i) => [i.code, i.titleEn]))}
              error={submitted && form.industryCodes.length === 0}
              id="admin-edit-industries"
            />
            {submitted && form.industryCodes.length === 0 && (
              <div className="text-danger small mt-1">Please select at least one industry.</div>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">Services Description <span className="text-danger fw-bold">*</span></label>
            <textarea
              className={`form-control${submitted && (form.servicesDescription?.length ?? 0) < 150 ? " is-invalid" : ""}`}
              rows={4}
              maxLength={2000}
              value={form.servicesDescription}
              onChange={(e) => setForm({ ...form, servicesDescription: e.target.value })}
              placeholder="e.g. We implement and support SAP and Oracle ERP systems for mid-size manufacturers, including S/4HANA migrations, system integrations, and managed cloud hosting. Our team holds SAP Activate certification and has delivered 30+ projects across automotive and industrial sectors."
            />
            <div className="d-flex justify-content-between mt-1">
              {submitted && (form.servicesDescription?.length ?? 0) < 150
                ? <div className="text-danger small">At least 150 characters required.</div>
                : <div className="text-muted small">Be specific: technologies, platforms, certifications, sectors.</div>}
              <div className={`small ms-2 flex-shrink-0 ${
                (form.servicesDescription?.length ?? 0) === 2000 ? "text-danger" :
                (form.servicesDescription?.length ?? 0) >= 1800 ? "text-warning" :
                (form.servicesDescription?.length ?? 0) >= 150 ? "text-success" : "text-muted"
              }`}>
                {form.servicesDescription?.length ?? 0} / 2000
              </div>
            </div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Keywords</label>
              <TagInput value={form.keywords} onChange={(tags) => setForm({ ...form, keywords: tags })} placeholder="Type keyword and press Enter" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Certifications</label>
              <TagInput value={form.certifications} onChange={(tags) => setForm({ ...form, certifications: tags })} placeholder="Type certification and press Enter" />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Commodity Types <span className="text-danger fw-bold">*</span></label>
            <MultiSelectDropdown id="commodityTypes" options={COMMODITY_OPTIONS} value={form.commodityTypes} onChange={(sel) => setForm({ ...form, commodityTypes: sel })} placeholder="Select commodity types..." className={submitted && form.commodityTypes.length === 0 ? "is-invalid" : ""} />
            {submitted && form.commodityTypes.length === 0 && <div className="text-danger small mt-1">Please select at least one commodity type.</div>}
          </div>
          <div className="mb-3">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowPrefs(!showPrefs)}>
              {showPrefs ? "▼ Hide" : "▶ Show"} Matching Preferences
            </button>
          </div>
          {showPrefs && (
            <div className="card mb-3"><div className="card-body">
              <h5 className="card-title">Matching Preferences</h5>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Preferred Organizations</label>
                  <TagInput value={prefsForm.preferredOrgs} onChange={(tags) => setPrefsForm({ ...prefsForm, preferredOrgs: tags })} placeholder="Type organization and press Enter" />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Preferred Notice Types</label>
                  <MultiSelectDropdown id="prefNtTypes" options={NOTICE_TYPE_OPTIONS} value={prefsForm.preferredNtTypes} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredNtTypes: sel })} placeholder="Select notice types..." />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Preferred Provinces</label>
                  <MultiSelectDropdown id="prefProvinces" options={PROVINCE_OPTIONS} value={prefsForm.preferredProvinces} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredProvinces: sel })} placeholder="Select provinces..." />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label">Min Value ($)</label>
                  <input type="number" className="form-control" value={prefsForm.minValue} onChange={(e) => setPrefsForm({ ...prefsForm, minValue: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Max Value ($)</label>
                  <input type="number" className="form-control" value={prefsForm.maxValue} onChange={(e) => setPrefsForm({ ...prefsForm, maxValue: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Exclude Keywords</label>
                  <TagInput value={prefsForm.excludeKeywords} onChange={(tags) => setPrefsForm({ ...prefsForm, excludeKeywords: tags })} placeholder="Type keyword and press Enter" />
                </div>
              </div>
            </div></div>
          )}
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Matches tab */}
      {detailTab === "matches" && (
        <div>
          {stats && (
            <div className="row g-3 mb-3">
              {[
                { label: "Total", value: stats.totalMatches, bg: "light" },
                { label: "New", value: stats.newCount, bg: "primary" },
                { label: "Saved", value: stats.savedCount, bg: "success" },
                { label: "Viewed", value: stats.viewedCount, bg: "info" },
                { label: "Avg Score", value: stats.averageScore, bg: "warning" },
                { label: "High Score", value: stats.highScoreCount, bg: "danger" },
              ].map(({ label, value, bg }) => (
                <div key={label} className="col-md-2">
                  <div className={`card text-center border-${bg}`}><div className="card-body py-2">
                    <div className="fw-bold fs-5">{value}</div>
                    <small className="text-muted">{label}</small>
                  </div></div>
                </div>
              ))}
            </div>
          )}
          <div className="btn-group mb-3">
            {[{ label: "All", value: "" },{ label: "New", value: "new" },{ label: "Viewed", value: "viewed" },{ label: "Saved", value: "saved" },{ label: "Dismissed", value: "dismissed" }].map(({ label, value }) => (
              <button key={value} className={`btn btn-sm ${statusFilter === value ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setStatusFilter(value)}>
                {label}
              </button>
            ))}
          </div>
          {matchesLoading ? (
            <div className="text-center py-3"><div className="spinner-border spinner-border-sm" /></div>
          ) : matches.length === 0 ? (
            <p className="text-muted">No matches found.</p>
          ) : (
            <>
              <MatchesTable matches={matches} showReason onStatusChange={handleStatusChange} />
              <Pagination
                page={matchPage}
                totalPages={matchTotalPages}
                totalCount={matchTotalCount}
                onPageChange={setMatchPage}
                label="match"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
