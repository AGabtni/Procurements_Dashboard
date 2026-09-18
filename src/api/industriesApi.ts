import type { IndustryNode, IndustrySearchResult } from "../types/industry";
import { httpError } from "./apiError";

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

export async function getIndustryChildren(parent?: string): Promise<IndustryNode[]> {
  const url = parent
    ? `${API_BASE}/api/industries?parent=${encodeURIComponent(parent)}`
    : `${API_BASE}/api/industries`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw await httpError(res);
  return res.json();
}

export async function searchIndustries(q: string, locale?: string): Promise<IndustrySearchResult[]> {
  const localeParam = locale ? `&locale=${encodeURIComponent(locale)}` : "";
  const res = await fetch(
    `${API_BASE}/api/industries/search?q=${encodeURIComponent(q)}${localeParam}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw await httpError(res);
  return res.json();
}
