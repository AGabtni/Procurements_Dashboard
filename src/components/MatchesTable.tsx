import { useState } from "react";
import type { CompanyMatchDto } from "../types/company";
import { categoryLabel } from "../utils/categoryMap";

interface Props {
  matches: CompanyMatchDto[];
  showReason?: boolean;
  onStatusChange: (matchId: number, status: "new" | "viewed" | "saved" | "dismissed") => void;
}

type SortCol = "matchScore" | "matchedAt" | "closingDate";

function scoreBadge(score: number) {
  if (score >= 70) return "bg-success";
  if (score >= 55) return "bg-warning text-dark";
  return "bg-secondary";
}

function statusBadge(status: string) {
  switch (status) {
    case "new": return "bg-primary";
    case "saved": return "bg-success";
    case "viewed": return "bg-info";
    default: return "bg-secondary";
  }
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
    else {
      const aVal = sortCol === "matchedAt" ? a.matchedAt : (a.closingDate ?? "");
      const bVal = sortCol === "matchedAt" ? b.matchedAt : (b.closingDate ?? "");
      cmp = aVal.localeCompare(bVal);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th role="button" onClick={() => toggleSort("matchScore")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              Score{sortIcon("matchScore")}
            </th>
            <th style={{ width: "35%" }}>Tender</th>
            <th style={{ width: "20%" }}>Organization</th>
            <th style={{ width: "10%" }}>Category</th>
            <th role="button" onClick={() => toggleSort("matchedAt")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              Matched{sortIcon("matchedAt")}
            </th>
            <th role="button" onClick={() => toggleSort("closingDate")} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
              Closing{sortIcon("closingDate")}
            </th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.id}>
              <td>
                <span className={`badge ${scoreBadge(m.matchScore)}`}>{m.matchScore}</span>
              </td>
              <td>
                <a href={`/tenders/${m.tenderId}`}>{m.tenderTitle ?? m.noticeId ?? `#${m.tenderId}`}</a>
                {showReason && m.matchReason && (
                  <div className="text-muted small">{m.matchReason}</div>
                )}
              </td>
              <td className="small">{m.buyingOrganization ?? "—"}</td>
              <td className="small">{categoryLabel(m.procurementCategory)}</td>
              <td className="small">{new Date(m.matchedAt).toLocaleDateString()}</td>
              <td className="small">{m.closingDate ? new Date(m.closingDate).toLocaleDateString() : "—"}</td>
              <td>
                <span className={`badge ${statusBadge(m.status)}`}>{m.status}</span>
              </td>
              <td>
                <div className="dropdown">
                  <button className="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">Set</button>
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
