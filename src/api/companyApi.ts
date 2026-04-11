import type {
  CompanyProfileDto,
  CompanyMatchDto,
  MatchStatsDto,
  CreateCompanyProfileRequest,
  UpdateCompanyProfileRequest,
  CompanyPreferencesRequest,
  CompanyPreferencesDto,
  UpdateMatchStatusRequest,
} from "../types/company";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5009";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchVoid(url: string, init?: RequestInit): Promise<void> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
}

// ── Profile CRUD ──

export async function getAllProfiles(): Promise<CompanyProfileDto[]> {
  return fetchJson<CompanyProfileDto[]>(`${API_BASE}/api/company`);
}

export async function getProfileById(id: number): Promise<CompanyProfileDto> {
  return fetchJson<CompanyProfileDto>(`${API_BASE}/api/company/${id}`);
}

export async function createProfile(
  request: CreateCompanyProfileRequest
): Promise<CompanyProfileDto> {
  return fetchJson<CompanyProfileDto>(`${API_BASE}/api/company`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function updateProfile(
  id: number,
  request: UpdateCompanyProfileRequest
): Promise<CompanyProfileDto> {
  return fetchJson<CompanyProfileDto>(`${API_BASE}/api/company/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function deleteProfile(id: number): Promise<void> {
  return fetchVoid(`${API_BASE}/api/company/${id}`, { method: "DELETE" });
}

// ── Preferences ──

export async function getPreferences(
  companyId: number
): Promise<CompanyPreferencesDto> {
  return fetchJson<CompanyPreferencesDto>(
    `${API_BASE}/api/company/${companyId}/preferences`
  );
}

export async function updatePreferences(
  companyId: number,
  request: CompanyPreferencesRequest
): Promise<CompanyPreferencesDto> {
  return fetchJson<CompanyPreferencesDto>(
    `${API_BASE}/api/company/${companyId}/preferences`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );
}

// ── Matches ──

export async function getMatches(
  companyId: number,
  status?: string,
  limit?: number
): Promise<CompanyMatchDto[]> {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (limit) query.set("limit", String(limit));
  return fetchJson<CompanyMatchDto[]>(
    `${API_BASE}/api/company/${companyId}/matches?${query}`
  );
}

export async function getMatchStats(
  companyId: number
): Promise<MatchStatsDto> {
  return fetchJson<MatchStatsDto>(
    `${API_BASE}/api/company/${companyId}/matches/stats`
  );
}

export async function updateMatchStatus(
  companyId: number,
  matchId: number,
  request: UpdateMatchStatusRequest
): Promise<void> {
  return fetchVoid(
    `${API_BASE}/api/company/${companyId}/matches/${matchId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );
}
