import { STRIPE_PAYMENT_URL } from "../config";
import { useAuth } from "../context/AuthContext";

// Tag the Stripe payment with identifiers that tie it back to the account:
//  - prefilled_email: fills the (human-readable) checkout email with their login email
//  - client_reference_id: non-editable company id, surfaced in the Dashboard + future webhook
// Both are plain query params — no Stripe payment-link configuration required.
function paymentUrl(email: string | undefined, companyId: number | null | undefined): string {
  if (!/^https?:\/\//.test(STRIPE_PAYMENT_URL)) return STRIPE_PAYMENT_URL; // mailto fallback untouched
  const params = new URLSearchParams();
  if (email) params.set("prefilled_email", email);
  if (companyId != null) params.set("client_reference_id", String(companyId));
  const qs = params.toString();
  if (!qs) return STRIPE_PAYMENT_URL;
  const sep = STRIPE_PAYMENT_URL.includes("?") ? "&" : "?";
  return `${STRIPE_PAYMENT_URL}${sep}${qs}`;
}

interface Props {
  /** Real count of new matches, shown as the teaser hook. */
  newCount: number;
  /** Optional company name for a personalized headline. */
  companyName?: string | null;
  /** Fills the parent card body (dashboard) vs. standalone block (matches tab). */
  variant?: "card" | "block";
}

const PLACEHOLDER_ROWS = [
  { score: 82, w: "70%" },
  { score: 74, w: "55%" },
  { score: 68, w: "62%" },
  { score: 66, w: "48%" },
  { score: 63, w: "58%" },
];

/**
 * Locked teaser for expired trials. Shows the real new-match count over blurred
 * placeholder rows — no real tender data reaches this component (the API strips it).
 */
export default function LockedMatches({ newCount, companyName, variant = "block" }: Props) {
  const { user } = useAuth();
  const headline =
    newCount > 0
      ? `${newCount} new match${newCount !== 1 ? "es" : ""}${companyName ? ` for ${companyName}` : ""}`
      : "Your trial has ended";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "var(--pp-radius-lg)",
        overflow: "hidden",
        minHeight: variant === "card" ? undefined : 320,
      }}
    >
      {/* Blurred placeholder rows underneath */}
      <div style={{ filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }}>
        {PLACEHOLDER_ROWS.map((row, i) => (
          <div key={i} className="pp-doc-item">
            <div className="d-flex align-items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
              <div className="pp-score-ring">
                <svg viewBox="0 0 44 44">
                  <circle className="ring-bg" cx="22" cy="22" r={18} />
                </svg>
                <span className="ring-value">{row.score}</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ height: 12, width: row.w, background: "var(--pp-border,#334155)", borderRadius: 4, marginBottom: 6 }} />
                <div style={{ height: 10, width: "40%", background: "var(--pp-border,#334155)", borderRadius: 4, opacity: 0.6 }} />
              </div>
            </div>
            <span className="pp-match-status new">new</span>
          </div>
        ))}
      </div>

      {/* Lock overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(15,23,42,.62)",
          gap: ".6rem",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "1.875rem" }}>🔒</span>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1.25rem", color: "#f1f5f9" }}>
          {headline}
        </p>
        <p style={{ margin: 0, fontSize: ".9rem", color: "#e2e8f0", maxWidth: 340 }}>
          Your free trial has ended. Subscribe to unlock your matches and keep receiving new tender opportunities.
        </p>
        <a
          href={paymentUrl(user?.email, user?.companyId)}
          className="pp-btn pp-btn-primary mt-1"
          style={{ fontSize: "1rem", padding: ".5rem 1.25rem" }}
        >
          Subscribe to unlock →
        </a>
      </div>
    </div>
  );
}
