import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { searchTenders, getCategories, getNoticeTypes } from "../api/tenderApi";
import type { TenderListDto, TenderSearchParams, PagedResult } from "../types/tender";
import SearchBar from "../components/SearchBar";
import TenderTable from "../components/TenderTable";
import Pagination from "../components/Pagination";
import { categoryLabel } from "../utils/categoryMap";

const DEFAULT_PARAMS: TenderSearchParams = {
  page: 1,
  pageSize: 20,
  sortBy: "pub_date",
  sortDesc: true,
  openOnly: true,
};

export default function TenderListPage() {
  const { t, i18n } = useTranslation("tenders");
  const [params, setParams] = useState<TenderSearchParams>(DEFAULT_PARAMS);
  const [result, setResult] = useState<PagedResult<TenderListDto> | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [noticeTypes, setNoticeTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load filter options once
  useEffect(() => {
    Promise.all([getCategories(), getNoticeTypes()]).then(
      ([cats, types]) => {
        setCategories(cats);
        setNoticeTypes(types);
      },
      () => {} // filter load failure is non-critical
    );
  }, []);

  // Fetch tenders whenever params change
  const fetchTenders = useCallback(async (p: TenderSearchParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchTenders(p);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("list.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenders(params);
  }, [params, fetchTenders]);

  function handleSearch(newParams: TenderSearchParams) {
    setParams(newParams);
  }

  function handleSort(field: string) {
    setParams((prev) => ({
      ...prev,
      sortBy: field,
      sortDesc: prev.sortBy === field ? !prev.sortDesc : false,
      page: 1,
    }));
  }

  function handlePageChange(page: number) {
    setParams((prev) => ({ ...prev, page }));
  }

  function handleExportCsv() {
    if (!result?.items.length) return;

    const headers = [
      t("list.csvHeaders.noticeId"),
      t("list.csvHeaders.title"),
      t("list.csvHeaders.organization"),
      t("list.csvHeaders.category"),
      t("list.csvHeaders.noticeType"),
      t("list.csvHeaders.published"),
      t("list.csvHeaders.closing"),
      t("list.csvHeaders.hasDocuments"),
    ];
    const yes = t("list.yes");
    const no = t("list.no");
    const dateLocale = i18n.language;
    const rows = result.items.map((tender) => [
      tender.noticeId ?? "",
      `"${(tender.title ?? "").replace(/"/g, '""')}"`,
      `"${(tender.buyingOrganization ?? "").replace(/"/g, '""')}"`,
      categoryLabel(tender.procurementCategory),
      tender.noticeType ?? "",
      tender.publicationDate ? new Date(tender.publicationDate).toLocaleDateString(dateLocale) : "",
      tender.closingDate ? new Date(tender.closingDate).toLocaleDateString(dateLocale) : "",
      tender.hasDocuments ? yes : no,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="pp-page-header">
        <div>
          <h2>{t("list.title")}</h2>
          {result && (
            <span style={{ fontSize: ".85rem", color: "var(--pp-text-muted)" }}>
              {t("list.available", { count: result.totalCount })}
            </span>
          )}
        </div>
        <div className="header-actions">
          <button
            className="pp-btn pp-btn-ghost pp-btn-sm"
            onClick={handleExportCsv}
            disabled={!result?.items.length}
          >
            {t("list.exportCsv")}
          </button>
        </div>
      </div>

      <SearchBar
        params={params}
        categories={categories}
        noticeTypes={noticeTypes}
        onSearch={handleSearch}
      />

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="pp-loader">
          <div className="pp-spinner" />
        </div>
      ) : (
        result && (
          <>
            <TenderTable
              tenders={result.items}
              params={params}
              onSort={handleSort}
            />
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              totalCount={result.totalCount}
              onPageChange={handlePageChange}
              foundLabel={t("pagination.tendersFound", { count: result.totalCount, ns: "common" })}
            />
          </>
        )
      )}
    </>
  );
}
