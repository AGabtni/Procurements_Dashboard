import { useEffect, useState, useCallback, useRef } from "react";
import {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
  updateMyPreferences,
  getMyMatches,
  getMyMatchStats,
  updateMyMatchStatus,
  triggerMyMatch,
} from "../api/companyApi";
import type {
  CompanyProfileDto,
  CompanyMatchDto,
  MatchStatsDto,
  CreateCompanyProfileRequest,
  UpdateCompanyProfileRequest,
  CompanyPreferencesRequest,
} from "../types/company";
import { CATEGORY_MAP } from "../utils/categoryMap";
import TagInput from "../components/TagInput";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import type { DropdownOption } from "../components/MultiSelectDropdown";
import type { TriggerMatchResult } from "../api/companyApi";

const PROVINCES = [
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT",
];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const COMMODITY_OPTIONS: DropdownOption[] = Object.entries(CATEGORY_MAP).map(
  ([code, label]) => ({ value: code, label })
);
const PROVINCE_OPTIONS: DropdownOption[] = PROVINCES.map((p) => ({
  value: p,
  label: p,
}));
const NOTICE_TYPE_OPTIONS: DropdownOption[] = [
  "Advance Contract Award Notice",
  "Not Applicable",
  "Other",
  "Request for Information",
  "Request for Proposal",
  "Request for Proposal (Construction)",
  "Request for Standing Offer",
  "RFP against Supply Arrangement",
].map((t) => ({ value: t, label: t }));

type Tab = "profile" | "matches";

