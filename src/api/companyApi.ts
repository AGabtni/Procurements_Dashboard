import type {
  CompanyProfileDto,
  CompanyMatchDto,
  MatchStatsDto,
  CreateCompanyProfileRequest,
  UpdateCompanyProfileRequest,
  CompanyPreferencesRequest,
  CompanyPreferencesDto,
  UpdateMatchStatusRequest,
  AdminCreateCompanyRequest,
} from "../types/company";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5009";
const STORAGE_KEY = "procureportal_auth";

function authHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const { token } = JSON.parse(raw);
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch { /* ignore */ }
  return {};
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchVoid(url: string, init?: RequestInit): Promise<void> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
}

export interface TriggerMatchResult {
  started: boolean;
  retryAfterSeconds?: number;
  message: string;
}

// ── My Profile (current user) ──

export async function getMyProfile(): Promise<CompanyProfileDto | null> {
  const res = await fetch(`${API_BASE}/api/company/me`, {
    headers: { ...authHeaders() },
  });
  if (res.status === 404) return null;
  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function createMyProfile(
  request: CreateCompanyProfileRequest
): Promise<CompanyProfileDto> {
  return fetchJson<CompanyProfileDto>(`${API_BASE}/api/company/me`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function updateMyProfile(
  request: UpdateCompanyProfileRequest
): Promise<CompanyProfileDto> {
  return fetchJson<CompanyProfileDto>(`${API_BASE}/api/company/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function getMyPreferences(): Promise<CompanyPreferencesDto> {
  return fetchJson<CompanyPreferencesDto>(`${API_BASE}/api/company/me/preferences`);
}

export async function updateMyPreferences(
  request: CompanyPreferencesRequest
): Promise<CompanyPreferencesDto> {
  return fetchJson<CompanyPreferencesDto>(`${API_BASE}/api/company/me/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function getMyMatches(
  status?: string,
  limit?: number
): Promise<CompanyMatchDto[]> {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (limit) query.set("limit", String(limit));
  return fetchJson<CompanyMatchDto[]>(`${API_BASE}/api/company/me/matches?${query}`);
}

export async function getMyMatchStats(): Promise<MatchStatsDto> {
  return fetchJson<MatchStatsDto>(`${API_BASE}/api/company/me/matches/stats`);
}

export async function updateMyMatchStatus(
  matchId: number,
  request: UpdateMatchStatusRequest
): Promise<void> {
  return fetchVoid(`${API_BASE}/api/company/me/matches/${matchId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function triggerMyMatch(): Promise<TriggerMatchResult> {
  return handleTriggerResponse(
    await fetch(`${API_BASE}/api/company/me/match`, {
      method: "POST",
      headers: { ...authHeaders() },
    })
  );
}

// ── Admin: All Profiles ──

export async function getAllProfiles(): Promise<CompanyProfileDto[]> {
  return fetchJson<CompanyProfileDto[]>(`${API_BASE}/api/company`);
}

export async function adminCreateProfile(
  request: AdminCreateCompanyRequest
): Promise<CompanyProfileDto> {
  return fetchJson<CompanyProfileDto>(`${API_BASE}/api/company`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}

export async function linkUserToProfile(
  companyId: number,
  userId: number | null
): Promise<CompanyProfileDto> {
  return fetchJson<CompanyProfileDto>(`${API_BASE}/api/company/${companyId}/link-user`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}

export async function getProfileById(id: number): Promise<CompanyProfileDto> {
  return fetchJson<CompanyProfileDto>(`${API_BASE}/api/company/${id}`);
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

export async function triggerMatch(
  companyId: number
): Promise<TriggerMatchResult> {
  return handleTriggerResponse(
    await fetch(`${API_BASE}/api/company/${companyId}/match`, {
      method: "POST",
      headers: { ...authHeaders() },
    })
  );
}

// ── Shared trigger response parser ──

async function handleTriggerResponse(res: Response): Promise<TriggerMatchResult> {
  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    // response may have empty body
  }

  if (res.status === 202) {
    return { started: true, message: (body.message as string) ?? "Matching job queued" };
  }
  if (res.status === 429) {
    const retryAfter = (body.retryAfterSeconds as number) ??
      Number(res.headers.get("Retry-After") ?? "0");
    return {
      started: false,
      retryAfterSeconds: retryAfter,
      message: (body.message as string) ?? "Cooldown active",
    };
  }
  if (res.status === 409) {
    return { started: false, message: (body.message as string) ?? "Already in progress" };
  }

  throw new Error(`API error: ${res.status} ${res.statusText}`);
}
