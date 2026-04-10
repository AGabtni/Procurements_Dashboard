import type { TenderSearchParams } from "../types/tender";

interface Props {
  params: TenderSearchParams;
  categories: string[];
  noticeTypes: string[];
  onSearch: (params: TenderSearchParams) => void;
}

export default function SearchBar({
  params,
  categories,
  noticeTypes,
  onSearch,
}: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSearch({
      ...params,
      keyword: (fd.get("keyword") as string) || undefined,
      category: (fd.get("category") as string) || undefined,
      noticeType: (fd.get("noticeType") as string) || undefined,
      openOnly: fd.get("openOnly") === "on",
      page: 1,
    });
  }

  function handleReset() {
    onSearch({ page: 1, pageSize: 20, openOnly: true });
  }

  return (
    <form onSubmit={handleSubmit} className="card card-body mb-4">
      <div className="row g-3 align-items-end">
        <div className="col-md-4">
          <label htmlFor="keyword" className="form-label">
            Search
          </label>
          <input
            id="keyword"
            name="keyword"
            type="text"
            className="form-control"
            placeholder="Title, organization, or notice ID"
            defaultValue={params.keyword ?? ""}
          />
        </div>

        <div className="col-md-2">
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <select
            id="category"
            name="category"
            className="form-select"
            defaultValue={params.category ?? ""}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-2">
          <label htmlFor="noticeType" className="form-label">
            Notice Type
          </label>
          <select
            id="noticeType"
            name="noticeType"
            className="form-select"
            defaultValue={params.noticeType ?? ""}
          >
            <option value="">All</option>
            {noticeTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="col-md-2">
          <div className="form-check mt-2">
            <input
              id="openOnly"
              name="openOnly"
              type="checkbox"
              className="form-check-input"
              defaultChecked={params.openOnly !== false}
            />
            <label htmlFor="openOnly" className="form-check-label">
              Open only
            </label>
          </div>
        </div>

        <div className="col-md-2 d-flex gap-2">
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}
