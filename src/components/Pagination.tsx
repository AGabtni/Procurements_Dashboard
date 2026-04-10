interface Props {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
}: Props) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <span className="text-muted small">
        {totalCount} tender{totalCount !== 1 && "s"} found
      </span>
      <nav>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              «
            </button>
          </li>
          {start > 1 && (
            <>
              <li className="page-item">
                <button className="page-link" onClick={() => onPageChange(1)}>
                  1
                </button>
              </li>
              {start > 2 && (
                <li className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              )}
            </>
          )}
          {pages.map((p) => (
            <li
              key={p}
              className={`page-item ${p === page ? "active" : ""}`}
            >
              <button className="page-link" onClick={() => onPageChange(p)}>
                {p}
              </button>
            </li>
          ))}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && (
                <li className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              )}
              <li className="page-item">
                <button
                  className="page-link"
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </button>
              </li>
            </>
          )}
          <li
            className={`page-item ${page >= totalPages ? "disabled" : ""}`}
          >
            <button
              className="page-link"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              »
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
