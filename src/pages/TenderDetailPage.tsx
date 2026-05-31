import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTenderById } from "../api/tenderApi";
import type { TenderDetailDto } from "../types/tender";
import { categoryLabel } from "../utils/categoryMap";
import { recordView } from "../utils/recentlyViewed";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fullUrl(link: string): string {
  if (link.startsWith("http://") || link.startsWith("https://")) return link;
  return `https://canadabuys.canada.ca${link.startsWith("/") ? "" : "/"}${link}`;
}

export default function TenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tender, setTender] = useState<TenderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTenderById(Number(id))
      .then((t) => {
        setTender(t);
        recordView(t.id);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load tender")
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="pp-loader">
        <div className="pp-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="alert alert-warning">Tender not found.</div>
    );
  }

  const daysLeft = tender.closingDate
    ? Math.ceil((new Date(tender.closingDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="pp-animate-in">
      <button
        className="pp-btn pp-btn-ghost pp-btn-sm mb-3"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      {/* Header */}
      <div className="pp-detail-header">
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div style={{ minWidth: 0 }}>
            <h2>{tender.title}</h2>
            {tender.noticeId && (
              <span style={{ fontSize: ".85rem", color: "var(--pp-text-muted)" }}>
                {tender.noticeId}
              </span>
            )}
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            {tender.noticeType && (
              <span className="pp-badge pp-badge-teal">{tender.noticeType}</span>
            )}
            {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (
              <span className={`pp-badge ${daysLeft <= 3 ? "pp-badge-red pp-closing-soon" : "pp-badge-amber"}`}>
                {daysLeft === 0 ? "Closes today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d left`}
              </span>
            )}
          </div>
        </div>
        <div className="pp-detail-meta">
          <div className="pp-detail-meta-item">
            <span className="icon">🏢</span>
            {tender.buyingOrganization ?? "—"}
          </div>
          <div className="pp-detail-meta-item">
            <span className="icon">📂</span>
            {categoryLabel(tender.procurementCategory)}
          </div>
          <div className="pp-detail-meta-item">
            <span className="icon">📅</span>
            Published {formatDate(tender.publicationDate)}
          </div>
          <div className="pp-detail-meta-item">
            <span className="icon">⏰</span>
            Closing {formatDate(tender.closingDate)}
          </div>
        </div>
        <div className="mt-3 d-flex gap-2">
          {tender.noticeLink && (
            <a
              href={fullUrl(tender.noticeLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="pp-btn pp-btn-primary pp-btn-sm"
            >
              View Original Notice →
            </a>
          )}
          {tender.externalLink && (
            <a
              href={fullUrl(tender.externalLink)}
              target="_blank"
              rel="noopener noreferrer"
              className="pp-btn pp-btn-ghost pp-btn-sm"
            >
              External Link
            </a>
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* Main Column */}
        <div className="col-lg-8">
          {/* Description */}
          {tender.description && (
            <div className="pp-detail-section pp-animate-in">
              <div className="pp-detail-section-header">
                📝 Description
              </div>
              <div className="pp-detail-section-body">
                <p style={{ whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.7, color: "var(--pp-text-secondary)" }}>
                  {tender.description}
                </p>
              </div>
            </div>
          )}

          {/* Documents */}
          {tender.documents.length > 0 && (
            <div className="pp-detail-section pp-animate-in">
              <div className="pp-detail-section-header">
                📎 Documents
                <span className="pp-badge pp-badge-blue ms-2">{tender.documents.length}</span>
              </div>
              <div style={{ padding: 0 }}>
                {tender.documents.map((doc) => (
                  <div key={doc.id} className="pp-doc-item">
                    <div className="d-flex align-items-center">
                      <div className="doc-icon">📄</div>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{doc.title ?? "Untitled"}</span>
                        {doc.type && (
                          <span className="pp-badge pp-badge-gray ms-2">{doc.type}</span>
                        )}
                        {doc.language && (
                          <span className="pp-badge pp-badge-gray ms-1">{doc.language}</span>
                        )}
                      </div>
                    </div>
                    {doc.url && (
                      <a
                        href={fullUrl(doc.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pp-btn pp-btn-ghost pp-btn-sm"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Details */}
          <div className="pp-detail-section pp-animate-in">
            <div className="pp-detail-section-header">ℹ️ Details</div>
            <div className="pp-detail-section-body">
              <dl style={{ fontSize: ".9rem" }} className="mb-0">
                <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Procurement Method</dt>
                <dd className="mb-3">{tender.procurementMethod ?? "—"}</dd>

                <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Selection Criteria</dt>
                <dd className="mb-3">{tender.selectionCriteria ?? "—"}</dd>

                {tender.regionOfDelivery && (
                  <>
                    <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Region of Delivery</dt>
                    <dd className="mb-3">{tender.regionOfDelivery}</dd>
                  </>
                )}

                {tender.regionOfOpportunity && (
                  <>
                    <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Region of Opportunity</dt>
                    <dd className="mb-3">{tender.regionOfOpportunity}</dd>
                  </>
                )}

                {tender.unspsc && tender.unspsc.length > 0 && (
                  <>
                    <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>UNSPSC Codes</dt>
                    <dd className="mb-3 d-flex flex-wrap gap-1">
                      {tender.unspsc.map((code) => (
                        <span key={code} className="pp-badge pp-badge-gray">{code}</span>
                      ))}
                    </dd>
                  </>
                )}

                {tender.gsin && tender.gsin.length > 0 && (
                  <>
                    <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>GSIN Codes</dt>
                    <dd className="mb-0 d-flex flex-wrap gap-1">
                      {tender.gsin.map((code) => (
                        <span key={code} className="pp-badge pp-badge-gray">{code}</span>
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          {/* Contact */}
          {(tender.contactName || tender.contactEmail || tender.contactPhone) && (
            <div className="pp-detail-section pp-animate-in">
              <div className="pp-detail-section-header">📞 Contact</div>
              <div className="pp-detail-section-body">
                <dl style={{ fontSize: ".9rem" }} className="mb-0">
                  {tender.contactName && (
                    <>
                      <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Name</dt>
                      <dd className="mb-2">{tender.contactName}</dd>
                    </>
                  )}
                  {tender.contactEmail && (
                    <>
                      <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Email</dt>
                      <dd className="mb-2">
                        <a href={`mailto:${tender.contactEmail}`}>{tender.contactEmail}</a>
                      </dd>
                    </>
                  )}
                  {tender.contactPhone && (
                    <>
                      <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Phone</dt>
                      <dd className="mb-0">
                        <a href={`tel:${tender.contactPhone}`}>{tender.contactPhone}</a>
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
