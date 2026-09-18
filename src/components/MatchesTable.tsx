import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CompanyMatchDto } from "../types/company";
import { categoryLabel } from "../utils/categoryMap";
import { decodeHtml } from "../utils/html";

interface Props {
  matches: CompanyMatchDto[];
  showReason?: boolean;
  // Admin view: show English and French reasons side by side instead of the
  // single locale-resolved reason.
  bilingualReason?: boolean;
  onStatusChange: (matchId: number, status: "new" | "viewed" | "saved" | "dismissed") => void;
}

type SortCol = "matchScore" | "matchedAt" | "closingDate" | "organization";

function ScoreRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const cls = score >= 70 ? "high" : score >= 55 ? "mid" : "low";
  return (
    <div className="pp-score-ring">
      <svg viewBox="0 0 44 44">
        <circle className="ring-bg" cx="22" cy="22" r={r} />
        <circle
          className={`ring-fill ${cls}`}
          cx="22" cy="22" r={r}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="ring-value">{score}</span>
    </div>
  );
}

export default function MatchesTable({ matches, showReason, bilingualReason, onStatusChange }: Props) {
  const { t, i18n } = useTranslation("tenders");
  const [sortCol, setSortCol] = useState<SortCol>("matchScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  }

  const sortIcon = (col: SortCol) =>
    sortCol === col
      ? <span className="ms-1">{sortDir === "asc" ? "▲" : "▼"}</span>
      : <span className="ms-1" style={{ opacity: 0.3 }}>⇅</span>;

  const sorted = [...matches].sort((a, b) => {
    let cmp: number;
    if (sortCol === "matchScore") cmp = a.matchScore - b.matchScore;
    else if (sortCol === "organization")
      cmp = (a.buyingOrganization ?? "").trim().localeCompare(
        (b.buyingOrganization ?? "").trim(),
        "en",
        { sensitivity: "base" }
      ); else {
      const aVal = sortCol === "matchedAt" ? a.matchedAt : (a.closingDate ?? "");
      const bVal = sortCol === "matchedAt" ? b.matchedAt : (b.closingDate ?? "");
      cmp = aVal.localeCompare(bVal);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (matches.length === 0) {
    return (
      <div className="pp-empty-state">
        <div className="empty-icon">🎯</div>
        <h3>{t("matchesTable.emptyTitle")}</h3>
        <p>{t("matchesTable.emptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="pp-table-wrap">
      <table className="pp-table">
        <thead>
          <tr>
            <th role="button" onClick={() => toggleSort("matchScore")} style={{ width: "70px" }}>
              {t("matchesTable.headers.score")}{sortIcon("matchScore")}
            </th>
            <th style={{ width: "35%" }}>{t("matchesTable.headers.tender")}</th>
            <th role="button" onClick={() => toggleSort("organization")} style={{ width: "18%" }}>
              {t("matchesTable.headers.organization")}{sortIcon("organization")}
            </th>
            <th style={{ width: "10%" }}>{t("matchesTable.headers.category")}</th>
            <th role="button" onClick={() => toggleSort("matchedAt")}>
              {t("matchesTable.headers.matched")}{sortIcon("matchedAt")}
            </th>
            <th role="button" onClick={() => toggleSort("closingDate")}>
              {t("matchesTable.headers.closing")}{sortIcon("closingDate")}
            </th>
            <th>{t("matchesTable.headers.status")}</th>
            <th style={{ width: "70px" }}>{t("matchesTable.headers.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.id}>
              <td>
                <ScoreRing score={m.matchScore} />
              </td>
              <td>
                <a href={`/tenders/${m.tenderId}`} className="tender-title-link">
                  {m.tenderTitle ?? m.noticeId ?? `#${m.tenderId}`}
                </a>
                {showReason && bilingualReason ? (
                  <>
                    {m.matchReasonEn && (
                      <div style={{ fontSize: ".78rem", color: "var(--pp-text-muted)", marginTop: ".2rem" }}>
                        <strong>EN:</strong> {m.matchReasonEn}
                      </div>
                    )}
                    {m.matchReasonFr && (
                      <div style={{ fontSize: ".78rem", color: "var(--pp-text-muted)", marginTop: ".2rem" }}>
                        <strong>FR:</strong> {m.matchReasonFr}
                      </div>
                    )}
                  </>
                ) : showReason && m.matchReason && (
                  <div style={{ fontSize: ".78rem", color: "var(--pp-text-muted)", marginTop: ".2rem" }}>
                    {m.matchReason}
                  </div>
                )}
              </td>
              <td style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                {decodeHtml(m.buyingOrganization) ?? "—"}
              </td>
              <td>
                <span className="pp-badge pp-badge-blue">{categoryLabel(m.procurementCategory)}</span>
              </td>
              <td style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                {new Date(m.matchedAt).toLocaleDateString(i18n.language)}
              </td>
              <td style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                {m.closingDate ? new Date(m.closingDate).toLocaleDateString(i18n.language) : "—"}
              </td>
              <td>
                <span className={`pp-match-status ${m.status}`}>{t(`matchesTable.statuses.${m.status}`)}</span>
              </td>
              <td>
                <div className="dropdown">
                  <button className="pp-btn pp-btn-ghost pp-btn-sm" data-bs-toggle="dropdown">
                    ⋯
                  </button>
                  <ul className="dropdown-menu">
                    {(["new", "viewed", "saved", "dismissed"] as const).map((s) => (
                      <li key={s}>
                        <button className="dropdown-item" onClick={() => onStatusChange(m.id, s)}>
                          {t(`matchesTable.statuses.${s}`)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
