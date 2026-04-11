import { useEffect, useState } from "react";
import {
  getAllProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  updatePreferences,
} from "../api/companyApi";
import type {
  CompanyProfileDto,
  CreateCompanyProfileRequest,
  UpdateCompanyProfileRequest,
  CompanyPreferencesRequest,
} from "../types/company";
import { useNavigate } from "react-router-dom";

const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

export default function CompanyProfilePage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<CompanyProfileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CompanyProfileDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  // Form state
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    province: "",
    servicesDescription: "",
    keywords: "",
    certifications: "",
    companySize: "",
  });

  // Preferences form state
  const [prefsForm, setPrefsForm] = useState({
    preferredProcCats: "",
    preferredOrgs: "",
    preferredNtTypes: "",
    preferredProvinces: "",
    minValue: "",
    maxValue: "",
    excludeKeywords: "",
  });

  useEffect(() => {
    loadProfiles();
  }, []);

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

  function startCreate() {
    setCreating(true);
    setEditing(null);
    setShowPrefs(false);
    setForm({
      companyName: "",
      industry: "",
      province: "",
      servicesDescription: "",
      keywords: "",
      certifications: "",
      companySize: "",
    });
    setPrefsForm({
      preferredProcCats: "",
      preferredOrgs: "",
      preferredNtTypes: "",
      preferredProvinces: "",
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
      keywords: profile.keywords?.join(", ") ?? "",
      certifications: profile.certifications?.join(", ") ?? "",
      companySize: profile.companySize ?? "",
    });
    const prefs = profile.preferences;
    setPrefsForm({
      preferredProcCats: prefs?.preferredProcCats?.join(", ") ?? "",
      preferredOrgs: prefs?.preferredOrgs?.join(", ") ?? "",
      preferredNtTypes: prefs?.preferredNtTypes?.join(", ") ?? "",
      preferredProvinces: prefs?.preferredProvinces?.join(", ") ?? "",
      minValue: prefs?.minValue?.toString() ?? "",
      maxValue: prefs?.maxValue?.toString() ?? "",
      excludeKeywords: prefs?.excludeKeywords?.join(", ") ?? "",
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
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        const req: CreateCompanyProfileRequest = {
          companyName: form.companyName,
          industry: form.industry || undefined,
          province: form.province || undefined,
          servicesDescription: form.servicesDescription || undefined,
          keywords: splitCsv(form.keywords),
          certifications: splitCsv(form.certifications),
          companySize: form.companySize || undefined,
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
          keywords: splitCsv(form.keywords),
          certifications: splitCsv(form.certifications),
          companySize: form.companySize || undefined,
        };
        await updateProfile(editing.id, req);
        if (showPrefs) {
          await updatePreferences(editing.id, buildPrefsRequest());
        }
      }
      setEditing(null);
      setCreating(false);
      await loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function buildPrefsRequest(): CompanyPreferencesRequest {
    return {
      preferredProcCats: splitCsv(prefsForm.preferredProcCats),
      preferredOrgs: splitCsv(prefsForm.preferredOrgs),
      preferredNtTypes: splitCsv(prefsForm.preferredNtTypes),
      preferredProvinces: splitCsv(prefsForm.preferredProvinces),
      minValue: prefsForm.minValue ? Number(prefsForm.minValue) : undefined,
      maxValue: prefsForm.maxValue ? Number(prefsForm.maxValue) : undefined,
      excludeKeywords: splitCsv(prefsForm.excludeKeywords),
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
              <label className="form-label">Company Name *</label>
              <input
                className="form-control"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
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
              <input
                className="form-control"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="Comma-separated: cloud, security, consulting"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Certifications</label>
              <input
                className="form-control"
                value={form.certifications}
                onChange={(e) =>
                  setForm({ ...form, certifications: e.target.value })
                }
                placeholder="Comma-separated: ISO 9001, SOC 2"
              />
            </div>
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
                    <label className="form-label">Preferred Categories</label>
                    <input
                      className="form-control"
                      value={prefsForm.preferredProcCats}
                      onChange={(e) =>
                        setPrefsForm({
                          ...prefsForm,
                          preferredProcCats: e.target.value,
                        })
                      }
                      placeholder="Comma-separated"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Preferred Organizations</label>
                    <input
                      className="form-control"
                      value={prefsForm.preferredOrgs}
                      onChange={(e) =>
                        setPrefsForm({
                          ...prefsForm,
                          preferredOrgs: e.target.value,
                        })
                      }
                      placeholder="Comma-separated"
                    />
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Preferred Notice Types</label>
                    <input
                      className="form-control"
                      value={prefsForm.preferredNtTypes}
                      onChange={(e) =>
                        setPrefsForm({
                          ...prefsForm,
                          preferredNtTypes: e.target.value,
                        })
                      }
                      placeholder="Comma-separated"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Preferred Provinces</label>
                    <input
                      className="form-control"
                      value={prefsForm.preferredProvinces}
                      onChange={(e) =>
                        setPrefsForm({
                          ...prefsForm,
                          preferredProvinces: e.target.value,
                        })
                      }
                      placeholder="Comma-separated: ON, BC, AB"
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
                    <input
                      className="form-control"
                      value={prefsForm.excludeKeywords}
                      onChange={(e) =>
                        setPrefsForm({
                          ...prefsForm,
                          excludeKeywords: e.target.value,
                        })
                      }
                      placeholder="Comma-separated"
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
                </div>
                <div className="card-footer d-flex gap-2">
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
