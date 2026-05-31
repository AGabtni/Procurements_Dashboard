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

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
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
    { label: "Type", field: "notice_type" },
    { label: "Published", field: "pub_date" },
    { label: "Closing", field: "closing_date" },
  ];

  if (tenders.length === 0) {
    return (
      <div className="pp-empty-state">
        <div className="empty-icon">🔍</div>
        <h3>No tenders found</h3>
        <p>Try adjusting your search filters or broadening your criteria.</p>
      </div>
    );
  }

  return (
    <div className="pp-table-wrap">
      <table className="pp-table" style={{ tableLayout: "fixed", width: "100%" }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h.label}
                role={h.field ? "button" : undefined}
                onClick={h.field ? () => onSort(h.field) : undefined}
                style={{
                  ...(h.label === "Title" ? { width: "32%" } :
                  h.label === "Organization" ? { width: "24%" } :
                  h.label === "Type" ? { width: "12%" } :
                  h.label === "Published" ? { width: "11%" } :
                  h.label === "Closing" ? { width: "14%" } :
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
          {tenders.map((t) => {
            const days = daysUntil(t.closingDate);
            const isUrgent = days !== null && days >= 0 && days <= 3;
            return (
              <tr key={t.id}>
                <td className="text-truncate">
                  <Link
                    to={`/tenders/${t.id}`}
                    className="tender-title-link"
                  >
                    {t.title ?? "Untitled"}
                  </Link>
                </td>
                <td className="text-truncate" style={{ color: "var(--pp-text-secondary)", fontSize: ".88rem" }} title={t.buyingOrganization ?? undefined}>
                  {t.buyingOrganization ?? "—"}
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  {t.noticeType && t.noticeType !== "Not Applicable" && (
                    <span className="pp-badge pp-badge-teal" style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }} title={t.noticeType}>
                      {t.noticeType}
                    </span>
                  )}
                </td>
                <td className="text-nowrap" style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                  {formatDate(t.publicationDate)}
                </td>
                <td className="text-nowrap">
                  {isUrgent ? (
                    <span className="pp-badge pp-badge-red pp-closing-soon">
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d left`}
                    </span>
                  ) : days !== null && days >= 0 && days <= 7 ? (
                    <span className="pp-badge pp-badge-amber">
                      {`${days}d left`}
                    </span>
                  ) : (
                    <span style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                      {formatDate(t.closingDate)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
