import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTenderById } from "../api/tenderApi";
import type { TenderDetailDto } from "../types/tender";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tender, setTender] = useState<TenderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTenderById(Number(id))
      .then(setTender)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load tender")
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
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

  return (
    <>
      <Link to="/" className="btn btn-outline-secondary btn-sm mb-3">
        ← Back to list
      </Link>

      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-start">
          <div>
            <h4 className="card-title mb-1">{tender.title}</h4>
            {tender.noticeId && (
              <span className="text-muted">{tender.noticeId}</span>
            )}
          </div>
          {tender.noticeType && (
            <span className="badge bg-info text-dark fs-6">
              {tender.noticeType}
            </span>
          )}
        </div>
        <div className="card-body">
          {tender.description && (
            <div className="mb-3">
              <h6 className="fw-semibold">Description</h6>
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{tender.description}</p>
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-6">
              <dl className="mb-0">
                <dt>Buying Organization</dt>
                <dd>{tender.buyingOrganization ?? "—"}</dd>

                <dt>Procurement Category</dt>
                <dd>{tender.procurementCategory ?? "—"}</dd>

                <dt>Procurement Method</dt>
                <dd>{tender.procurementMethod ?? "—"}</dd>

                <dt>Selection Criteria</dt>
                <dd>{tender.selectionCriteria ?? "—"}</dd>
              </dl>
            </div>
            <div className="col-md-6">
              <dl className="mb-0">
                <dt>Publication Date</dt>
                <dd>{formatDate(tender.publicationDate)}</dd>

                <dt>Closing Date</dt>
                <dd>{formatDate(tender.closingDate)}</dd>

                {tender.unspsc && tender.unspsc.length > 0 && (
                  <>
                    <dt>UNSPSC Codes</dt>
                    <dd>
                      {tender.unspsc.map((code) => (
                        <span key={code} className="badge bg-secondary me-1">
                          {code}
                        </span>
                      ))}
                    </dd>
                  </>
                )}

                {tender.gsin && tender.gsin.length > 0 && (
                  <>
                    <dt>GSIN Codes</dt>
                    <dd>
                      {tender.gsin.map((code) => (
                        <span key={code} className="badge bg-secondary me-1">
                          {code}
                        </span>
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="mt-3 d-flex gap-2">
            {tender.noticeLink && (
              <a
                href={tender.noticeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                View Original Notice
              </a>
            )}
            {tender.externalLink && (
              <a
                href={tender.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-primary btn-sm"
              >
                External Link
              </a>
            )}
          </div>
        </div>
      </div>

      {(tender.contactName || tender.contactEmail || tender.contactPhone) && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">Contact Information</h5>
          </div>
          <div className="card-body">
            <dl className="mb-0 row">
              {tender.contactName && (
                <>
                  <dt className="col-sm-3">Contact Name</dt>
                  <dd className="col-sm-9">{tender.contactName}</dd>
                </>
              )}
              {tender.contactEmail && (
                <>
                  <dt className="col-sm-3">Email</dt>
                  <dd className="col-sm-9">
                    <a href={`mailto:${tender.contactEmail}`}>{tender.contactEmail}</a>
                  </dd>
                </>
              )}
              {tender.contactPhone && (
                <>
                  <dt className="col-sm-3">Phone</dt>
                  <dd className="col-sm-9">
                    <a href={`tel:${tender.contactPhone}`}>{tender.contactPhone}</a>
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>
      )}

      {tender.documents.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">
              Documents ({tender.documents.length})
            </h5>
          </div>
          <ul className="list-group list-group-flush">
            {tender.documents.map((doc) => (
              <li
                key={doc.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <span className="fw-semibold">{doc.title ?? "Untitled"}</span>
                  {doc.type && (
                    <span className="badge bg-light text-dark ms-2">
                      {doc.type}
                    </span>
                  )}
                  {doc.language && (
                    <span className="badge bg-light text-dark ms-1">
                      {doc.language}
                    </span>
                  )}
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
