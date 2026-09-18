import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import MultiSelectDropdown from "./MultiSelectDropdown";
import type { DropdownOption } from "./MultiSelectDropdown";
import type { MatchSearchParams } from "../api/companyApi";

export type { MatchSearchParams };

interface Props {
  params: MatchSearchParams;
  organizations: string[];
  noticeTypes: string[];
  onSearch: (params: MatchSearchParams) => void;
}

export default function MatchesSearchBar({ params, organizations, noticeTypes, onSearch }: Props) {
  const { t } = useTranslation("tenders");
  const STATUS_OPTIONS: DropdownOption[] = [
    { value: "new", label: t("searchBar.statuses.new") },
    { value: "viewed", label: t("searchBar.statuses.viewed") },
    { value: "saved", label: t("searchBar.statuses.saved") },
    { value: "dismissed", label: t("searchBar.statuses.dismissed") },
  ];
  const [keyword, setKeyword] = useState(params.keyword ?? "");
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>(params.organizations ?? []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(params.noticeTypes ?? []);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(params.statuses ?? []);

  // Keep onSearch stable in effects without adding it to deps
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  // mounted ref — stays false until after all initial effects have run.
  // Defined AFTER the auto-apply effects so its useEffect runs last on mount,
  // which means auto-apply effects see mounted=false on the very first render.
  const mounted = useRef(false);

  // Auto-apply immediately when any dropdown selection changes
  useEffect(() => {
    if (!mounted.current) return;
    onSearchRef.current({
      keyword: keyword.trim() || undefined,
      organizations: selectedOrgs.length ? selectedOrgs : undefined,
      noticeTypes: selectedTypes.length ? selectedTypes : undefined,
      statuses: selectedStatuses.length ? selectedStatuses : undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgs, selectedTypes, selectedStatuses]);

  // Auto-apply with 400ms debounce when keyword changes
  useEffect(() => {
    if (!mounted.current) return;
    const timer = setTimeout(() => {
      onSearchRef.current({
        keyword: keyword.trim() || undefined,
        organizations: selectedOrgs.length ? selectedOrgs : undefined,
        noticeTypes: selectedTypes.length ? selectedTypes : undefined,
        statuses: selectedStatuses.length ? selectedStatuses : undefined,
      });
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // Must be the LAST useEffect — sets mounted=true after all initial effects have skipped
  useEffect(() => {
    mounted.current = true;
  }, []);

  function handleReset() {
    setKeyword("");
    setSelectedOrgs([]);
    setSelectedTypes([]);
    setSelectedStatuses([]);
    // The dropdown effect above will fire and call onSearch({}) automatically
  }

  // Keep Search button for manual/keyboard trigger (e.g. pressing Enter mid-debounce)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearchRef.current({
      keyword: keyword.trim() || undefined,
      organizations: selectedOrgs.length ? selectedOrgs : undefined,
      noticeTypes: selectedTypes.length ? selectedTypes : undefined,
      statuses: selectedStatuses.length ? selectedStatuses : undefined,
    });
  }

  const orgOptions: DropdownOption[] = organizations.map((o) => ({ value: o, label: o }));
  const typeOptions: DropdownOption[] = noticeTypes.map((t) => ({ value: t, label: t }));

  return (
    <form onSubmit={handleSubmit} className="pp-search-bar">
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
          <label className="form-label">{t("searchBar.status")}</label>
          <MultiSelectDropdown
            id="m-statuses"
            options={STATUS_OPTIONS}
            value={selectedStatuses}
            onChange={setSelectedStatuses}
            placeholder={t("searchBar.allStatuses")}
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
