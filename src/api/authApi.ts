import type { LoginRequest, RegisterRequest, AuthResponse, SettingsDto, UpdateSettingsRequest, UserDto } from "../types/auth";

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
    throw new Error(body?.message || "Login failed");
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
    throw new Error(body?.message || "Registration failed");
  }
}

export async function getSettings(): Promise<SettingsDto> {
  const res = await fetch(`${API_BASE}/api/auth/settings`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load settings");
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
    throw new Error(body?.message || "Failed to update settings");
  }
  return res.json();
}

export async function sendConfirmationEmail(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/send-confirmation`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Failed to send confirmation email");
  }
}

export async function confirmEmail(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/confirm-email?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || "Email confirmation failed");
  }
}

// ── Admin: User Management ──

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

export async function activateUser(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/users/${id}/activate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to activate user");
}

export async function deactivateUser(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/users/${id}/deactivate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to deactivate user");
}
