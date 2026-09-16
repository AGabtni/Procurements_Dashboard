import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TenderListDto, TenderSearchParams } from "../types/tender";
import { decodeHtml } from "../utils/html";

interface Props {
  tenders: TenderListDto[];
  params: TenderSearchParams;
  onSort: (field: string) => void;
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
  const { t, i18n } = useTranslation("tenders");

  const formatDate = (iso: string | null) => {
    if (!iso) return t("table.dash");
    return new Date(iso).toLocaleDateString(i18n.language);
  };

  const headers: { label: string; field: string }[] = [
    { label: t("table.headers.title"), field: "title" },
    { label: t("table.headers.organization"), field: "organization" },
    { label: t("table.headers.type"), field: "notice_type" },
    { label: t("table.headers.published"), field: "pub_date" },
    { label: t("table.headers.closing"), field: "closing_date" },
  ];

  if (tenders.length === 0) {
    return (
      <div className="pp-empty-state">
        <div className="empty-icon">🔍</div>
        <h3>{t("table.emptyTitle")}</h3>
        <p>{t("table.emptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="pp-table-wrap">
      <table className="pp-table" style={{ tableLayout: "fixed", width: "100%" }}>
        <thead>
          <tr>
            {headers.map((h, idx) => {
              const widths = ["32%", "24%", "12%", "11%", "14%"];
              return (
                <th
                  key={h.field}
                  role={h.field ? "button" : undefined}
                  onClick={h.field ? () => onSort(h.field) : undefined}
                  style={{ width: widths[idx] }}
                >
                  {h.label}
                  {h.field && <SortIcon field={h.field} params={params} />}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {tenders.map((tender) => {
            const days = daysUntil(tender.closingDate);
            const isUrgent = days !== null && days >= 0 && days <= 3;
            return (
              <tr key={tender.id}>
                <td className="text-truncate">
                  <Link
                    to={`/tenders/${tender.id}`}
                    className="tender-title-link"
                  >
                    {tender.title ?? t("table.untitled")}
                  </Link>
                </td>
                <td className="text-truncate" style={{ color: "var(--pp-text-secondary)", fontSize: ".88rem" }} title={decodeHtml(tender.buyingOrganization) ?? undefined}>
                  {decodeHtml(tender.buyingOrganization) ?? t("table.dash")}
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                  {tender.noticeType && tender.noticeType !== "Not Applicable" && (
                    <span className="pp-badge pp-badge-teal" style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }} title={tender.noticeType}>
                      {tender.noticeType}
                    </span>
                  )}
                </td>
                <td className="text-nowrap" style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                  {formatDate(tender.publicationDate)}
                </td>
                <td className="text-nowrap">
                  {isUrgent ? (
                    <span className="pp-badge pp-badge-red pp-closing-soon">
                      {days === 0 ? t("table.today") : days === 1 ? t("table.tomorrow") : t("table.daysLeft", { count: days })}
                    </span>
                  ) : days !== null && days >= 0 && days <= 7 ? (
                    <span className="pp-badge pp-badge-amber">
                      {t("table.daysLeft", { count: days })}
                    </span>
                  ) : (
                    <span style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                      {formatDate(tender.closingDate)}
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
