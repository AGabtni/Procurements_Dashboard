import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Trans, useTranslation } from "react-i18next";
import i18n from "../i18n";
import {
  getMyProfile,
  createMyProfile,
  updateMyProfile,
  updateMyPreferences,
  getMyMatches,
  getMyMatchStats,
  getMyMatchFilters,
  updateMyMatchStatus,
  triggerMyMatch,
} from "../api/companyApi";
import type { MatchSearchParams } from "../api/companyApi";
import MatchesSearchBar from "../components/MatchesSearchBar";
import { resolveError } from "../utils/resolveError";
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
import LockedMatches from "../components/LockedMatches";
import { useAuth } from "../context/AuthContext";
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
        style={{ cursor: "help", color: "#0d6efd", fontSize: "1em", marginLeft: 4 }}
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
  const { user } = useAuth();
  const { t } = useTranslation("myCompany");
  const locked = user?.subscriptionStatus === "expired";
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<CompanyProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile editing
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [confirmSave, setConfirmSave] = useState<"create" | "save" | null>(null);
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
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchSearch, setMatchSearch] = useState<MatchSearchParams>({});
  const [matchOrgs, setMatchOrgs] = useState<string[]>([]);
  const [matchNoticeTypes, setMatchNoticeTypes] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

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
      setError(resolveError(err, t, "errors.loadProfile"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!form.companyName.trim() || !form.province || !form.companySize || (form.servicesDescription?.length ?? 0) < 150 || form.industryCodes.length === 0 || form.commodityTypes.length === 0) return;
    setConfirmSave("create");
  }

  async function executeCreate() {
    setSaving(true);
    setError(null);
    setConfirmSave(null);
    try {
      const req: CreateCompanyProfileRequest = {
        companyName: form.companyName,
        industryCodes: form.industryCodes,
        province: form.province || undefined,
        servicesDescription: form.servicesDescription || undefined,
        keywords: form.keywords,
        certifications: form.certifications,
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
      setError(resolveError(err, t, "errors.createProfile"));
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

  // Load filter options when matches tab first opens
  useEffect(() => {
    if (tab === "matches" && profile) {
      getMyMatchFilters()
        .then((f) => { setMatchOrgs(f.organizations); setMatchNoticeTypes(f.noticeTypes); })
        .catch(() => {});
    }
  }, [tab, profile]);

  // Load matches when switching to matches tab, changing search, or changing page
  useEffect(() => {
    if (tab === "matches" && profile) {
      loadMatches(matchPage);
    }
  }, [tab, matchSearch, matchPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setMatchPage(1);
  }, [matchSearch]);

  async function loadMatches(page = 1) {
    setMatchesLoading(true);
    try {
      const [result, s] = await Promise.all([
        getMyMatches(page, 25, matchSearch),
        getMyMatchStats(),
      ]);
      setMatches(result.items);
      setMatchPage(result.page);
      setMatchTotalPages(result.totalPages);
      setMatchTotalCount(result.totalCount);
      setStats(s);
    } catch (err) {
      setError(resolveError(err, t, "errors.loadMatches"));
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

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!form.companyName.trim() || !form.province || !form.companySize || (form.servicesDescription?.length ?? 0) < 150 || form.industryCodes.length === 0 || form.commodityTypes.length === 0) return;
    if (!hasChanges()) { setEditing(false); return; }
    setConfirmSave("save");
  }

  async function executeSave() {
    setSaving(true);
    setError(null);
    setConfirmSave(null);
    try {
      const req: UpdateCompanyProfileRequest = {
        companyName: form.companyName || undefined,
        industryCodes: form.industryCodes,
        province: form.province || undefined,
        servicesDescription: descFingerprint(form.servicesDescription) !== descFingerprint(profile?.servicesDescription ?? "")
          ? form.servicesDescription
          : undefined,
        keywords: form.keywords,
        certifications: form.certifications,
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
      setError(resolveError(err, t, "errors.saveProfile"));
    } finally {
      setSaving(false);
    }
  }

  function hasChanges(): boolean {
    if (!profile) return true;
    const arr = (a?: string[] | null, b?: string[] | null) =>
      [...(a ?? [])].sort().join("\0") !== [...(b ?? [])].sort().join("\0");
    const p = profile;
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
      arr(prefsForm.preferredOrgs,     pr?.preferredOrgs) ||
      arr(prefsForm.preferredNtTypes,  pr?.preferredNtTypes) ||
      arr(prefsForm.preferredProvinces,pr?.preferredProvinces) ||
      arr(prefsForm.excludeKeywords,   pr?.excludeKeywords)
    );
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
    if (locked) return;
    setMatchBusy(true);
    setMatchMsg("");
    try {
      const result: TriggerMatchResult = await triggerMyMatch();
      if (result.started) {
        setMatchMsg(t("trigger.queued"));
        setProfile((prev) => prev ? { ...prev, matchingStatus: "pending_rematch" } : prev);
        await loadProfile();
      } else if (result.retryAfterSeconds) {
        const h = Math.floor(result.retryAfterSeconds / 3600);
        const m = Math.ceil((result.retryAfterSeconds % 3600) / 60);
        setMatchMsg(t("trigger.cooldown", { hours: h, minutes: m }));
      } else {
        setMatchMsg(result.message);
      }
    } catch (err) {
      setMatchMsg(resolveError(err, t, "trigger.failed"));
    } finally {
      setMatchBusy(false);
    }
  }

  async function handleStatusChange(matchId: number, newStatus: "new" | "viewed" | "saved" | "dismissed") {
    try {
      await updateMyMatchStatus(matchId, { status: newStatus });
      await loadMatches();
    } catch (err) {
      setError(resolveError(err, t, "errors.updateStatus"));
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const result = await getMyMatches(1, 1000, matchSearch);
      const rows = result.items;
      if (rows.length === 0) return;
      const esc = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const fmt = (d: string | null | undefined) =>
        d ? new Date(d).toLocaleDateString(i18n.language) : "";
      const lines = [
        [
          t("matches.csvHeaders.title"),
          t("matches.csvHeaders.organization"),
          t("matches.csvHeaders.category"),
          t("matches.csvHeaders.noticeType"),
          t("matches.csvHeaders.score"),
          t("matches.csvHeaders.status"),
          t("matches.csvHeaders.matchedOn"),
          t("matches.csvHeaders.closingDate"),
          t("matches.csvHeaders.noticeLink"),
        ].join(","),
        ...rows.map((m) =>
          [
            esc(m.tenderTitle),
            esc(m.buyingOrganization),
            esc(m.procurementCategory),
            esc(m.noticeType),
            m.matchScore,
            m.status,
            fmt(m.matchedAt),
            fmt(m.closingDate),
            esc(m.noticeLink),
          ].join(",")
        ),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `matches-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(resolveError(err, t, "errors.exportFailed"));
    } finally {
      setExportLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "running":
      case "pending_rematch":
      case "pending_reset":
        return <span className="pp-badge pp-badge-amber">{t("status.matching")}</span>;
      case "completed":
        return <span className="pp-badge pp-badge-green">{t("status.matched")}</span>;
      case "failed":
        return <span className="pp-badge pp-badge-red">{t("status.failed")}</span>;
      default:
        return <span className="pp-badge pp-badge-gray">{t("status.notMatched")}</span>;
    }
  }

  function getTimeAgo(dateStr: string | null): string {
    if (!dateStr) return t("timeAgo.never");
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("timeAgo.justNow");
    if (mins < 60) return t("timeAgo.mAgo", { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("timeAgo.hAgo", { count: hours });
    return t("timeAgo.dAgo", { count: Math.floor(hours / 24) });
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

  const confirmModal = confirmSave ? createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card shadow-lg" style={{ maxWidth: 420, width: "90%", borderRadius: 10 }}>
        <div className="card-body p-4">
          <h5 className="mb-1">{confirmSave === "create" ? t("confirmModal.createTitle") : t("confirmModal.saveTitle")}</h5>
          <p className="text-muted small mb-4">
            {confirmSave === "create" ? t("confirmModal.createBody") : t("confirmModal.saveBody")}
          </p>
          <div className="d-flex gap-2 justify-content-end">
            <button className="pp-btn pp-btn-ghost" onClick={() => setConfirmSave(null)}>{t("confirmModal.goBack")}</button>
            <button className="pp-btn pp-btn-primary" disabled={saving} onClick={confirmSave === "create" ? executeCreate : executeSave}>
              {saving ? t("confirmModal.saving") : t("confirmModal.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  if (!profile) {
    if (!editing) {
      return (
        <div className="pp-empty-state" style={{ paddingTop: "5rem" }}>
          <div className="empty-icon">◈</div>
          <h3>{t("setup.title")}</h3>
          <p>{t("setup.body")}</p>
          <button className="pp-btn pp-btn-primary mt-3" onClick={() => setEditing(true)}>
            {t("setup.cta")}
          </button>
        </div>
      );
    }

    // Show create form
    return (
      <div>
        {confirmModal}
        <h2>{t("form.createTitle")}</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">{t("form.fields.companyName")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.companyName")} /></label>
              <input
                className={`form-control${submitted && !form.companyName.trim() ? " is-invalid" : ""}`}
                required value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">{t("form.fields.province")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.province")} /></label>
              <select className={`form-select${submitted && !form.province ? " is-invalid" : ""}`} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                <option value="">{t("form.selectPlaceholder")}</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {submitted && !form.province && <div className="text-danger small mt-1">{t("form.validation.province")}</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label">{t("form.fields.companySize")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.companySize")} /></label>
              <select className={`form-select${submitted && !form.companySize ? " is-invalid" : ""}`} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>
                <option value="">{t("form.selectPlaceholder")}</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {submitted && !form.companySize && <div className="text-danger small mt-1">{t("form.validation.companySize")}</div>}
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">{t("form.fields.industries")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.industries")} /></label>
            <IndustryPicker
              value={form.industryCodes}
              onChange={(codes) => setForm({ ...form, industryCodes: codes })}
              error={submitted && form.industryCodes.length === 0}
              id="create-industries"
            />
            {submitted && form.industryCodes.length === 0 && (
              <div className="text-danger small mt-1">{t("form.validation.industries")}</div>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label">{t("form.fields.servicesDescription")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.servicesDescription")} /></label>
            <textarea
              className={`form-control${submitted && (form.servicesDescription?.length ?? 0) < 150 ? " is-invalid" : ""}`}
              rows={4}
              maxLength={2000}
              value={form.servicesDescription}
              onChange={(e) => setForm({ ...form, servicesDescription: e.target.value })}
              placeholder={t("form.placeholders.servicesDescription")}
            />
            <div className="d-flex justify-content-between mt-1">
              {submitted && (form.servicesDescription?.length ?? 0) < 150
                ? <div className="text-danger small">{t("form.validation.descriptionMin")}</div>
                : <div className="text-muted small">{t("form.descriptionHelp")}</div>}
              <div className={`small ms-2 flex-shrink-0 ${
                (form.servicesDescription?.length ?? 0) === 2000 ? "text-danger" :
                (form.servicesDescription?.length ?? 0) >= 1800 ? "text-warning" :
                (form.servicesDescription?.length ?? 0) >= 150 ? "text-success" : "text-muted"
              }`}>
                {t("form.descriptionCounter", { count: form.servicesDescription?.length ?? 0 })}
              </div>
            </div>
          </div>
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">{t("form.fields.keywords")}<FieldTooltip text={t("form.tooltips.keywords")} /></label>
              <TagInput value={form.keywords} onChange={(tags) => setForm({ ...form, keywords: tags })} placeholder={t("form.placeholders.keyword")} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{t("form.fields.certifications")}<FieldTooltip text={t("form.tooltips.certifications")} /></label>
              <TagInput value={form.certifications} onChange={(tags) => setForm({ ...form, certifications: tags })} placeholder={t("form.placeholders.certification")} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">{t("form.fields.commodityTypes")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.commodityTypes")} /></label>
            <MultiSelectDropdown id="commodityTypes" options={COMMODITY_OPTIONS} value={form.commodityTypes} onChange={(sel) => setForm({ ...form, commodityTypes: sel })} placeholder={t("form.placeholders.commodityTypes")} className={submitted && form.commodityTypes.length === 0 ? "is-invalid" : ""} />
            {submitted && form.commodityTypes.length === 0 && <div className="text-danger small mt-1">{t("form.validation.commodityTypes")}</div>}
          </div>
          <div className="mb-3">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowPrefs(!showPrefs)}>
              {showPrefs ? t("form.prefsToggleHide") : t("form.prefsToggleShow")}
            </button>
          </div>
          {showPrefs && (
            <div className="card mb-3"><div className="card-body">
              <h5 className="card-title">{t("form.prefsTitle")}</h5>
              <div className="alert alert-warning py-2 small mb-3 mt-4">
                <Trans i18nKey="form.prefsWarning" t={t} components={{ 1: <strong /> }} />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">{t("form.prefsFields.preferredOrgs")}<FieldTooltip text={t("form.tooltips.preferredOrgs")} /></label>
                  <TagInput value={prefsForm.preferredOrgs} onChange={(tags) => setPrefsForm({ ...prefsForm, preferredOrgs: tags })} placeholder={t("form.placeholders.organization")} />
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">{t("form.prefsFields.preferredNtTypes")}<FieldTooltip text={t("form.tooltips.preferredNtTypes")} /></label>
                  <MultiSelectDropdown id="prefNtTypes" options={NOTICE_TYPE_OPTIONS} value={prefsForm.preferredNtTypes} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredNtTypes: sel })} placeholder={t("form.placeholders.noticeTypes")} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t("form.prefsFields.preferredProvinces")}<FieldTooltip text={t("form.tooltips.preferredProvinces")} /></label>
                  <MultiSelectDropdown id="prefProvinces" options={PROVINCE_OPTIONS} value={prefsForm.preferredProvinces} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredProvinces: sel })} placeholder={t("form.placeholders.provinces")} />
                  <div className="text-muted small mt-1">{t("form.preferredProvincesNote")}</div>
                </div>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">{t("form.prefsFields.excludeKeywords")}<FieldTooltip text={t("form.tooltips.excludeKeywords")} /></label>
                  <TagInput value={prefsForm.excludeKeywords} onChange={(tags) => setPrefsForm({ ...prefsForm, excludeKeywords: tags })} placeholder={t("form.placeholders.keyword")} />
                </div>
              </div>
            </div></div>
          )}
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>{t("form.createSubmit")}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>{t("form.cancel")}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="pp-animate-in">
      {confirmModal}
      <div className="pp-page-header">
        <div>
          <h2>{profile.companyName || t("header.fallbackName")}</h2>
          <span style={{ fontSize: ".85rem", color: "var(--pp-text-muted)" }}>
            {t("header.lastMatched", { time: getTimeAgo(profile.lastMatchedAt) })}
          </span>
        </div>
        <div className="header-actions">
          {getStatusBadge(profile.matchingStatus)}
          <button
            className="pp-btn pp-btn-primary pp-btn-sm"
            onClick={handleTrigger}
            disabled={matchBusy || isMatchActive || locked}
            title={locked ? t("header.runLockedTitle") : undefined}
          >
            {locked ? t("header.runMatchingLocked") : matchBusy || isMatchActive ? t("header.runMatchingBusy") : t("header.runMatching")}
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
          {t("tabs.profile")}
        </button>
        <button
          className={`pp-tab ${tab === "matches" ? "active" : ""}`}
          onClick={() => setTab("matches")}
        >
          {t("tabs.matches")}
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
              {t("profileView.editButton")}
            </button>
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="pp-card">
                <div className="pp-card-body">
                  <h6 style={{ color: "var(--pp-text-muted)", fontSize: ".8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: ".75rem" }}>{t("profileView.companyDetails")}</h6>
                  <p><strong>{t("profileView.labels.name")}</strong> {profile.companyName}</p>
                  <p><strong>{t("profileView.labels.industries")}</strong></p>
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {profile.industries?.length
                      ? profile.industries.map((i) => (
                          <span key={i.code} className="pp-badge pp-badge-blue">{i.titleEn}</span>
                        ))
                      : <span style={{ color: "var(--pp-text-muted)" }}>{t("profileView.dash")}</span>}
                  </div>
                  <p><strong>{t("profileView.labels.province")}</strong> {profile.province || t("profileView.dash")}</p>
                  <p><strong>{t("profileView.labels.size")}</strong> {profile.companySize || t("profileView.dash")}</p>
                  <p><strong>{t("profileView.labels.commodityTypes")}</strong>{" "}
                    {profile.commodityTypes?.length
                      ? profile.commodityTypes.map((c) => CATEGORY_MAP[c] || c).join(", ")
                      : t("profileView.dash")}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="pp-card">
                <div className="pp-card-body">
                  <h6 style={{ color: "var(--pp-text-muted)", fontSize: ".8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: ".75rem" }}>{t("profileView.servicesKeywords")}</h6>
                  <p><strong>{t("profileView.labels.description")}</strong></p>
                  <p style={{ color: "var(--pp-text-secondary)" }}>{profile.servicesDescription || t("profileView.dash")}</p>
                  <p><strong>{t("profileView.labels.keywords")}</strong></p>
                  <div>
                    {profile.keywords?.length ? (
                      profile.keywords.map((k) => (
                        <span key={k} className="pp-badge pp-badge-blue me-1 mb-1">{k}</span>
                      ))
                    ) : (
                      <span style={{ color: "var(--pp-text-muted)" }}>{t("profileView.none")}</span>
                    )}
                  </div>
                  {profile.autoKeywords && profile.autoKeywords.length > 0 && (
                    <>
                      <p className="mt-2"><strong>{t("profileView.labels.autoKeywords")}</strong></p>
                      <div>
                        {profile.autoKeywords.map((k) => (
                          <span key={k} className="pp-badge pp-badge-teal me-1 mb-1">{k}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {!profile.lastMatchedAt && (
                    <div className="alert alert-info mt-3 mb-0 py-2 small">
                      <Trans i18nKey="profileView.noMatchYet" t={t} components={{ 1: <strong /> }} />
                    </div>
                  )}
                  {profile.autoKeywords !== null && profile.autoKeywords !== undefined && profile.autoKeywords.length < 5 && (
                    <div className="alert alert-warning mt-3 mb-0 py-2 small">
                      <Trans i18nKey="profileView.weakKeywords" t={t} count={profile.autoKeywords.length} components={{ 1: <strong /> }} />
                    </div>
                  )}
                  <p className="mt-2"><strong>{t("profileView.labels.certifications")}</strong></p>
                  <div>
                    {profile.certifications?.length ? (
                      profile.certifications.map((c) => (
                        <span key={c} className="pp-badge pp-badge-gray me-1 mb-1">{c}</span>
                      ))
                    ) : (
                      <span style={{ color: "var(--pp-text-muted)" }}>{t("profileView.none")}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {profile.preferences && (
            <div className="pp-card mt-3">
              <div className="pp-card-body">
                <h6 style={{ color: "var(--pp-text-muted)", fontSize: ".8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: ".75rem" }}>{t("profileView.preferencesTitle")}</h6>
                <div className="row">
                  <div className="col-md-4">
                    <p><strong>{t("profileView.labels.preferredProvinces")}</strong>{" "}
                      {profile.preferences.preferredProvinces?.join(", ") || t("profileView.any")}
                    </p>
                  </div>
                  <div className="col-md-4">
                    <p><strong>{t("profileView.labels.noticeTypes")}</strong>{" "}
                      {profile.preferences.preferredNtTypes?.join(", ") || t("profileView.any")}
                    </p>
                  </div>
                  <div className="col-md-4">
                    <p><strong>{t("profileView.labels.preferredOrgs")}</strong>{" "}
                      {profile.preferences.preferredOrgs?.join(", ") || t("profileView.any")}
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
              <label className="form-label">{t("form.fields.companyName")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.companyName")} /></label>
              <input
                className={`form-control${submitted && !form.companyName.trim() ? " is-invalid" : ""}`}
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">{t("form.fields.province")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.province")} /></label>
              <select className={`form-select${submitted && !form.province ? " is-invalid" : ""}`} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
                <option value="">{t("form.selectPlaceholder")}</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {submitted && !form.province && <div className="text-danger small mt-1">{t("form.validation.province")}</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label">{t("form.fields.companySize")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.companySize")} /></label>
              <select className={`form-select${submitted && !form.companySize ? " is-invalid" : ""}`} value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>
                <option value="">{t("form.selectPlaceholder")}</option>
                {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {submitted && !form.companySize && <div className="text-danger small mt-1">{t("form.validation.companySize")}</div>}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">{t("form.fields.industries")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.industries")} /></label>
            <IndustryPicker
              value={form.industryCodes}
              onChange={(codes) => setForm({ ...form, industryCodes: codes })}
              initialLabels={Object.fromEntries((profile?.industries ?? []).map((i) => [i.code, i.titleEn]))}
              error={submitted && form.industryCodes.length === 0}
              id="edit-industries"
            />
            {submitted && form.industryCodes.length === 0 && (
              <div className="text-danger small mt-1">{t("form.validation.industries")}</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label">{t("form.fields.servicesDescription")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.servicesDescription")} /></label>
            <textarea
              className={`form-control${submitted && (form.servicesDescription?.length ?? 0) < 150 ? " is-invalid" : ""}`}
              rows={4}
              maxLength={2000}
              value={form.servicesDescription}
              onChange={(e) => setForm({ ...form, servicesDescription: e.target.value })}
              placeholder={t("form.placeholders.servicesDescription")}
            />
            <div className="d-flex justify-content-between mt-1">
              {submitted && (form.servicesDescription?.length ?? 0) < 150
                ? <div className="text-danger small">{t("form.validation.descriptionMin")}</div>
                : <div className="text-muted small">{t("form.descriptionHelp")}</div>}
              <div className={`small ms-2 flex-shrink-0 ${
                (form.servicesDescription?.length ?? 0) === 2000 ? "text-danger" :
                (form.servicesDescription?.length ?? 0) >= 1800 ? "text-warning" :
                (form.servicesDescription?.length ?? 0) >= 150 ? "text-success" : "text-muted"
              }`}>
                {t("form.descriptionCounter", { count: form.servicesDescription?.length ?? 0 })}
              </div>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">{t("form.fields.keywords")}<FieldTooltip text={t("form.tooltips.keywords")} /></label>
              <TagInput value={form.keywords} onChange={(tags) => setForm({ ...form, keywords: tags })} placeholder={t("form.placeholders.keyword")} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{t("form.fields.certifications")}<FieldTooltip text={t("form.tooltips.certifications")} /></label>
              <TagInput value={form.certifications} onChange={(tags) => setForm({ ...form, certifications: tags })} placeholder={t("form.placeholders.certification")} />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">{t("form.fields.commodityTypes")} <span className="text-danger fw-bold">{t("form.required")}</span><FieldTooltip text={t("form.tooltips.commodityTypes")} /></label>
            <MultiSelectDropdown
              id="commodityTypes"
              options={COMMODITY_OPTIONS}
              value={form.commodityTypes}
              onChange={(sel) => setForm({ ...form, commodityTypes: sel })}
              placeholder={t("form.placeholders.commodityTypes")}
              className={submitted && form.commodityTypes.length === 0 ? "is-invalid" : ""}
            />
            {submitted && form.commodityTypes.length === 0 && (
              <div className="text-danger small mt-1">{t("form.validation.commodityTypes")}</div>
            )}
          </div>

          <div className="mb-3">
            <button type="button" className="pp-btn pp-btn-ghost pp-btn-sm" onClick={() => setShowPrefs(!showPrefs)}>
              {showPrefs ? t("form.prefsToggleHide") : t("form.prefsToggleShow")}
            </button>
          </div>

          {showPrefs && (
            <div className="pp-card mb-3">
              <div className="pp-card-body">
                <h5 className="card-title">{t("form.prefsTitle")}</h5>
                <div className="alert alert-warning py-2 small mb-3 mt-4">
                  <Trans i18nKey="form.prefsWarning" t={t} components={{ 1: <strong /> }} />
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">{t("form.prefsFields.preferredOrgs")}<FieldTooltip text={t("form.tooltips.preferredOrgs")} /></label>
                    <TagInput value={prefsForm.preferredOrgs} onChange={(tags) => setPrefsForm({ ...prefsForm, preferredOrgs: tags })} placeholder={t("form.placeholders.organization")} />
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">{t("form.prefsFields.preferredNtTypes")}<FieldTooltip text={t("form.tooltips.preferredNtTypes")} /></label>
                    <MultiSelectDropdown id="prefNtTypes" options={NOTICE_TYPE_OPTIONS} value={prefsForm.preferredNtTypes} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredNtTypes: sel })} placeholder={t("form.placeholders.noticeTypes")} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t("form.prefsFields.preferredProvinces")}<FieldTooltip text={t("form.tooltips.preferredProvinces")} /></label>
                    <MultiSelectDropdown id="prefProvinces" options={PROVINCE_OPTIONS} value={prefsForm.preferredProvinces} onChange={(sel) => setPrefsForm({ ...prefsForm, preferredProvinces: sel })} placeholder={t("form.placeholders.provinces")} />
                    <div className="text-muted small mt-1">{t("form.preferredProvincesNote")}</div>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label">{t("form.prefsFields.excludeKeywords")}<FieldTooltip text={t("form.tooltips.excludeKeywords")} /></label>
                    <TagInput value={prefsForm.excludeKeywords} onChange={(tags) => setPrefsForm({ ...prefsForm, excludeKeywords: tags })} placeholder={t("form.placeholders.keyword")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex gap-2">
            <button type="submit" className="pp-btn pp-btn-primary" disabled={saving}>{t("form.saveSubmit")}</button>
            <button type="button" className="pp-btn pp-btn-ghost" onClick={() => setEditing(false)}>{t("form.cancel")}</button>
          </div>
        </form>
      )}

      {/* Matches Tab */}
      {tab === "matches" && (
        <div>
          {stats && (
            <div className="row g-3 mb-4">
              {[
                { label: t("matches.stats.total"), value: stats.totalMatches, icon: "📊", color: "blue" },
                { label: t("matches.stats.new"), value: stats.newCount, icon: "✨", color: "green" },
                { label: t("matches.stats.saved"), value: stats.savedCount, icon: "⭐", color: "amber" },
                { label: t("matches.stats.viewed"), value: stats.viewedCount, icon: "👁", color: "teal" },
                { label: t("matches.stats.avgScore"), value: stats.averageScore, icon: "📈", color: "blue" },
                { label: t("matches.stats.highScore"), value: stats.highScoreCount, icon: "🎯", color: "green" },
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

          {locked ? (
            <LockedMatches newCount={stats?.newCount ?? 0} companyName={profile.companyName} />
          ) : (
          <>
          <div className="d-flex justify-content-end mb-2">
            <button
              className="pp-btn pp-btn-ghost pp-btn-sm"
              onClick={handleExport}
              disabled={exportLoading || matchesLoading || matchTotalCount === 0}
            >
              {exportLoading ? t("matches.exporting") : t("matches.exportCsv")}
            </button>
          </div>
          <MatchesSearchBar
            params={matchSearch}
            organizations={matchOrgs}
            noticeTypes={matchNoticeTypes}
            onSearch={(p) => setMatchSearch(p)}
          />

          {matchesLoading ? (
            <div className="pp-loader"><div className="pp-spinner" /></div>
          ) : matches.length === 0 ? (
            <p className="text-muted">{t("matches.empty")}</p>
          ) : (
            <>
              <MatchesTable matches={matches} onStatusChange={handleStatusChange} />
              <Pagination
                page={matchPage}
                totalPages={matchTotalPages}
                totalCount={matchTotalCount}
                onPageChange={setMatchPage}
                foundLabel={t("pagination.matchesFound", { count: matchTotalCount, ns: "common" })}
              />
            </>
          )}
          </>
          )}
        </div>
      )}
    </div>
  );
}
