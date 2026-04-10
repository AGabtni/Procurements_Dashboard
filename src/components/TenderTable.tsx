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
  if (params.sortBy !== field) return null;
  return <span className="ms-1">{params.sortDesc ? "▼" : "▲"}</span>;
}

export default function TenderTable({ tenders, params, onSort }: Props) {
  const headers: { label: string; field: string }[] = [
    { label: "Title", field: "title" },
    { label: "Organization", field: "organization" },
    { label: "Type", field: "" },
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
      <table className="table table-hover align-middle">
        <thead className="table-light">
          <tr>
            {headers.map((h) => (
              <th
                key={h.label}
                role={h.field ? "button" : undefined}
                onClick={h.field ? () => onSort(h.field) : undefined}
                className={h.field ? "user-select-none" : ""}
              >
                {h.label}
                {h.field && <SortIcon field={h.field} params={params} />}
              </th>
            ))}
            <th>Docs</th>
          </tr>
        </thead>
        <tbody>
          {tenders.map((t) => (
            <tr key={t.id}>
              <td style={{ maxWidth: 350 }}>
                <Link
                  to={`/tenders/${t.id}`}
                  className="text-decoration-none fw-semibold"
                >
                  {t.title ?? "Untitled"}
                </Link>
                {t.noticeId && (
                  <div className="text-muted small">{t.noticeId}</div>
                )}
              </td>
              <td className="text-nowrap">
                {t.buyingOrganization ?? "—"}
              </td>
              <td>
                {t.noticeType && (
                  <span className="badge bg-info text-dark">
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
              <td>
                {t.hasDocuments && (
                  <span className="badge bg-success">Yes</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
