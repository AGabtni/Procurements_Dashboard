import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { CompanyMatchDto } from "../types/company";
import { categoryLabel } from "../utils/categoryMap";
import { decodeHtml } from "../utils/html";

export type SortCol = "matchScore" | "matchedAt" | "closingDate" | "organization";

interface Props {
  matches: CompanyMatchDto[];
  showReason?: boolean;
  // Admin view: show English and French reasons side by side instead of the
  // single locale-resolved reason.
  bilingualReason?: boolean;
  onStatusChange: (matchId: number, status: "new" | "viewed" | "saved" | "dismissed") => void;
  onAutoView?: (matchId: number) => void;
  sortCol: SortCol;
  sortDir: "asc" | "desc";
  onSort: (col: SortCol) => void;
}

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

export default function MatchesTable({ matches, showReason, bilingualReason, onStatusChange, onAutoView, sortCol, sortDir, onSort }: Props) {
  const { t, i18n } = useTranslation("tenders");

  const sortIcon = (col: SortCol) =>
    sortCol === col
      ? <span className="ms-1">{sortDir === "asc" ? "▲" : "▼"}</span>
      : <span className="ms-1" style={{ opacity: 0.3 }}>⇅</span>;

  function handleThumb(m: CompanyMatchDto, dir: "up" | "down") {
    const undoTarget = m.viewedAt !== null ? "viewed" : "new";
    if (dir === "up") {
      onStatusChange(m.id, m.status === "saved" ? undoTarget : "saved");
    } else {
      onStatusChange(m.id, m.status === "dismissed" ? undoTarget : "dismissed");
    }
  }

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
            <th role="button" onClick={() => onSort("matchScore")} style={{ width: "70px" }}>
              {t("matchesTable.headers.score")}{sortIcon("matchScore")}
            </th>
            <th style={{ width: "35%" }}>{t("matchesTable.headers.tender")}</th>
            <th role="button" onClick={() => onSort("organization")} style={{ width: "18%" }}>
              {t("matchesTable.headers.organization")}{sortIcon("organization")}
            </th>
            <th style={{ width: "10%" }}>{t("matchesTable.headers.category")}</th>
            <th role="button" onClick={() => onSort("matchedAt")}>
              {t("matchesTable.headers.matched")}{sortIcon("matchedAt")}
            </th>
            <th role="button" onClick={() => onSort("closingDate")}>
              {t("matchesTable.headers.closing")}{sortIcon("closingDate")}
            </th>
            <th style={{ width: "80px" }}>{t("matchesTable.headers.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const rowClass =
              m.viewedAt === null ? "match-row-new" :
              m.status === "dismissed" ? "match-row-dismissed" : "";
            return (
              <tr key={m.id} className={rowClass}>
                <td>
                  <ScoreRing score={m.matchScore} />
                </td>
                <td>
                  <Link
                    to={`/tenders/${m.tenderId}`}
                    className="tender-title-link"
                    onClick={() => {
                      if (m.viewedAt === null) onAutoView?.(m.id);
                    }}
                  >
                    {m.tenderTitle ?? m.noticeId ?? `#${m.tenderId}`}
                  </Link>
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
                <td style={{ overflow: "visible" }}>
                  <div className="pp-thumb-wrap">
                    <button
                      className={`pp-thumb-btn${m.status === "saved" ? " active-up" : ""}`}
                      data-tooltip={m.status === "saved" ? t("matchesTable.thumbs.undoSave") : t("matchesTable.thumbs.save")}
                      aria-label={m.status === "saved" ? t("matchesTable.thumbs.undoSave") : t("matchesTable.thumbs.save")}
                      onClick={() => handleThumb(m, "up")}
                    >
                      👍
                    </button>
                    <button
                      className={`pp-thumb-btn${m.status === "dismissed" ? " active-down" : ""}`}
                      data-tooltip={m.status === "dismissed" ? t("matchesTable.thumbs.undoDismiss") : t("matchesTable.thumbs.dismiss")}
                      aria-label={m.status === "dismissed" ? t("matchesTable.thumbs.undoDismiss") : t("matchesTable.thumbs.dismiss")}
                      onClick={() => handleThumb(m, "down")}
                    >
                      👎
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
