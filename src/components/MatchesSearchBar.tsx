import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import MultiSelectDropdown from "./MultiSelectDropdown";
import type { DropdownOption } from "./MultiSelectDropdown";
import type { MatchSearchParams } from "../api/companyApi";
import ProvinceDropdown from "./ProvinceDropdown";

export type { MatchSearchParams };

export type ViewFilter = "all" | "new" | "interested" | "ignored" | "expired" | "viewed";

export function statusesFromFilter(f: ViewFilter): string[] {
  if (f === "new")        return ["new"];
  if (f === "viewed")     return []; // openedOnly=true handles this server-side
  if (f === "interested") return ["saved"];
  if (f === "ignored")    return ["dismissed"];
  return ["new", "viewed", "saved"];
  // "expired" uses no status filter — expiredOnly=true is set separately
}

interface Props {
  params: MatchSearchParams;
  organizations: string[];
  noticeTypes: string[];
  availableProvinces?: string[];
  onSearch: (params: MatchSearchParams) => void;
  viewFilter: ViewFilter;
  onViewFilterChange: (f: ViewFilter) => void;
}

export default function MatchesSearchBar({ params, organizations, noticeTypes, availableProvinces, onSearch, viewFilter, onViewFilterChange }: Props) {
  const { t } = useTranslation("tenders");
  const [keyword, setKeyword] = useState(params.keyword ?? "");
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>(params.organizations ?? []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(params.noticeTypes ?? []);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(params.provinces ?? []);

  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const mounted = useRef(false);

  function buildParams(): MatchSearchParams {
    return {
      keyword: keyword.trim() || undefined,
      organizations: selectedOrgs.length ? selectedOrgs : undefined,
      noticeTypes: selectedTypes.length ? selectedTypes : undefined,
      provinces: selectedProvinces.length ? selectedProvinces : undefined,
    };
  }

  // Auto-apply when dropdowns change
  useEffect(() => {
    if (!mounted.current) return;
    onSearchRef.current(buildParams());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgs, selectedTypes, selectedProvinces]);

  // Debounced auto-apply for keyword
  useEffect(() => {
    if (!mounted.current) return;
    const timer = setTimeout(() => {
      onSearchRef.current(buildParams());
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  useEffect(() => {
    mounted.current = true;
  }, []);

  function handleReset() {
    setKeyword("");
    setSelectedOrgs([]);
    setSelectedTypes([]);
    setSelectedProvinces([]);
    onViewFilterChange("all");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearchRef.current(buildParams());
  }

  const orgOptions: DropdownOption[] = organizations.map((o) => ({ value: o, label: o }));
  const typeOptions: DropdownOption[] = noticeTypes.map((t) => ({ value: t, label: t }));

  const VIEW_FILTERS: { value: ViewFilter; label: string }[] = [
    { value: "all",        label: t("matchesTable.viewFilter.all") },
    { value: "new",        label: t("matchesTable.viewFilter.new") },
    { value: "interested", label: t("matchesTable.viewFilter.interested") },
    { value: "ignored",    label: t("matchesTable.viewFilter.ignored") },
    { value: "expired",    label: t("matchesTable.viewFilter.expired") },
  ];

  return (
    <form onSubmit={handleSubmit} className="pp-search-bar">
      <div className="pp-view-filter">
        {VIEW_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`pp-view-pill${viewFilter === f.value ? " active" : ""}`}
            onClick={() => onViewFilterChange(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="row g-3 align-items-end">
        <div className="col">
          <label htmlFor="m-keyword" className="form-label">{t("searchBar.search")}</label>
          <input
            id="m-keyword"
            type="text"
            className="form-control"
            placeholder={t("searchBar.keywordPlaceholderShort")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="col">
          <label className="form-label">{t("searchBar.organization")}</label>
          <MultiSelectDropdown
            id="m-orgs"
            options={orgOptions}
            value={selectedOrgs}
            onChange={setSelectedOrgs}
            placeholder={t("searchBar.allOrganizations")}
          />
        </div>

        <div className="col-md-2">
          <label className="form-label">{t("searchBar.noticeType")}</label>
          <MultiSelectDropdown
            id="m-types"
            options={typeOptions}
            value={selectedTypes}
            onChange={setSelectedTypes}
            placeholder={t("searchBar.allTypes")}
          />
        </div>

        <div className="col-md-2">
          <label className="form-label">{t("searchBar.province")}</label>
          <ProvinceDropdown
            id="m-provinces"
            value={selectedProvinces}
            onChange={setSelectedProvinces}
            availableValues={availableProvinces}
          />
        </div>

        <div className="col-md-auto d-flex gap-2 justify-content-end">
          <button type="submit" className="pp-btn pp-btn-primary" style={{ width: 100, justifyContent: "center", paddingInline: ".5rem" }}>{t("searchBar.searchButton")}</button>
          <button type="button" className="pp-btn pp-btn-ghost" style={{ width: 100, justifyContent: "center", paddingInline: ".5rem" }} onClick={handleReset}>{t("searchBar.reset")}</button>
        </div>
      </div>
    </form>
  );
}
