import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TenderSearchParams } from "../types/tender";
import { categoryLabel } from "../utils/categoryMap";

interface Props {
  params: TenderSearchParams;
  categories: string[];
  noticeTypes: string[];
  onSearch: (params: TenderSearchParams) => void;
}

export default function SearchBar({ params, categories, noticeTypes, onSearch }: Props) {
  const { t } = useTranslation("tenders");
  const [keyword, setKeyword] = useState(params.keyword ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [noticeType, setNoticeType] = useState(params.noticeType ?? "");
  const [openOnly, setOpenOnly] = useState(params.openOnly !== false);

  // Keep stable refs so effects always call the latest version
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // mounted ref — set to true by the LAST useEffect so the auto-apply
  // effects above it see false on the initial render and skip.
  const mounted = useRef(false);

  function buildParams(): TenderSearchParams {
    return {
      ...paramsRef.current,
      keyword: keyword.trim() || undefined,
      category: category || undefined,
      noticeType: noticeType || undefined,
      openOnly,
      page: 1,
    };
  }

  // Auto-apply immediately when any select or checkbox changes
  useEffect(() => {
    if (!mounted.current) return;
    onSearchRef.current(buildParams());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, noticeType, openOnly]);

  // Auto-apply with 400ms debounce when keyword changes
  useEffect(() => {
    if (!mounted.current) return;
    const timer = setTimeout(() => onSearchRef.current(buildParams()), 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // Must be the LAST useEffect — marks component as mounted after all
  // initial effects have already run (and skipped due to mounted=false).
  useEffect(() => {
    mounted.current = true;
  }, []);

  function handleReset() {
    setKeyword("");
    setCategory("");
    setNoticeType("");
    setOpenOnly(true);
    // The select/checkbox effect fires automatically and calls onSearch
  }

  // Keep Search button for immediate apply (e.g. pressing Enter mid-debounce)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearchRef.current(buildParams());
  }

  return (
    <form onSubmit={handleSubmit} className="pp-search-bar">
      <div className="row g-3 align-items-end">
        <div className="col-md-4">
          <label htmlFor="keyword" className="form-label">{t("searchBar.search")}</label>
          <input
            id="keyword"
            name="keyword"
            type="text"
            className="form-control"
            placeholder={t("searchBar.keywordPlaceholder")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="col-md-2">
          <label htmlFor="category" className="form-label">{t("searchBar.category")}</label>
          <select
            id="category"
            name="category"
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t("searchBar.all")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
        </div>

        <div className="col-md-2">
          <label htmlFor="noticeType" className="form-label">{t("searchBar.noticeType")}</label>
          <select
            id="noticeType"
            name="noticeType"
            className="form-select"
            value={noticeType}
            onChange={(e) => setNoticeType(e.target.value)}
          >
            <option value="">{t("searchBar.all")}</option>
            {noticeTypes.map((nt) => (
              <option key={nt} value={nt}>{nt}</option>
            ))}
          </select>
        </div>

        <div className="col-md-2">
          <div className="form-check mt-2">
            <input
              id="openOnly"
              name="openOnly"
              type="checkbox"
              className="form-check-input"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
            />
            <label htmlFor="openOnly" className="form-check-label" style={{ fontSize: ".9rem" }}>
              {t("searchBar.openOnly")}
            </label>
          </div>
        </div>

        <div className="col-md-2 d-flex gap-2">
          <button type="submit" className="pp-btn pp-btn-primary">{t("searchBar.searchButton")}</button>
          <button type="button" className="pp-btn pp-btn-ghost" onClick={handleReset}>{t("searchBar.reset")}</button>
        </div>
      </div>
    </form>
  );
}
