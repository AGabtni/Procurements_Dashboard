import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { getTenderById } from "../api/tenderApi";
import type { TenderDetailDto } from "../types/tender";
import { categoryLabel } from "../utils/categoryMap";
import { recordView } from "../utils/recentlyViewed";

// Convert LLM title-case headings ("Scope Of Work") to sentence case ("Scope of work")
const toSentenceCase = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

// Custom heading components so every ## heading renders in sentence case
const mdComponents: Components = {
  h1: ({ children }) => <h1>{toSentenceCase(String(children))}</h1>,
  h2: ({ children }) => <h2>{toSentenceCase(String(children))}</h2>,
  h3: ({ children }) => <h3>{toSentenceCase(String(children))}</h3>,
  h4: ({ children }) => <h4>{toSentenceCase(String(children))}</h4>,
};

// Convert inline • bullet characters (used by SEAO) into proper Markdown list items.
// Operates block-by-block so existing ## headings are untouched.
function normalizeBullets(text: string): string {
  if (!text.includes("•")) return text;
  return text
    .split(/\n\n+/)
    .map((block) => {
      if (!block.includes("•")) return block;
      const parts = block.split(/\s*•\s*/).map((p) => p.trim()).filter(Boolean);
      if (parts.length <= 1) return block;
      const lines: string[] = [];
      if (parts[0]) lines.push(parts[0]);
      lines.push("");
      for (let i = 1; i < parts.length; i++) {
        if (parts[i]) lines.push(`- ${parts[i]}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5009";

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
  if (link.startsWith("/api/") || link.startsWith("api/")) {
    return `${API_BASE}${link.startsWith("/") ? "" : "/"}${link}`;
  }
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

  const contactNames = tender.contactName
    ? tender.contactName.split(" | ").map((s) => s.trim()).filter(Boolean)
    : [];
  const contactEmails = tender.contactEmail
    ? tender.contactEmail.split(/,\s*/).map((s) => s.trim()).filter(Boolean)
    : [];
  const contactPhones = tender.contactPhone
    ? tender.contactPhone.split(" | ").map((s) => s.trim()).filter(Boolean)
    : [];
  const contactCount = Math.max(contactNames.length, contactEmails.length, contactPhones.length);
  const hasContacts = contactCount > 0;

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
          {(tender.descriptionMd || tender.description) && (
            <div className="pp-detail-section pp-animate-in">
              <div className="pp-detail-section-header">
                📝 Description
              </div>
              <div className="pp-detail-section-body">
                {tender.descriptionMd ? (
                  <div className="pp-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {tender.descriptionMd}
                    </ReactMarkdown>
                  </div>
                ) : (
                  // Plain-text fallback: split on blank lines → paragraphs,
                  // collapse in-line newlines (from scraped mid-sentence breaks)
                  <div style={{ color: "var(--pp-text-secondary)", lineHeight: 1.7 }}>
                    {tender.description!
                      .split(/\n\n+/)
                      .map((para) => para.trim().replace(/\n/g, " "))
                      .filter(Boolean)
                      .map((para, i) => (
                        <p key={i} style={{ margin: "0 0 .75rem" }}>{para}</p>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selection Criteria */}
          {tender.selectionCriteria && (
            <div className="pp-detail-section pp-animate-in">
              <div className="pp-detail-section-header">🎯 Selection Criteria</div>
              <div className="pp-detail-section-body">
                <div className="pp-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {normalizeBullets(tender.selectionCriteria)}
                  </ReactMarkdown>
                </div>
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
          {hasContacts && (
            <div className="pp-detail-section pp-animate-in">
              <div className="pp-detail-section-header">
                📞 Contact{contactCount > 1 ? "s" : ""}
                {contactCount > 1 && (
                  <span className="pp-badge pp-badge-blue ms-2">{contactCount}</span>
                )}
              </div>
              <div className="pp-detail-section-body">
                {contactCount <= 1 ? (
                  <dl style={{ fontSize: ".9rem" }} className="mb-0">
                    {contactNames[0] && (
                      <>
                        <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Name</dt>
                        <dd className="mb-2">{contactNames[0]}</dd>
                      </>
                    )}
                    {contactEmails[0] && (
                      <>
                        <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Email</dt>
                        <dd className="mb-2">
                          <a href={`mailto:${contactEmails[0]}`}>{contactEmails[0]}</a>
                        </dd>
                      </>
                    )}
                    {contactPhones[0] && (
                      <>
                        <dt style={{ color: "var(--pp-text-muted)", fontWeight: 500, fontSize: ".8rem" }}>Phone</dt>
                        <dd className="mb-0">
                          <a href={`tel:${contactPhones[0]}`}>{contactPhones[0]}</a>
                        </dd>
                      </>
                    )}
                  </dl>
                ) : (
                  <div className="d-flex flex-column gap-3" style={{ fontSize: ".9rem" }}>
                    {Array.from({ length: contactCount }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          borderLeft: "2px solid var(--pp-border)",
                          paddingLeft: "12px",
                        }}
                      >
                        {contactNames[i] && (
                          <div style={{ fontWeight: 600 }}>{contactNames[i]}</div>
                        )}
                        {contactEmails[i] && (
                          <div style={{ marginTop: "2px" }}>
                            <a href={`mailto:${contactEmails[i]}`}>{contactEmails[i]}</a>
                          </div>
                        )}
                        {contactPhones[i] && (
                          <div style={{ marginTop: "2px", color: "var(--pp-text-secondary)" }}>
                            <a href={`tel:${contactPhones[i]}`}>{contactPhones[i]}</a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
