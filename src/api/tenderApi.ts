import type {
  TenderListDto,
  TenderDetailDto,
  PagedResult,
  TenderSearchParams,
} from "../types/tender";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5009";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function searchTenders(
  params: TenderSearchParams = {}
): Promise<PagedResult<TenderListDto>> {
  const query = new URLSearchParams();

  if (params.keyword) query.set("keyword", params.keyword);
  if (params.category) query.set("category", params.category);
  if (params.organization) query.set("organization", params.organization);
  if (params.noticeType) query.set("noticeType", params.noticeType);
  if (params.openOnly !== undefined)
    query.set("openOnly", String(params.openOnly));
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortDesc !== undefined)
    query.set("sortDesc", String(params.sortDesc));

  return fetchJson<PagedResult<TenderListDto>>(
    `${API_BASE}/api/tenders?${query}`
  );
}

export async function getTenderById(id: number): Promise<TenderDetailDto> {
  return fetchJson<TenderDetailDto>(`${API_BASE}/api/tenders/${id}`);
}

export async function getTenderByNoticeId(
  noticeId: string
): Promise<TenderDetailDto> {
  return fetchJson<TenderDetailDto>(
    `${API_BASE}/api/tenders/by-notice/${encodeURIComponent(noticeId)}`
  );
}

export async function getCategories(): Promise<string[]> {
  return fetchJson<string[]>(`${API_BASE}/api/tenders/categories`);
}

export async function getNoticeTypes(): Promise<string[]> {
  return fetchJson<string[]>(`${API_BASE}/api/tenders/notice-types`);
}
