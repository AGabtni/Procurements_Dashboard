import type { LoginRequest, RegisterRequest, AuthResponse } from "../types/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5009";

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
