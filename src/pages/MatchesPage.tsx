import { useCallback, useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getMatches,
  getMatchStats,
  updateMatchStatus,
  getProfileById,
} from "../api/companyApi";
import type { CompanyMatchDto, MatchStatsDto } from "../types/company";

const STATUS_FILTERS = ["all", "new", "viewed", "saved", "dismissed"] as const;

function scoreBadge(score: number) {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning text-dark";
  if (score >= 40) return "bg-info text-dark";
  return "bg-secondary";
}

function statusBadge(status: string) {
  switch (status) {
    case "new":
      return "bg-primary";
    case "viewed":
      return "bg-info text-dark";
    case "saved":
      return "bg-success";
    case "dismissed":
      return "bg-secondary";
    default:
      return "bg-light text-dark";
  }
}

export default function MatchesPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const id = Number(companyId);

  const [companyName, setCompanyName] = useState<string>("");
  const [matches, setMatches] = useState<CompanyMatchDto[]>([]);
  const [stats, setStats] = useState<MatchStatsDto | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matchData, statsData, profile] = await Promise.all([
        getMatches(id, filter === "all" ? undefined : filter),
        getMatchStats(id),
        getProfileById(id),
      ]);
      setMatches(matchData);
      setStats(statsData);
      setCompanyName(profile.companyName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [id, filter]);

  useEffect(() => {
    if (!isNaN(id)) loadData();
  }, [id, loadData]);

  async function handleStatusChange(
    matchId: number,
    newStatus: "new" | "viewed" | "saved" | "dismissed"
  ) {
    try {
      await updateMatchStatus(id, matchId, { status: newStatus });
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update match status"
      );
    }
  }

  if (isNaN(id)) {
    return <div className="alert alert-danger">Invalid company ID</div>;
  }

  return (
    <div>
      <div className="d-flex align-items-center mb-3">
        <Link to="/profiles" className="btn btn-outline-secondary btn-sm me-3">
          ← Profiles
        </Link>
        <h2 className="mb-0">
          Matches{companyName ? ` — ${companyName}` : ""}
        </h2>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Stats cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3 col-lg">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="fs-3 fw-bold">{stats.totalMatches}</div>
                <small className="text-muted">Total</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="card text-center border-primary">
              <div className="card-body py-2">
                <div className="fs-3 fw-bold text-primary">
                  {stats.newCount}
                </div>
                <small className="text-muted">New</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="card text-center border-success">
              <div className="card-body py-2">
                <div className="fs-3 fw-bold text-success">
                  {stats.savedCount}
                </div>
                <small className="text-muted">Saved</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="card text-center border-info">
              <div className="card-body py-2">
                <div className="fs-3 fw-bold text-info">
                  {stats.viewedCount}
                </div>
                <small className="text-muted">Viewed</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="card text-center">
              <div className="card-body py-2">
                <div className="fs-3 fw-bold">
                  {stats.averageScore.toFixed(0)}
                </div>
                <small className="text-muted">Avg Score</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3 col-lg">
            <div className="card text-center border-warning">
              <div className="card-body py-2">
                <div className="fs-3 fw-bold text-warning">
                  {stats.highScoreCount}
                </div>
                <small className="text-muted">High (80+)</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="btn-group mb-3">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${
              filter === s ? "btn-dark" : "btn-outline-dark"
            }`}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center text-muted py-5">
          <p className="fs-5">No matches found.</p>
          <p>Run the matching engine to generate matches for this profile.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Score</th>
                <th>Tender</th>
                <th>Organization</th>
                <th>Category</th>
                <th>Closing</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className={`badge ${scoreBadge(m.matchScore)} fs-6`}>
                      {m.matchScore}
                    </span>
                  </td>
                  <td>
                    <div>
                      <Link to={`/tenders/${m.tenderId}`}>
                        {m.tenderTitle ?? m.noticeId ?? `#${m.tenderId}`}
                      </Link>
                    </div>
                    {m.matchReason && (
                      <small className="text-muted d-block mt-1" style={{ maxWidth: 400 }}>
                        {m.matchReason}
                      </small>
                    )}
                  </td>
                  <td>
                    <small>{m.buyingOrganization ?? "—"}</small>
                  </td>
                  <td>
                    <small>{m.procurementCategory ?? "—"}</small>
                  </td>
                  <td>
                    <small>
                      {m.closingDate
                        ? new Date(m.closingDate).toLocaleDateString()
                        : "—"}
                    </small>
                  </td>
                  <td>
                    <span className={`badge ${statusBadge(m.status)}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div
                      className="dropdown"
                      ref={openDropdown === m.id ? dropdownRef : undefined}
                    >
                      <button
                        className="btn btn-sm btn-outline-secondary dropdown-toggle"
                        onClick={() =>
                          setOpenDropdown(openDropdown === m.id ? null : m.id)
                        }
                      >
                        Set Status
                      </button>
                      {openDropdown === m.id && (
                        <ul
                          className="dropdown-menu show"
                          style={{ display: "block" }}
                        >
                          {(
                            ["new", "viewed", "saved", "dismissed"] as const
                          ).map((s) => (
                            <li key={s}>
                              <button
                                className={`dropdown-item ${
                                  m.status === s ? "active" : ""
                                }`}
                                onClick={() => {
                                  setOpenDropdown(null);
                                  handleStatusChange(m.id, s);
                                }}
                              >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
