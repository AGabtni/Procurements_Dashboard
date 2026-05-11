import { useEffect, useState, useRef } from "react";
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
} from "../api/companyApi";
import { getUnlinkedUsers } from "../api/authApi";
import type {
  CompanyProfileDto,
  CompanyMatchDto,
  MatchStatsDto,
  UpdateCompanyProfileRequest,
  CompanyPreferencesRequest,
} from "../types/company";
import type { UserDto } from "../types/auth";
import { CATEGORY_MAP } from "../utils/categoryMap";
import TagInput from "../components/TagInput";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import type { DropdownOption } from "../components/MultiSelectDropdown";

const PROVINCES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const COMMODITY_OPTIONS: DropdownOption[] = Object.entries(CATEGORY_MAP).map(([code, label]) => ({ value: code, label }));
const PROVINCE_OPTIONS: DropdownOption[] = PROVINCES.map((p) => ({ value: p, label: p }));
const NOTICE_TYPE_OPTIONS: DropdownOption[] = [
  "Advance Contract Award Notice","Not Applicable","Other","Request for Information",
  "Request for Proposal","Request for Proposal (Construction)","Request for Standing Offer",
  "RFP against Supply Arrangement",
].map((t) => ({ value: t, label: t }));

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

  // Form
  const [form, setForm] = useState({
    companyName: "", industry: "", province: "", servicesDescription: "",
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
  const [stats, setStats] = useState<MatchStatsDto | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Trigger
  const [matchBusy, setMatchBusy] = useState<Set<number>>(new Set());
  const [matchMsg, setMatchMsg] = useState<Record<number, string>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Link user
  const [showLinkUser, setShowLinkUser] = useState(false);
  const [linkableUsers, setLinkableUsers] = useState<UserDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => { loadProfiles(); }, []);

  useEffect(() => {
    const hasActive = profiles.some(
      (p) => p.matchingStatus === "running" || p.matchingStatus === "pending_rematch" || p.matchingStatus === "pending_reset"
    );
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        try { setProfiles(await getAllProfiles()); } catch { /* ignore */ }
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
      industry: selectedProfile.industry ?? "",
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfile) return;
    setSubmitted(true);
    if (!form.companyName.trim() || form.commodityTypes.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const req: UpdateCompanyProfileRequest = {
        companyName: form.companyName || undefined,
        industry: form.industry || undefined,
        province: form.province || undefined,
        servicesDescription: form.servicesDescription || undefined,
        keywords: form.keywords.length ? form.keywords : undefined,
        certifications: form.certifications.length ? form.certifications : undefined,
        companySize: form.companySize || undefined,
        commodityTypes: form.commodityTypes.length ? form.commodityTypes : undefined,
      };
      const updated = await updateProfile(selectedProfile.id, req);
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

  async function handleTrigger(companyId: number) {
    setMatchBusy((prev) => new Set(prev).add(companyId));
    setMatchMsg((prev) => ({ ...prev, [companyId]: "" }));
    try {
      const result = await triggerMatch(companyId);
      if (result.started) {
        setMatchMsg((prev) => ({ ...prev, [companyId]: "Matching queued" }));
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
      loadDetailMatches();
    }
  }, [detailTab, statusFilter, selectedProfile?.id]);

  async function loadDetailMatches() {
    if (!selectedProfile) return;
    setMatchesLoading(true);
    try {
      const [m, s] = await Promise.all([
        getMatches(selectedProfile.id, statusFilter || undefined),
        getMatchStats(selectedProfile.id),
      ]);
      setMatches(m);
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
        <h2 className="mb-3">All Companies</h2>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {profiles.length === 0 ? (
          <p className="text-muted">No company profiles yet.</p>
        ) : (
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
                    <td>
                      <button className="btn btn-link p-0" onClick={() => openDetail(p.id)}>
                        {p.companyName}
                      </button>
                    </td>
                    <td className="small">{p.ownerName ?? "—"}<br /><span className="text-muted">{p.ownerEmail ?? ""}</span></td>
                    <td>{p.industry ?? "—"}</td>
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
                <p><strong>Industry:</strong> {selectedProfile.industry || "—"}</p>
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
              <label className="form-label">Province</label>
              <select className="form-select" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                <option value="">Select...</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Company Size</label>
              <select className="form-select" value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>
                <option value="">Select...</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Industry</label>
            <input className="form-control" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Services Description</label>
            <textarea className="form-control" rows={3} value={form.servicesDescription} onChange={(e) => setForm({ ...form, servicesDescription: e.target.value })} />
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
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
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
            <div className="table-responsive">
              <table className="table table-hover">
                <thead><tr><th>Score</th><th>Tender</th><th>Organization</th><th>Category</th><th>Closing</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td><span className={`badge ${m.matchScore >= 70 ? "bg-success" : m.matchScore >= 55 ? "bg-warning text-dark" : "bg-secondary"}`}>{m.matchScore}</span></td>
                      <td>
                        <a href={`/tenders/${m.tenderId}`}>{m.tenderTitle ?? m.noticeId}</a>
                        {m.matchReason && <div className="text-muted small">{m.matchReason}</div>}
                      </td>
                      <td className="small">{m.buyingOrganization ?? "—"}</td>
                      <td>{m.procurementCategory ?? "—"}</td>
                      <td className="small">{m.closingDate ? new Date(m.closingDate).toLocaleDateString() : "—"}</td>
                      <td><span className={`badge ${m.status === "new" ? "bg-primary" : m.status === "saved" ? "bg-success" : m.status === "viewed" ? "bg-info" : "bg-secondary"}`}>{m.status}</span></td>
                      <td>
                        <div className="dropdown">
                          <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">Set</button>
                          <ul className="dropdown-menu">
                            {(["new","viewed","saved","dismissed"] as const).map((s) => (
                              <li key={s}><button className="dropdown-item" onClick={() => handleStatusChange(m.id, s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button></li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
