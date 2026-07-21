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
import MatchesTable from "../components/MatchesTable";
import Pagination from "../components/Pagination";
import TagInput from "../components/TagInput";
import MultiSelectDropdown from "../components/MultiSelectDropdown";
import type { DropdownOption } from "../components/MultiSelectDropdown";
import IndustryPicker from "../components/IndustryPicker";
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

function descFingerprint(s: string) {
  return s.trim().replace(/\s+/g, ' ').replace(/[.,;!?]+$/, '');
}

function FieldTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{ cursor: "help", color: "#6c757d", fontSize: "1em", marginLeft: 4 }}
      >ⓘ</span>
      {visible && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          background: "#212529", color: "#fff", padding: "6px 10px", borderRadius: 4,
          fontSize: "0.78em", whiteSpace: "normal", width: 230, zIndex: 9999,
          marginBottom: 4, lineHeight: 1.4, pointerEvents: "none", textAlign: "left",
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

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
    industryCodes: [] as string[],
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
  const [matchPage, setMatchPage] = useState(1);
  const [matchTotalPages, setMatchTotalPages] = useState(1);
  const [matchTotalCount, setMatchTotalCount] = useState(0);
  const [stats, setStats] = useState<MatchStatsDto | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Matching trigger
  const [matchBusy, setMatchBusy] = useState(false);
  const [matchMsg, setMatchMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const [data, s] = await Promise.all([getMyProfile(), getMyMatchStats().catch(() => null)]);
      setProfile(data);
      if (s) setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!form.companyName.trim() || !form.province || !form.companySize || (form.servicesDescription?.length ?? 0) < 150 || form.industryCodes.length === 0 || form.commodityTypes.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const req: CreateCompanyProfileRequest = {
        companyName: form.companyName,
        industryCodes: form.industryCodes,
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

  // Load matches when switching to matches tab, changing filter, or changing page
  useEffect(() => {
    if (tab === "matches" && profile) {
      loadMatches(matchPage);
    }
  }, [tab, statusFilter, matchPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setMatchPage(1);
  }, [statusFilter]);

  async function loadMatches(page = 1) {
    setMatchesLoading(true);
    try {
      const [result, s] = await Promise.all([
        getMyMatches(statusFilter || undefined, page),
        getMyMatchStats(),
      ]);
      setMatches(result.items);
      setMatchPage(result.page);
      setMatchTotalPages(result.totalPages);
      setMatchTotalCount(result.totalCount);
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
      industryCodes: profile.industryCodes ?? [],
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
    if (!form.companyName.trim() || !form.province || !form.companySize || (form.servicesDescription?.length ?? 0) < 150 || form.industryCodes.length === 0 || form.commodityTypes.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const req: UpdateCompanyProfileRequest = {
        companyName: form.companyName || undefined,
        industryCodes: form.industryCodes,
        province: form.province || undefined,
        servicesDescription: descFingerprint(form.servicesDescription) !== descFingerprint(profile?.servicesDescription ?? "")
          ? form.servicesDescription
          : undefined,
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
        setProfile((prev) => prev ? { ...prev, matchingStatus: "pending_rematch" } : prev);
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
        return <span className="pp-badge pp-badge-amber">⟳ Matching...</span>;
      case "completed":
        return <span className="pp-badge pp-badge-green">✓ Matched</span>;
      case "failed":
        return <span className="pp-badge pp-badge-red">✕ Failed</span>;
      default:
        return <span className="pp-badge pp-badge-gray">Not matched</span>;
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
      <div className="pp-loader">
        <div className="pp-spinner" />
      </div>
    );
  }

  if (!profile) {
    if (!editing) {
      return (
        <div className="pp-empty-state" style={{ paddingTop: "5rem" }}>
          <div className="empty-icon">◈</div>
          <h3>Set Up Your Company Profile</h3>
          <p>Create your company profile to start matching with government tenders.</p>
          <button className="pp-btn pp-btn-primary mt-3" onClick={() => setEditing(true)}>
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
              <label className="form-label">Company Name <span className="text-danger fw-bold">*</span><FieldTooltip text="Your legal or trading name. Used for internal reference only." /></label>
              <input
                className={`form-control${submitted && !form.companyName.trim() ? " is-invalid" : ""}`}
                required value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Province <span className="text-danger fw-bold">*</span><FieldTooltip text="Your company's primary operating province." /></label>
              <select className={`form-select${submitted && !form.province ? " is-invalid" : ""}`} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                <option value="">Select...</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {submitted && !form.province && <div className="text-danger small mt-1">Please select a province.</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label">Company Size <span className="text-danger fw-bold">*</span><FieldTooltip text="Your headcount range. Informational context for the AI scorer." /></label>
              <select className={`form-select${submitted && !form.companySize ? " is-invalid" : ""}`} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>
                <option value="">Select...</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {submitted && !form.companySize && <div className="text-danger small mt-1">Please select a company size.</div>}
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Industries <span className="text-danger fw-bold">*</span><FieldTooltip text="NAICS classifications for your business. The AI uses these to assess whether a tender is in your domain." /></label>
            <IndustryPicker
              value={form.industryCodes}
              onChange={(codes) => setForm({ ...form, industryCodes: codes })}
              error={submitted && form.industryCodes.length === 0}
              id="create-industries"
            />
            {submitted && form.industryCodes.length === 0 && (
              <div className="text-danger small mt-1">Please select at least one industry.</div>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">Services Description <span className="text-danger fw-bold">*</span><FieldTooltip text="Describe what your company does in specific terms. Domain keywords are extracted from this text. The more precise, the better your matches." /></label>
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
                ? <div className="text-danger small">At least 150 characters required — be specific about technologies, platforms, and sectors you serve.</div>
                : <div className="text-muted small">Be specific: name technologies, platforms, certifications, and sectors. Vague descriptions produce fewer keyword matches.</div>}
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
              <label className="form-label">Keywords<FieldTooltip text="Specific technologies, products, or platforms your company works with. Each keyword is matched word-for-word against every tender before AI scoring. Strong signal for relevance." /></label>
              <TagInput value={form.keywords} onChange={(tags) => setForm({ ...form, keywords: tags })} placeholder="Type keyword and press Enter" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Certifications<FieldTooltip text="Professional or trade certifications your company holds. The AI references these when assessing whether a tender requires credentials you have." /></label>
              <TagInput value={form.certifications} onChange={(tags) => setForm({ ...form, certifications: tags })} placeholder="Type certification and press Enter" />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Commodity Types <span className="text-danger fw-bold">*</span><FieldTooltip text="Whether your company sells goods, services, or both. Tenders whose category clearly conflicts with your selection are rejected before AI scoring." /></label>
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
              <div className="alert alert-warning py-2 small mb-3 mt-4">
                ⚠ <strong>These are hard filters.</strong> Tenders that don't match every active filter are rejected before the AI ever sees them. They will never appear in your results. Leave a filter empty to place no restriction on that field.
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Preferred Organizations<FieldTooltip text="Hard filter. Only tenders issued by these buying organizations will be scored. Leave empty to receive tenders from all organizations." /></label>
                  <TagInput value={prefsForm.preferredOrgs} onChange={(tags) => setPrefsForm({ ...prefsForm, preferredOrgs: tags })} placeholder="Type organization and press Enter" />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Preferred Notice Types<FieldTooltip text="Hard filter. Only tenders of these types will be scored. Leave empty to receive all notice types." /></label>
                  <MultiSelectDropdown id="prefNtTypes" options={NOTICE_TYPE_OPTIONS} value={prefsForm.preferredNtTypes} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredNtTypes: sel })} placeholder="Select notice types..." />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Preferred Provinces (Delivery)<FieldTooltip text="Hard filter on delivery region. Only applies when a tender specifies where work must be delivered. Tenders with no delivery region are always included." /></label>
                  <MultiSelectDropdown id="prefProvinces" options={PROVINCE_OPTIONS} value={prefsForm.preferredProvinces} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredProvinces: sel })} placeholder="Select provinces..." />
                  <div className="text-muted small mt-1">Tenders with no specified delivery region are never filtered out by this setting.</div>
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Exclude Keywords<FieldTooltip text="Hard filter. Any tender containing these words anywhere in its title or description is rejected before scoring." /></label>
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
    <div className="pp-animate-in">
      <div className="pp-page-header">
        <div>
          <h2>{profile.companyName || "My Company"}</h2>
          <span style={{ fontSize: ".85rem", color: "var(--pp-text-muted)" }}>
            Last matched: {getTimeAgo(profile.lastMatchedAt)}
          </span>
        </div>
        <div className="header-actions">
          {getStatusBadge(profile.matchingStatus)}
          <button
            className="pp-btn pp-btn-primary pp-btn-sm"
            onClick={handleTrigger}
            disabled={matchBusy || isMatchActive}
          >
            {matchBusy || isMatchActive ? "⟳ Matching..." : "🎯 Run Matching"}
          </button>
        </div>
      </div>

      {matchMsg && <div className="alert alert-info py-2">{matchMsg}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* Tabs */}
      <div className="pp-tabs">
        <button
          className={`pp-tab ${tab === "profile" ? "active" : ""}`}
          onClick={() => setTab("profile")}
        >
          Company Profile
        </button>
        <button
          className={`pp-tab ${tab === "matches" ? "active" : ""}`}
          onClick={() => setTab("matches")}
        >
          Matches
          {stats && stats.newCount > 0 && (
            <span className="tab-count">{stats.newCount}</span>
          )}
        </button>
      </div>

      {/* Profile Tab */}
      {tab === "profile" && !editing && (
        <div>
          <div className="d-flex justify-content-end mb-3">
            <button className="pp-btn pp-btn-primary pp-btn-sm" onClick={startEdit}>
              ✎ Edit Profile
            </button>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="pp-card">
                <div className="pp-card-body">
                  <h6 style={{ color: "var(--pp-text-muted)", fontSize: ".8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: ".75rem" }}>Company Details</h6>
                  <p><strong>Name:</strong> {profile.companyName}</p>
                  <p><strong>Industries:</strong></p>
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {profile.industries?.length
                      ? profile.industries.map((i) => (
                          <span key={i.code} className="pp-badge pp-badge-blue">{i.titleEn}</span>
                        ))
                      : <span style={{ color: "var(--pp-text-muted)" }}>—</span>}
                  </div>
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
              <div className="pp-card">
                <div className="pp-card-body">
                  <h6 style={{ color: "var(--pp-text-muted)", fontSize: ".8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: ".75rem" }}>Services & Keywords</h6>
                  <p><strong>Description:</strong></p>
                  <p style={{ color: "var(--pp-text-secondary)" }}>{profile.servicesDescription || "—"}</p>
                  <p><strong>Keywords:</strong></p>
                  <div>
                    {profile.keywords?.length ? (
                      profile.keywords.map((k) => (
                        <span key={k} className="pp-badge pp-badge-blue me-1 mb-1">{k}</span>
                      ))
                    ) : (
                      <span style={{ color: "var(--pp-text-muted)" }}>None</span>
                    )}
                  </div>
                  {profile.autoKeywords && profile.autoKeywords.length > 0 && (
                    <>
                      <p className="mt-2"><strong>Auto Keywords:</strong></p>
                      <div>
                        {profile.autoKeywords.map((k) => (
                          <span key={k} className="pp-badge pp-badge-teal me-1 mb-1">{k}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {!profile.lastMatchedAt && (
                    <div className="alert alert-info mt-3 mb-0 py-2 small">
                      <strong>No match has run yet.</strong> Keywords will be extracted from your description when you run your first match — the more specific it is, the better your results.
                    </div>
                  )}
                  {profile.autoKeywords !== null && profile.autoKeywords !== undefined && profile.autoKeywords.length < 5 && (
                    <div className="alert alert-warning mt-3 mb-0 py-2 small">
                      <strong>Weak keyword extraction</strong> — only {profile.autoKeywords.length} domain-specific term{profile.autoKeywords.length === 1 ? "" : "s"} were found in your description.
                      Enrich it with specific technologies, platforms, certifications, and sectors to improve match quality before running a match.
                    </div>
                  )}
                  <p className="mt-2"><strong>Certifications:</strong></p>
                  <div>
                    {profile.certifications?.length ? (
                      profile.certifications.map((c) => (
                        <span key={c} className="pp-badge pp-badge-gray me-1 mb-1">{c}</span>
                      ))
                    ) : (
                      <span style={{ color: "var(--pp-text-muted)" }}>None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {profile.preferences && (
            <div className="pp-card mt-3">
              <div className="pp-card-body">
                <h6 style={{ color: "var(--pp-text-muted)", fontSize: ".8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: ".75rem" }}>Matching Preferences</h6>
                <div className="row">
                  <div className="col-md-4">
                    <p><strong>Preferred Provinces (Delivery):</strong>{" "}
                      {profile.preferences.preferredProvinces?.join(", ") || "Any"}
                    </p>
                  </div>
                  <div className="col-md-4">
                    <p><strong>Notice Types:</strong>{" "}
                      {profile.preferences.preferredNtTypes?.join(", ") || "Any"}
                    </p>
                  </div>
                  <div className="col-md-4">
                    <p><strong>Preferred Organizations:</strong>{" "}
                      {profile.preferences.preferredOrgs?.join(", ") || "Any"}
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
              <label className="form-label">Company Name <span className="text-danger fw-bold">*</span><FieldTooltip text="Your legal or trading name. Used for internal reference only." /></label>
              <input
                className={`form-control${submitted && !form.companyName.trim() ? " is-invalid" : ""}`}
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Province <span className="text-danger fw-bold">*</span><FieldTooltip text="Your company's primary operating province." /></label>
              <select className={`form-select${submitted && !form.province ? " is-invalid" : ""}`} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                <option value="">Select...</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {submitted && !form.province && <div className="text-danger small mt-1">Please select a province.</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label">Company Size <span className="text-danger fw-bold">*</span><FieldTooltip text="Your headcount range. Informational context for the AI scorer." /></label>
              <select className={`form-select${submitted && !form.companySize ? " is-invalid" : ""}`} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>
                <option value="">Select...</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {submitted && !form.companySize && <div className="text-danger small mt-1">Please select a company size.</div>}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Industries <span className="text-danger fw-bold">*</span><FieldTooltip text="NAICS classifications for your business. The AI uses these to assess whether a tender is in your domain." /></label>
            <IndustryPicker
              value={form.industryCodes}
              onChange={(codes) => setForm({ ...form, industryCodes: codes })}
              initialLabels={Object.fromEntries((profile?.industries ?? []).map((i) => [i.code, i.titleEn]))}
              error={submitted && form.industryCodes.length === 0}
              id="edit-industries"
            />
            {submitted && form.industryCodes.length === 0 && (
              <div className="text-danger small mt-1">Please select at least one industry.</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">Services Description <span className="text-danger fw-bold">*</span><FieldTooltip text="Describe what your company does in specific terms. Domain keywords are extracted from this text. The more precise, the better your matches." /></label>
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
                ? <div className="text-danger small">At least 150 characters required — be specific about technologies, platforms, and sectors you serve.</div>
                : <div className="text-muted small">Be specific: name technologies, platforms, certifications, and sectors. Vague descriptions produce fewer keyword matches.</div>}
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
              <label className="form-label">Keywords<FieldTooltip text="Specific technologies, products, or platforms your company works with. Each keyword is matched word-for-word against every tender before AI scoring. Strong signal for relevance." /></label>
              <TagInput value={form.keywords} onChange={(tags) => setForm({ ...form, keywords: tags })} placeholder="Type keyword and press Enter" />
            </div>
            <div className="col-md-6">
              <label className="form-label">Certifications<FieldTooltip text="Professional or trade certifications your company holds. The AI references these when assessing whether a tender requires credentials you have." /></label>
              <TagInput value={form.certifications} onChange={(tags) => setForm({ ...form, certifications: tags })} placeholder="Type certification and press Enter" />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Commodity Types <span className="text-danger fw-bold">*</span><FieldTooltip text="Whether your company sells goods, services, or both. Tenders whose category clearly conflicts with your selection are rejected before AI scoring." /></label>
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
            <button type="button" className="pp-btn pp-btn-ghost pp-btn-sm" onClick={() => setShowPrefs(!showPrefs)}>
              {showPrefs ? "▼ Hide" : "▶ Show"} Matching Preferences
            </button>
          </div>

          {showPrefs && (
            <div className="pp-card mb-3">
              <div className="pp-card-body">
                <h5 className="card-title">Matching Preferences</h5>
                <div className="alert alert-warning py-2 small mb-3 mt-4">
                  ⚠ <strong>These are hard filters.</strong> Tenders that don't match every active filter are rejected before the AI ever sees them. They will never appear in your results. Leave a filter empty to place no restriction on that field.
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Preferred Organizations<FieldTooltip text="Hard filter. Only tenders issued by these buying organizations will be scored. Leave empty to receive tenders from all organizations." /></label>
                    <TagInput value={prefsForm.preferredOrgs} onChange={(tags) => setPrefsForm({ ...prefsForm, preferredOrgs: tags })} placeholder="Type organization and press Enter" />
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Preferred Notice Types<FieldTooltip text="Hard filter. Only tenders of these types will be scored. Leave empty to receive all notice types." /></label>
                    <MultiSelectDropdown id="prefNtTypes" options={NOTICE_TYPE_OPTIONS} value={prefsForm.preferredNtTypes} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredNtTypes: sel })} placeholder="Select notice types..." />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Preferred Provinces (Delivery)<FieldTooltip text="Hard filter on delivery region. Only applies when a tender specifies where work must be delivered. Tenders with no delivery region are always included." /></label>
                    <MultiSelectDropdown id="prefProvinces" options={PROVINCE_OPTIONS} value={prefsForm.preferredProvinces} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredProvinces: sel })} placeholder="Select provinces..." />
                    <div className="text-muted small mt-1">Tenders with no specified delivery region are never filtered out by this setting.</div>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Exclude Keywords<FieldTooltip text="Hard filter. Any tender containing these words anywhere in its title or description is rejected before scoring." /></label>
                    <TagInput value={prefsForm.excludeKeywords} onChange={(tags) => setPrefsForm({ ...prefsForm, excludeKeywords: tags })} placeholder="Type keyword and press Enter" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="pp-btn pp-btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button type="button" className="pp-btn pp-btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Matches Tab */}
      {tab === "matches" && (
        <div>
          {stats && (
            <div className="row g-3 mb-4">
              {[
                { label: "Total", value: stats.totalMatches, icon: "📊", color: "blue" },
                { label: "New", value: stats.newCount, icon: "✨", color: "green" },
                { label: "Saved", value: stats.savedCount, icon: "⭐", color: "amber" },
                { label: "Viewed", value: stats.viewedCount, icon: "👁", color: "teal" },
                { label: "Avg Score", value: stats.averageScore, icon: "📈", color: "blue" },
                { label: "High Score", value: stats.highScoreCount, icon: "🎯", color: "green" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="col-md-2 pp-animate-in">
                  <div className="pp-stat-card" style={{ flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                    <div className={`pp-stat-icon ${color}`} style={{ width: 40, height: 40, fontSize: "1.1rem" }}>{icon}</div>
                    <div className="pp-stat-value" style={{ fontSize: "1.4rem" }}>{value}</div>
                    <div className="pp-stat-label">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="d-flex gap-1 mb-3">
            {[
              { label: "All", value: "" },
              { label: "New", value: "new" },
              { label: "Viewed", value: "viewed" },
              { label: "Saved", value: "saved" },
              { label: "Dismissed", value: "dismissed" },
            ].map(({ label, value }) => (
              <button
                key={value}
                className={`pp-btn pp-btn-sm ${statusFilter === value ? "pp-btn-primary" : "pp-btn-ghost"}`}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {matchesLoading ? (
            <div className="pp-loader"><div className="pp-spinner" /></div>
          ) : matches.length === 0 ? (
            <p className="text-muted">No matches found. Try running matching first.</p>
          ) : (
            <>
              <MatchesTable matches={matches} onStatusChange={handleStatusChange} />
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
