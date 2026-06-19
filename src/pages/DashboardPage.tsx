import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { searchTenders, getTenderById } from "../api/tenderApi";
import {
  getMyProfile,
  getMyMatches,
  getMyMatchStats,
} from "../api/companyApi";
import type { TenderListDto } from "../types/tender";
import type { CompanyMatchDto, MatchStatsDto, CompanyProfileDto } from "../types/company";
import { getRecentlyViewedIds } from "../utils/recentlyViewed";

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
          cx="22"
          cy="22"
          r={r}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="ring-value">{score}</span>
    </div>
  );
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function closingLabel(dateStr: string | null) {
  const days = daysUntil(dateStr);
  if (days === null) return "No deadline";
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 3) return `${days} days left`;
  if (days <= 7) return `${days} days left`;
  return new Date(dateStr!).toLocaleDateString("en-CA");
}

function closingBadgeClass(dateStr: string | null) {
  const days = daysUntil(dateStr);
  if (days === null) return "pp-badge-gray";
  if (days < 0) return "pp-badge-gray";
  if (days <= 3) return "pp-badge-red pp-closing-soon";
  if (days <= 7) return "pp-badge-amber";
  return "pp-badge-gray";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CompanyProfileDto | null>(null);
  const [stats, setStats] = useState<MatchStatsDto | null>(null);
  const [recentMatches, setRecentMatches] = useState<CompanyMatchDto[]>([]);
  const [closingSoon, setClosingSoon] = useState<TenderListDto[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<TenderListDto[]>([]);
  const [newToday, setNewToday] = useState(0);
  const [closingThisWeek, setClosingThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Load profile if logged in
      let userProfile: CompanyProfileDto | null = null;
      if (user) {
        try {
          userProfile = await getMyProfile();
          setProfile(userProfile);
        } catch { /* no profile yet */ }
      }

      // Fetch closing soon (open tenders, soonest deadline first)
      const closingRes = await searchTenders({
        pageSize: 50,
        sortBy: "closing_date",
        sortDesc: false,
        openOnly: true,
      });
      // Count closing within 7 days
      const now = Date.now();
      const weekMs = 7 * 86400000;
      const closingItems = closingRes.items.filter((t) => {
        if (!t.closingDate) return false;
        const diff = new Date(t.closingDate).getTime() - now;
        return diff >= 0 && diff <= weekMs;
      });
      setClosingThisWeek(closingItems.length);
      setClosingSoon(closingItems.slice(0, 5));

      // Fetch recent tenders to count "new today"
      const recentRes = await searchTenders({
        pageSize: 50,
        sortBy: "pub_date",
        sortDesc: true,
      });
      const todayStr = new Date().toISOString().slice(0, 10);
      setNewToday(
        recentRes.items.filter((t) => t.publicationDate?.startsWith(todayStr)).length
      );

      // Recently viewed (from localStorage)
      const viewedIds = getRecentlyViewedIds(5);
      if (viewedIds.length > 0) {
        const viewedTenders = await Promise.all(
          viewedIds.map((id) =>
            getTenderById(id)
              .then((t) => ({
                id: t.id,
                noticeId: t.noticeId,
                title: t.title,
                procurementCategory: t.procurementCategory,
                buyingOrganization: t.buyingOrganization,
                publicationDate: t.publicationDate,
                closingDate: t.closingDate,
                noticeType: t.noticeType,
                procurementMethod: t.procurementMethod,
                hasDocuments: t.hasDocuments,
              } as TenderListDto))
              .catch(() => null)
          )
        );
        setRecentlyViewed(viewedTenders.filter((t): t is TenderListDto => t !== null));
      }

      // Matches + stats (authenticated with profile)
      if (user) {
        await Promise.allSettled([
          getMyMatchStats().then(setStats).catch(() => null),
          getMyMatches(undefined, 5).then(setRecentMatches).catch(() => []),
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="pp-loader">
        <div className="pp-spinner" />
      </div>
    );
  }

  return (
    <div className="pp-animate-in">
      {/* Hero */}
      <div className="pp-dashboard-hero">
        <h1>
          {user ? `Welcome back, ${user.fullName.split(" ")[0]}` : "Discover Government Procurements"}
        </h1>
        <p>
          {user
            ? "Your procurement intelligence dashboard — new matches, closing deadlines, and opportunities await."
            : "Browse thousands of public tenders from across Canada. Sign in to get personalized matches."}
        </p>
        {!user && (
          <div className="mt-3 d-flex gap-2 flex-wrap">
            <Link to="/register" className="pp-btn pp-btn-primary">
              Get Started Free
            </Link>
            <Link to="/login" className="pp-btn" style={{ color: "rgba(255,255,255,.85)", border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.06)" }}>
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="pp-stats-bar pp-animate-in">
        <span className="pp-stats-bar-item">
          <span className="stat-num blue">{newToday}</span> New today
        </span>
        <span className="pp-stats-bar-item">
          <span className="stat-num amber">{closingThisWeek}</span> Closing this week
        </span>
        {user && stats && stats.newCount > 0 && (
          <>
            <span className="pp-stats-bar-item">
              <span className="stat-num green">{stats.newCount}</span> Recently matched
            </span>
          </>
        )}
      </div>

      {/* No-profile nudge — only for logged-in users who haven't set up a profile yet */}
      {user && !profile && (
        <div className="pp-nudge-banner pp-animate-in">
          <div>
            <strong>🎯 Get personalized tender matches</strong>
            <span>Create your company profile and our AI will surface relevant opportunities automatically, every 6 hours.</span>
          </div>
          <Link to="/my-company" className="pp-btn pp-btn-primary pp-btn-sm" style={{ whiteSpace: "nowrap" }}>
            Set up profile →
          </Link>
        </div>
      )}

      {/* Matches + Closing Soon — side by side */}
      <div className="row g-4 mb-4">
        {/* Recent Matches / CTA (left) */}
        <div className="col-lg-6">
          {!user ? (
            /* Blurred whole-card teaser for unauthenticated users */
            <div style={{ position: "relative", borderRadius: "var(--pp-radius-lg)", overflow: "hidden" }}>
              {/* Blurred card underneath */}
              <div style={{ filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }}>
                <div className="pp-card h-100">
                  <div className="pp-card-header">
                    <span>🎯 Recent Matches</span>
                  </div>
                  <div className="pp-card-body p-0">
                    {[
                      { score: 82, title: "Software Development Services", org: "Public Services and Procurement Canada" },
                      { score: 71, title: "IT Consulting & Advisory Services", org: "Treasury Board of Canada Secretariat" },
                      { score: 65, title: "Cloud Infrastructure Management", org: "Department of National Defence" },
                      { score: 78, title: "Professional Engineering Services", org: "Infrastructure Canada" },
                      { score: 60, title: "Network Security & Cybersecurity Audit", org: "Shared Services Canada" },
                    ].map((row, i) => (
                      <div key={i} className="pp-doc-item">
                        <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                          <ScoreRing score={row.score} />
                          <div style={{ minWidth: 0 }}>
                            <div className="pp-truncate-title">{row.title}</div>
                            <div style={{ fontSize: ".78rem", color: "var(--pp-text-muted)" }}>{row.org}</div>
                          </div>
                        </div>
                        <span className="pp-match-status new">new</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Lock overlay — covers the full card */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "rgba(15,23,42,.55)",
                gap: ".6rem", padding: "1.25rem",
                borderRadius: "var(--pp-radius-lg)",
              }}>
                <span style={{ fontSize: "1.875rem" }}>🔒</span>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "1.15rem", color: "#f1f5f9", textAlign: "center" }}>
                  Unlock personalized matches
                </p>
                <p style={{ margin: 0, fontSize: ".88rem", color: "#f1f5f9", textAlign: "center", maxWidth: 260 }}>
                  Stop manually searching. Get the right tenders delivered to you automatically.
                </p>
                <div className="d-flex gap-2 mt-1">
                  <Link to="/register" className="pp-btn pp-btn-primary pp-btn-sm" style={{ fontSize: "1rem", padding: ".45rem 1rem" }}>Get Started Free</Link>
                  <Link to="/login" className="pp-btn pp-btn-ghost pp-btn-sm" style={{ color: "#f1f5f9", border: "1px solid rgba(255,255,255,.4)", fontSize: "1rem", padding: ".45rem 1rem" }}>Sign In</Link>
                </div>
              </div>
            </div>
          ) : (
          <div className="pp-card h-100 pp-animate-in">
            <div className="pp-card-header">
              <span>🎯 Recent Matches</span>
              {profile && recentMatches.length > 0 && (
                <Link to="/my-company" className="pp-btn pp-btn-ghost pp-btn-sm">
                  View all →
                </Link>
              )}
            </div>
            <div className="pp-card-body p-0">
              {!profile ? (
                <div className="pp-empty-state" style={{ padding: "2rem 1.5rem" }}>
                  <div className="empty-icon">🏢</div>
                  <h3>Set up your company profile</h3>
                  <p>Tell us about your business and we'll find procurement opportunities that match your capabilities.</p>
                  <Link to="/my-company" className="pp-btn pp-btn-primary pp-btn-sm mt-2">
                    Create profile
                  </Link>
                </div>
              ) : recentMatches.length === 0 ? (
                <div className="pp-empty-state" style={{ padding: "2rem 1.5rem" }}>
                  <div className="empty-icon">🔍</div>
                  <h3>No matches yet</h3>
                  <p>Run matching from your company page to discover relevant tenders.</p>
                  <Link to="/my-company" className="pp-btn pp-btn-primary pp-btn-sm mt-2">
                    Run matching
                  </Link>
                </div>
              ) : (
                recentMatches.map((m) => (
                  <Link
                    key={m.id}
                    to={`/tenders/${m.tenderId}`}
                    className="pp-doc-item"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                      <ScoreRing score={m.matchScore} />
                      <div style={{ minWidth: 0 }}>
                        <div className="pp-truncate-title">
                          {m.tenderTitle ?? `#${m.tenderId}`}
                        </div>
                        <div style={{ fontSize: ".78rem", color: "var(--pp-text-muted)" }}>
                          {m.buyingOrganization ?? "—"}
                        </div>
                      </div>
                    </div>
                    <span className={`pp-match-status ${m.status}`}>{m.status}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
          )} {/* end !user ternary */}
        </div>

        {/* Closing Soon (right) */}
        <div className="col-lg-6">
          <div className="pp-card h-100 pp-animate-in">
            <div className="pp-card-header">
              <span>⏰ Closing Soon</span>
              <Link to="/tenders" className="pp-btn pp-btn-ghost pp-btn-sm">
                View all →
              </Link>
            </div>
            <div className="pp-card-body p-0">
              {closingSoon.length === 0 ? (
                <div className="pp-empty-state" style={{ padding: "2rem 1.5rem" }}>
                  <div className="empty-icon">✅</div>
                  <h3>No urgent deadlines</h3>
                  <p>No tenders closing within the next 7 days.</p>
                </div>
              ) : (
                closingSoon.map((t) => (
                  <Link
                    key={t.id}
                    to={`/tenders/${t.id}`}
                    className="pp-doc-item"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                      <div
                        className="doc-icon"
                        style={{
                          background: "var(--pp-urgent-light)",
                          color: "var(--pp-urgent)",
                        }}
                      >
                        📋
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="pp-truncate-title">
                          {t.title ?? "Untitled"}
                        </div>
                        <div style={{ fontSize: ".78rem", color: "var(--pp-text-muted)" }}>
                          {t.buyingOrganization ?? "—"}
                        </div>
                      </div>
                    </div>
                    <span className={`pp-badge ${closingBadgeClass(t.closingDate)}`}>
                      {closingLabel(t.closingDate)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recently Viewed */}
      <div className="pp-card mt-2 pp-animate-in">
        <div className="pp-card-header">
          <span>🕑 Recently Viewed</span>
          <Link to="/tenders" className="pp-btn pp-btn-ghost pp-btn-sm">
            Browse all →
          </Link>
        </div>
        <div className="pp-card-body p-0">
          {recentlyViewed.length === 0 ? (
            <div className="pp-empty-state" style={{ padding: "2rem 1.5rem" }}>
              <div className="empty-icon">👀</div>
              <h3>No tenders viewed yet</h3>
              <p>Tenders you open will appear here so you can pick up where you left off.</p>
              <Link to="/tenders" className="pp-btn pp-btn-primary pp-btn-sm mt-2">
                Browse tenders
              </Link>
            </div>
          ) : (
            recentlyViewed.map((t) => (
              <Link
                key={t.id}
                to={`/tenders/${t.id}`}
                className="pp-doc-item"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                  <div
                    className="doc-icon"
                    style={{
                      background: "rgba(99,102,241,.1)",
                      color: "#818cf8",
                    }}
                  >
                    📄
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="pp-truncate-title">
                      {t.title ?? "Untitled"}
                    </div>
                    <div style={{ fontSize: ".78rem", color: "var(--pp-text-muted)" }}>
                      {t.buyingOrganization ?? "—"}
                    </div>
                  </div>
                </div>
                <span className={`pp-badge ${closingBadgeClass(t.closingDate)}`}>
                  {closingLabel(t.closingDate)}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
