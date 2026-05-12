import { Link } from "react-router-dom";
import type { TenderListDto, TenderSearchParams } from "../types/tender";

interface Props {
  tenders: TenderListDto[];
  params: TenderSearchParams;
  onSort: (field: string) => void;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA");
}

function SortIcon({
  field,
  params,
}: {
  field: string;
  params: TenderSearchParams;
}) {
  const isActive = params.sortBy === field;
  if (isActive) {
    return <span className="ms-1">{params.sortDesc ? "▼" : "▲"}</span>;
  }
  return <span className="ms-1" style={{ opacity: 0.3 }}>⇅</span>;
}

export default function TenderTable({ tenders, params, onSort }: Props) {
  const headers: { label: string; field: string }[] = [
    { label: "Title", field: "title" },
    { label: "Organization", field: "organization" },
    { label: "Notice Type", field: "" },
    { label: "Published", field: "pub_date" },
    { label: "Closing", field: "closing_date" },
  ];

  if (tenders.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        <p className="fs-5">No tenders found.</p>
        <p>Try adjusting your search filters.</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <style>{`.tender-table th, .tender-table td { padding-right: 1.5rem; padding-top: 0.75rem; padding-bottom: 0.75rem; }`}</style>
      <table className="table table-hover align-middle tender-table" style={{ tableLayout: "fixed", width: "100%" }}>
        <thead className="table-light">
          <tr>
            {headers.map((h) => (
              <th
                key={h.label}
                role={h.field ? "button" : undefined}
                onClick={h.field ? () => onSort(h.field) : undefined}
                className={h.field ? "user-select-none" : ""}
                style={{
                  whiteSpace: "nowrap",
                  ...(h.label === "Title" ? { width: "30%" } :
                  h.label === "Organization" ? { width: "25%" } :
                  h.label === "Notice Type" ? { width: "10%" } :
                  h.label === "Published" ? { width: "10%" } :
                  h.label === "Closing" ? { width: "10%" } :
                  {})
                }}
              >
                {h.label}
                {h.field && <SortIcon field={h.field} params={params} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tenders.map((t) => (
            <tr key={t.id}>
              <td className="text-truncate">
                <Link
                  to={`/tenders/${t.id}`}
                  className="text-decoration-none fw-semibold"
                >
                  {t.title ?? "Untitled"}
                </Link>
              </td>
              <td className="text-truncate">
                {t.buyingOrganization ?? "—"}
              </td>
              <td style={{ overflow: "hidden" }}>
                {t.noticeType && t.noticeType !== "Not Applicable" && (
                  <span className="badge bg-info text-dark text-truncate d-inline-block" style={{ maxWidth: "100%" }}>
                    {t.noticeType}
                  </span>
                )}
              </td>
              <td className="text-nowrap">
                {formatDate(t.publicationDate)}
              </td>
              <td className="text-nowrap">
                {formatDate(t.closingDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
