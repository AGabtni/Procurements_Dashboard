import type { LoginRequest, RegisterRequest, AuthResponse, SettingsDto, UpdateSettingsRequest, UserDto } from "../types/auth";
import { ApiError } from "./apiError";

// Turn a failed response (whose JSON body may have already been read) into an
// ApiError. Auth endpoints return a stable { code } the frontend localizes;
// any { message } is kept as a fallback for resolveError to surface.
function bodyError(status: number, body?: { code?: unknown; message?: unknown } | null): ApiError {
  return new ApiError(status >= 500 ? "server" : "generic", {
    status,
    errorKey: typeof body?.code === "string" && body.code.trim() ? body.code : undefined,
    serverMessage: typeof body?.message === "string" && body.message.trim() ? body.message : undefined,
  });
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5009";

function authHeaders(): HeadersInit {
  const raw = localStorage.getItem("procureportal_auth");
  if (!raw) return { "Content-Type": "application/json" };
  const { token } = JSON.parse(raw);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw bodyError(res.status, body);
  }
  return res.json();
}

export async function register(request: RegisterRequest): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw bodyError(res.status, body);
  }
}

export async function getSettings(): Promise<SettingsDto> {
  const res = await fetch(`${API_BASE}/api/auth/settings`, { headers: authHeaders() });
  if (!res.ok) throw bodyError(res.status);
  return res.json();
}

export async function updateSettings(request: UpdateSettingsRequest): Promise<SettingsDto> {
  const res = await fetch(`${API_BASE}/api/auth/settings`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw bodyError(res.status, body);
  }
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw bodyError(res.status, body);
  }
}

export async function sendConfirmationEmail(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/send-confirmation`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw bodyError(res.status, body);
  }
}

export async function confirmEmail(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/confirm-email?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw bodyError(res.status, body);
  }
}

// ── Admin: User Management ──

export async function refreshSession(): Promise<{ activatedAt: string | null; trialDays: number; subscriptionStatus: string | null; trialEndsAt: string | null; companyId: number | null; locale: string; commsLocale: string }> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw bodyError(res.status);
  return res.json();
}

export async function updateLocale(locale: string): Promise<{ locale: string }> {
  const res = await fetch(`${API_BASE}/api/auth/me/locale`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ locale }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw bodyError(res.status, body);
  }
  return res.json();
}

export async function updateCommsLocale(commsLocale: string): Promise<{ commsLocale: string }> {
  const res = await fetch(`${API_BASE}/api/auth/me/comms-locale`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ commsLocale }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw bodyError(res.status, body);
  }
  return res.json();
}

export async function getAllUsers(): Promise<UserDto[]> {
  const res = await fetch(`${API_BASE}/api/auth/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

export async function getUnlinkedUsers(): Promise<UserDto[]> {
  const res = await fetch(`${API_BASE}/api/auth/users/unlinked`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load unlinked users");
  return res.json();
}

export async function activateUser(id: number): Promise<{ activatedAt: string }> {
  const res = await fetch(`${API_BASE}/api/auth/users/${id}/activate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to activate user");
  return res.json();
}

export async function deactivateUser(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/users/${id}/deactivate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to deactivate user");
}
