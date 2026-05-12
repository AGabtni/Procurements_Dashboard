import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getMatches,
  getMatchStats,
  updateMatchStatus,
  getProfileById,
} from "../api/companyApi";
import type { CompanyMatchDto, MatchStatsDto } from "../types/company";
import MatchesTable from "../components/MatchesTable";

const STATUS_FILTERS = ["all", "new", "viewed", "saved", "dismissed"] as const;

export default function MatchesPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const id = Number(companyId);

  const [companyName, setCompanyName] = useState<string>("");
  const [matches, setMatches] = useState<CompanyMatchDto[]>([]);
  const [stats, setStats] = useState<MatchStatsDto | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <MatchesTable matches={matches} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
