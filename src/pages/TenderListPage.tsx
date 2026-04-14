import { useCallback, useEffect, useState } from "react";
import { searchTenders, getCategories, getNoticeTypes } from "../api/tenderApi";
import type { TenderListDto, TenderSearchParams, PagedResult } from "../types/tender";
import SearchBar from "../components/SearchBar";
import TenderTable from "../components/TenderTable";
import Pagination from "../components/Pagination";
import { categoryLabel } from "../utils/categoryMap";

const DEFAULT_PARAMS: TenderSearchParams = {
  page: 1,
  pageSize: 20,
  sortBy: "closing_date",
  sortDesc: false,
  openOnly: true,
};

export default function TenderListPage() {
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
      setError(err instanceof Error ? err.message : "Failed to load tenders");
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
      "Notice ID",
      "Title",
      "Organization",
      "Category",
      "Notice Type",
      "Published",
      "Closing",
      "Has Documents",
    ];
    const rows = result.items.map((t) => [
      t.noticeId ?? "",
      `"${(t.title ?? "").replace(/"/g, '""')}"`,
      `"${(t.buyingOrganization ?? "").replace(/"/g, '""')}"`,
      categoryLabel(t.procurementCategory),
      t.noticeType ?? "",
      t.publicationDate ? new Date(t.publicationDate).toLocaleDateString("en-CA") : "",
      t.closingDate ? new Date(t.closingDate).toLocaleDateString("en-CA") : "",
      t.hasDocuments ? "Yes" : "No",
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Procurement Tenders</h2>
        <button
          className="btn btn-outline-success btn-sm"
          onClick={handleExportCsv}
          disabled={!result?.items.length}
        >
          Export CSV
        </button>
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
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
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
            />
          </>
        )
      )}
    </>
  );
}