export default function MyCompanyPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<CompanyProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile editing
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    province: "",
    servicesDescription: "",
    keywords: [] as string[],
    certifications: [] as string[],
    companySize: "",
    commodityTypes: [] as string[],
  });
  const [prefsForm, setPrefsForm] = useState({
    preferredOrgs: [] as string[],
    preferredNtTypes: [] as string[],
    preferredProvinces: [] as string[],
    minValue: "",
    maxValue: "",
    excludeKeywords: [] as string[],
  });

  // Matches
  const [matches, setMatches] = useState<CompanyMatchDto[]>([]);
  const [stats, setStats] = useState<MatchStatsDto | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Matching trigger
  const [matchBusy, setMatchBusy] = useState(false);
  const [matchMsg, setMatchMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!form.companyName.trim() || form.commodityTypes.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const req: CreateCompanyProfileRequest = {
        companyName: form.companyName,
        industry: form.industry || undefined,
        province: form.province || undefined,
        servicesDescription: form.servicesDescription || undefined,
        keywords: form.keywords.length ? form.keywords : undefined,
        certifications: form.certifications.length ? form.certifications : undefined,
        companySize: form.companySize || undefined,
        commodityTypes: form.commodityTypes.length ? form.commodityTypes : undefined,
      };
      if (showPrefs) {
        req.preferences = buildPrefsRequest();
      }
      await createMyProfile(req);
      setEditing(false);
      setSubmitted(false);
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Poll while matching is active
  useEffect(() => {
    const isActive =
      profile?.matchingStatus === "running" ||
      profile?.matchingStatus === "pending_rematch" ||
      profile?.matchingStatus === "pending_reset";
    if (isActive && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        try {
          const data = await getMyProfile();
          setProfile(data);
        } catch { /* ignore */ }
      }, 5000);
    } else if (!isActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [profile?.matchingStatus]);

  // Load matches when switching to matches tab
  useEffect(() => {
    if (tab === "matches" && profile) {
      loadMatches();
    }
  }, [tab, statusFilter]);

  async function loadMatches() {
    setMatchesLoading(true);
    try {
      const [m, s] = await Promise.all([
        getMyMatches(statusFilter || undefined),
        getMyMatchStats(),
      ]);
      setMatches(m);
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setMatchesLoading(false);
    }
  }

  function startEdit() {
    if (!profile) return;
    setEditing(true);
    setForm({
      companyName: profile.companyName,
      industry: profile.industry ?? "",
      province: profile.province ?? "",
      servicesDescription: profile.servicesDescription ?? "",
      keywords: profile.keywords ?? [],
      certifications: profile.certifications ?? [],
      companySize: profile.companySize ?? "",
      commodityTypes: profile.commodityTypes ?? [],
    });
    const prefs = profile.preferences;
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
      await updateMyProfile(req);
      if (showPrefs) {
        await updateMyPreferences(buildPrefsRequest());
      }
      setEditing(false);
      setSubmitted(false);
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
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

  async function handleTrigger() {
    setMatchBusy(true);
    setMatchMsg("");
    try {
      const result: TriggerMatchResult = await triggerMyMatch();
      if (result.started) {
        setMatchMsg("Matching queued");
        await loadProfile();
      } else if (result.retryAfterSeconds) {
        const h = Math.floor(result.retryAfterSeconds / 3600);
        const m = Math.ceil((result.retryAfterSeconds % 3600) / 60);
        setMatchMsg(`Cooldown active — retry in ${h}h ${m}m`);
      } else {
        setMatchMsg(result.message);
      }
    } catch (err) {
      setMatchMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setMatchBusy(false);
    }
  }

  async function handleStatusChange(matchId: number, newStatus: "new" | "viewed" | "saved" | "dismissed") {
    try {
      await updateMyMatchStatus(matchId, { status: newStatus });
      await loadMatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "running":
      case "pending_rematch":
      case "pending_reset":
        return <span className="badge bg-warning text-dark">Matching...</span>;
      case "completed":
        return <span className="badge bg-success">Matched</span>;
      case "failed":
        return <span className="badge bg-danger">Failed</span>;
      default:
        return <span className="badge bg-light text-muted">Not matched</span>;
    }
  }

  function getTimeAgo(dateStr: string | null): string {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const isMatchActive =
    profile?.matchingStatus === "running" ||
    profile?.matchingStatus === "pending_rematch" ||
    profile?.matchingStatus === "pending_reset";

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  if (!profile) {
    if (!editing) {
      return (
        <div className="text-center py-5">
          <h3 className="mb-3">Set Up Your Company Profile</h3>
          <p className="text-muted mb-4">Create your company profile to start matching with government tenders.</p>
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            Create Profile
          </button>
        </div>
      );
    }

    // Show create form
    return (
      <div>
        <h2>Create Company Profile</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Company Name <span className="text-danger fw-bold">*</span></label>
              <input
                className={`form-control${submitted && !form.companyName.trim() ? " is-invalid" : ""}`}
                required value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
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
            <input className="form-control" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Information Technology" />
          </div>
          <div className="mb-3">
            <label className="form-label">Services Description</label>
            <textarea className="form-control" rows={3} value={form.servicesDescription} onChange={(e) => setForm({ ...form, servicesDescription: e.target.value })} placeholder="Describe the services your company provides..." />
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
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating..." : "Create Profile"}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>{profile.companyName || "My Company"}</h2>
        <div className="d-flex gap-2 align-items-center">
          {getStatusBadge(profile.matchingStatus)}
          <span className="text-muted small">
            Last matched: {getTimeAgo(profile.lastMatchedAt)}
          </span>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={handleTrigger}
            disabled={matchBusy || isMatchActive}
          >
            {matchBusy || isMatchActive ? "Matching..." : "Run Matching"}
          </button>
        </div>
      </div>

      {matchMsg && <div className="alert alert-info py-2">{matchMsg}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            Company Profile
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "matches" ? "active" : ""}`}
            onClick={() => setTab("matches")}
          >
            Matches
            {stats && stats.newCount > 0 && (
              <span className="badge bg-primary ms-2">{stats.newCount}</span>
            )}
          </button>
        </li>
      </ul>

      {/* Profile Tab */}
      {tab === "profile" && !editing && (
        <div>
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-primary btn-sm" onClick={startEdit}>
              Edit Profile
            </button>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-subtitle text-muted mb-2">Company Details</h6>
                  <p><strong>Name:</strong> {profile.companyName}</p>
                  <p><strong>Industry:</strong> {profile.industry || "—"}</p>
                  <p><strong>Province:</strong> {profile.province || "—"}</p>
                  <p><strong>Size:</strong> {profile.companySize || "—"}</p>
                  <p><strong>Commodity Types:</strong>{" "}
                    {profile.commodityTypes?.length
                      ? profile.commodityTypes.map((c) => CATEGORY_MAP[c] || c).join(", ")
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-subtitle text-muted mb-2">Services & Keywords</h6>
                  <p><strong>Description:</strong></p>
                  <p className="text-muted">{profile.servicesDescription || "—"}</p>
                  <p><strong>Keywords:</strong></p>
                  <div>
                    {profile.keywords?.length ? (
                      profile.keywords.map((k) => (
                        <span key={k} className="badge bg-primary bg-opacity-10 text-primary me-1 mb-1">{k}</span>
                      ))
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </div>
                  {profile.autoKeywords && profile.autoKeywords.length > 0 && (
                    <>
                      <p className="mt-2"><strong>Auto Keywords:</strong></p>
                      <div>
                        {profile.autoKeywords.map((k) => (
                          <span key={k} className="badge bg-info bg-opacity-10 text-info me-1 mb-1">{k}</span>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="mt-2"><strong>Certifications:</strong></p>
                  <div>
                    {profile.certifications?.length ? (
                      profile.certifications.map((c) => (
                        <span key={c} className="badge bg-secondary me-1 mb-1">{c}</span>
                      ))
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {profile.preferences && (
            <div className="card mt-3">
              <div className="card-body">
                <h6 className="card-subtitle text-muted mb-2">Matching Preferences</h6>
                <div className="row">
                  <div className="col-md-4">
                    <p><strong>Preferred Provinces:</strong>{" "}
                      {profile.preferences.preferredProvinces?.join(", ") || "Any"}
                    </p>
                  </div>
                  <div className="col-md-4">
                    <p><strong>Notice Types:</strong>{" "}
                      {profile.preferences.preferredNtTypes?.join(", ") || "Any"}
                    </p>
                  </div>
                  <div className="col-md-4">
                    <p><strong>Value Range:</strong>{" "}
                      {profile.preferences.minValue || profile.preferences.maxValue
                        ? `$${profile.preferences.minValue ?? "0"} – $${profile.preferences.maxValue ?? "∞"}`
                        : "Any"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Edit Form */}
      {tab === "profile" && editing && (
        <form onSubmit={handleSave}>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Company Name <span className="text-danger fw-bold">*</span></label>
              <input
                className={`form-control${submitted && !form.companyName.trim() ? " is-invalid" : ""}`}
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
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
            <input className="form-control" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Information Technology" />
          </div>

          <div className="mb-3">
            <label className="form-label">Services Description</label>
            <textarea className="form-control" rows={3} value={form.servicesDescription} onChange={(e) => setForm({ ...form, servicesDescription: e.target.value })} placeholder="Describe the services your company provides..." />
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
            <MultiSelectDropdown
              id="commodityTypes"
              options={COMMODITY_OPTIONS}
              value={form.commodityTypes}
              onChange={(sel) => setForm({ ...form, commodityTypes: sel })}
              placeholder="Select commodity types..."
              className={submitted && form.commodityTypes.length === 0 ? "is-invalid" : ""}
            />
            {submitted && form.commodityTypes.length === 0 && (
              <div className="text-danger small mt-1">Please select at least one commodity type.</div>
            )}
          </div>

          <div className="mb-3">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowPrefs(!showPrefs)}>
              {showPrefs ? "▼ Hide" : "▶ Show"} Matching Preferences
            </button>
          </div>

          {showPrefs && (
            <div className="card mb-3">
              <div className="card-body">
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
              </div>
            </div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Matches Tab */}
      {tab === "matches" && (
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
                  <div className={`card text-center border-${bg}`}>
                    <div className="card-body py-2">
                      <div className="fw-bold fs-5">{value}</div>
                      <small className="text-muted">{label}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="btn-group mb-3">
            {[
              { label: "All", value: "" },
              { label: "New", value: "new" },
              { label: "Viewed", value: "viewed" },
              { label: "Saved", value: "saved" },
              { label: "Dismissed", value: "dismissed" },
            ].map(({ label, value }) => (
              <button
                key={value}
                className={`btn btn-sm ${statusFilter === value ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {matchesLoading ? (
            <div className="text-center py-3"><div className="spinner-border spinner-border-sm" /></div>
          ) : matches.length === 0 ? (
            <p className="text-muted">No matches found. Try running matching first.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Score</th>
                    <th>Tender</th>
                    <th>Organization</th>
                    <th>Category</th>
                    <th>Closing</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className={`badge ${m.matchScore >= 70 ? "bg-success" : m.matchScore >= 55 ? "bg-warning text-dark" : "bg-secondary"}`}>
                          {m.matchScore}
                        </span>
                      </td>
                      <td>
                        <a href={`/tenders/${m.tenderId}`}>{m.tenderTitle ?? m.noticeId}</a>
                        {m.matchReason && <div className="text-muted small">{m.matchReason}</div>}
                      </td>
                      <td className="small">{m.buyingOrganization ?? "—"}</td>
                      <td>{m.procurementCategory ?? "—"}</td>
                      <td className="small">
                        {m.closingDate ? new Date(m.closingDate).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        <span className={`badge ${
                          m.status === "new" ? "bg-primary" :
                          m.status === "saved" ? "bg-success" :
                          m.status === "viewed" ? "bg-info" : "bg-secondary"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td>
                        <div className="dropdown">
                          <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                            Set
                          </button>
                          <ul className="dropdown-menu">
                            {(["new", "viewed", "saved", "dismissed"] as const).map((s) => (
                              <li key={s}>
                                <button className="dropdown-item" onClick={() => handleStatusChange(m.id, s)}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                              </li>
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
