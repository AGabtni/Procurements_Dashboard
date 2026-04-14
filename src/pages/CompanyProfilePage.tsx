import { useEffect, useState, useCallback, useRef } from "react";
import {
  getAllProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  updatePreferences,
  triggerMatch,
} from "../api/companyApi";
import type {
  CompanyProfileDto,
  CreateCompanyProfileRequest,
  UpdateCompanyProfileRequest,
  CompanyPreferencesRequest,
} from "../types/company";
import { useNavigate } from "react-router-dom";
import { CATEGORY_MAP } from "../utils/categoryMap";
import TagInput from "../components/TagInput";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import type { DropdownOption } from "../components/MultiSelectDropdown";

const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

const COMMODITY_OPTIONS: DropdownOption[] = Object.entries(CATEGORY_MAP).map(
  ([code, label]) => ({ value: code, label })
);

const PROVINCE_OPTIONS: DropdownOption[] = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
].map((p) => ({ value: p, label: p }));

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

export default function CompanyProfilePage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<CompanyProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CompanyProfileDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [matchingIds, setMatchingIds] = useState<Set<number>>(new Set());
  const [matchMsg, setMatchMsg] = useState<Record<number, string>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
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

  // Preferences form state
  const [prefsForm, setPrefsForm] = useState({
    preferredOrgs: [] as string[],
    preferredNtTypes: [] as string[],
    preferredProvinces: [] as string[],
    minValue: "",
    maxValue: "",
    excludeKeywords: [] as string[],
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  // Auto-poll while any profile is pending/running
  useEffect(() => {
    const hasActive = profiles.some(
      (p) =>
        p.matchingStatus === "running" ||
        p.matchingStatus === "pending_rematch" ||
        p.matchingStatus === "pending_reset"
    );
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        try {
          const data = await getAllProfiles();
          setProfiles(data);
        } catch {
          /* ignore poll errors */
        }
      }, 5000);
    } else if (!hasActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [profiles]);

  async function loadProfiles() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllProfiles();
      setProfiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerMatch(companyId: number) {
    setMatchingIds((prev) => new Set(prev).add(companyId));
    setMatchMsg((prev) => ({ ...prev, [companyId]: "" }));
    try {
      const result = await triggerMatch(companyId);
      if (result.started) {
        setMatchMsg((prev) => ({ ...prev, [companyId]: "Matching queued" }));
        await loadProfiles();
      } else if (result.retryAfterSeconds) {
        const h = Math.floor(result.retryAfterSeconds / 3600);
        const m = Math.ceil((result.retryAfterSeconds % 3600) / 60);
        setMatchMsg((prev) => ({
          ...prev,
          [companyId]: `Cooldown active — retry in ${h}h ${m}m`,
        }));
      } else {
        setMatchMsg((prev) => ({ ...prev, [companyId]: result.message }));
      }
    } catch (err) {
      setMatchMsg((prev) => ({
        ...prev,
        [companyId]: err instanceof Error ? err.message : "Failed",
      }));
    } finally {
      setMatchingIds((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });
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
    if (!dateStr) return "Never matched";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function isMatchBusy(p: CompanyProfileDto): boolean {
    return (
      matchingIds.has(p.id) ||
      p.matchingStatus === "running" ||
      p.matchingStatus === "pending_rematch" ||
      p.matchingStatus === "pending_reset"
    );
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setShowPrefs(false);
    setForm({
      companyName: "",
      industry: "",
      province: "",
      servicesDescription: "",
      keywords: [],
      certifications: [],
      companySize: "",
      commodityTypes: [],
    });
    setPrefsForm({
      preferredOrgs: [],
      preferredNtTypes: [],
      preferredProvinces: [],
      minValue: "",
      maxValue: "",
      excludeKeywords: "",
    });
  }

  function startEdit(profile: CompanyProfileDto) {
    setEditing(profile);
    setCreating(false);
    setShowPrefs(false);
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
  }

  function cancelEdit() {
    setEditing(null);
    setCreating(false);
  }

  function splitCsv(val: string): string[] | undefined {
    const items = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!form.companyName.trim() || form.commodityTypes.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      if (creating) {
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
        await createProfile(req);
      } else if (editing) {
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
        await updateProfile(editing.id, req);
        if (showPrefs) {
          await updatePreferences(editing.id, buildPrefsRequest());
        }
      }
      setEditing(null);
      setCreating(false);
      setSubmitted(false);
      await loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
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

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this company profile?")) return;
    setError(null);
    try {
      await deleteProfile(id);
      await loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete profile");
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  // ── Form View ──
  if (creating || editing) {
    return (
      <div>
        <h2>{creating ? "New Company Profile" : "Edit Profile"}</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">
                Company Name <span className="text-danger fw-bold">*</span>
              </label>
              <input
                className={`form-control${submitted && !form.companyName.trim() ? " is-invalid" : ""}`}
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
              {submitted && !form.companyName.trim() && (
                <div className="invalid-feedback">Company name is required.</div>
              )}
            </div>
            <div className="col-md-3">
              <label className="form-label">Province</label>
              <select
                className="form-select"
                value={form.province}
                onChange={(e) => setForm({ ...form, province: e.target.value })}
              >
                <option value="">Select...</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Company Size</label>
              <select
                className="form-select"
                value={form.companySize}
                onChange={(e) => setForm({ ...form, companySize: e.target.value })}
              >
                <option value="">Select...</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Industry</label>
            <input
              className="form-control"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="e.g. Information Technology"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Services Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.servicesDescription}
              onChange={(e) =>
                setForm({ ...form, servicesDescription: e.target.value })
              }
              placeholder="Describe the services your company provides..."
            />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Keywords</label>
              <TagInput
                value={form.keywords}
                onChange={(tags) => setForm({ ...form, keywords: tags })}
                placeholder="Type keyword and press Enter"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Certifications</label>
              <TagInput
                value={form.certifications}
                onChange={(tags) => setForm({ ...form, certifications: tags })}
                placeholder="Type certification and press Enter"
              />
            </div>
          </div>

          {/* Commodity Types (required) */}
          <div className="mb-3">
            <label className="form-label">
              Commodity Types <span className="text-danger fw-bold">*</span>
            </label>
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

          {/* Preferences toggle */}
          <div className="mb-3">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setShowPrefs(!showPrefs)}
            >
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
                    <TagInput
                      value={prefsForm.preferredOrgs}
                      onChange={(tags) => setPrefsForm({ ...prefsForm, preferredOrgs: tags })}
                      placeholder="Type organization and press Enter"
                    />
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Preferred Notice Types</label>
                    <MultiSelectDropdown
                      id="prefNtTypes"
                      options={NOTICE_TYPE_OPTIONS}
                      value={prefsForm.preferredNtTypes}
                      onChange={(sel) => setPrefsForm({ ...prefsForm, preferredNtTypes: sel })}
                      placeholder="Select notice types..."
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Preferred Provinces</label>
                    <MultiSelectDropdown
                      id="prefProvinces"
                      options={PROVINCE_OPTIONS}
                      value={prefsForm.preferredProvinces}
                      onChange={(sel) => setPrefsForm({ ...prefsForm, preferredProvinces: sel })}
                      placeholder="Select provinces..."
                    />
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Min Value ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={prefsForm.minValue}
                      onChange={(e) =>
                        setPrefsForm({ ...prefsForm, minValue: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Max Value ($)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={prefsForm.maxValue}
                      onChange={(e) =>
                        setPrefsForm({ ...prefsForm, maxValue: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Exclude Keywords</label>
                    <TagInput
                      value={prefsForm.excludeKeywords}
                      onChange={(tags) => setPrefsForm({ ...prefsForm, excludeKeywords: tags })}
                      placeholder="Type keyword and press Enter"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── List View ──
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Company Profiles</h2>
        <button className="btn btn-primary" onClick={startCreate}>
          + New Profile
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {profiles.length === 0 ? (
        <div className="text-center text-muted py-5">
          <p className="fs-5">No company profiles yet.</p>
          <p>Create a profile to start matching with tenders.</p>
        </div>
      ) : (
        <div className="row g-3">
          {profiles.map((p) => (
            <div key={p.id} className="col-md-6 col-lg-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{p.companyName}</h5>
                  {p.industry && (
                    <p className="card-text text-muted mb-1">{p.industry}</p>
                  )}
                  {p.province && (
                    <span className="badge bg-info me-1">{p.province}</span>
                  )}
                  {p.companySize && (
                    <span className="badge bg-secondary">{p.companySize}</span>
                  )}
                  {p.keywords && p.keywords.length > 0 && (
                    <div className="mt-2">
                      {p.keywords.slice(0, 5).map((k) => (
                        <span
                          key={k}
                          className="badge bg-primary bg-opacity-10 text-primary me-1 mb-1"
                        >
                          {k}
                        </span>
                      ))}
                      {p.keywords.length > 5 && (
                        <span className="text-muted small">
                          +{p.keywords.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Matching status */}
                  <div className="mt-2 d-flex align-items-center gap-2">
                    {getStatusBadge(p.matchingStatus)}
                    <small className="text-muted">
                      {getTimeAgo(p.lastMatchedAt)}
                    </small>
                  </div>
                  {matchMsg[p.id] && (
                    <small className="text-info d-block mt-1">
                      {matchMsg[p.id]}
                    </small>
                  )}
                </div>
                <div className="card-footer d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-success"
                    disabled={isMatchBusy(p)}
                    onClick={() => handleTriggerMatch(p.id)}
                  >
                    {isMatchBusy(p) ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" />
                        Matching...
                      </>
                    ) : p.lastMatchedAt ? (
                      "Re-run Matching"
                    ) : (
                      "Run Matching"
                    )}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => navigate(`/matches/${p.id}`)}
                  >
                    View Matches
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => startEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger ms-auto"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
