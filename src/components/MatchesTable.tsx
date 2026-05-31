import { useState } from "react";
import type { CompanyMatchDto } from "../types/company";
import { categoryLabel } from "../utils/categoryMap";

interface Props {
  matches: CompanyMatchDto[];
  showReason?: boolean;
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

export default function MatchesTable({ matches, showReason, onStatusChange }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("matchedAt");
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
        <h3>No matches yet</h3>
        <p>Run matching to discover tenders that fit your company profile.</p>
      </div>
    );
  }

  return (
    <div className="pp-table-wrap">
      <table className="pp-table">
        <thead>
          <tr>
            <th role="button" onClick={() => toggleSort("matchScore")} style={{ width: "70px" }}>
              Score{sortIcon("matchScore")}
            </th>
            <th style={{ width: "35%" }}>Tender</th>
            <th role="button" onClick={() => toggleSort("organization")} style={{ width: "18%" }}>
              Organization{sortIcon("organization")}
            </th>
            <th style={{ width: "10%" }}>Category</th>
            <th role="button" onClick={() => toggleSort("matchedAt")}>
              Matched{sortIcon("matchedAt")}
            </th>
            <th role="button" onClick={() => toggleSort("closingDate")}>
              Closing{sortIcon("closingDate")}
            </th>
            <th>Status</th>
            <th style={{ width: "70px" }}>Actions</th>
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
                {showReason && m.matchReason && (
                  <div style={{ fontSize: ".78rem", color: "var(--pp-text-muted)", marginTop: ".2rem" }}>
                    {m.matchReason}
                  </div>
                )}
              </td>
              <td style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                {m.buyingOrganization ?? "—"}
              </td>
              <td>
                <span className="pp-badge pp-badge-blue">{categoryLabel(m.procurementCategory)}</span>
              </td>
              <td style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                {new Date(m.matchedAt).toLocaleDateString()}
              </td>
              <td style={{ fontSize: ".85rem", color: "var(--pp-text-secondary)" }}>
                {m.closingDate ? new Date(m.closingDate).toLocaleDateString() : "—"}
              </td>
              <td>
                <span className={`pp-match-status ${m.status}`}>{m.status}</span>
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
                          {s.charAt(0).toUpperCase() + s.slice(1)}
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
