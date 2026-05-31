const STORAGE_KEY = "procureportal_recently_viewed";
const MAX_ITEMS = 20;

interface ViewedEntry {
  id: number;
  at: number; // timestamp
}

export function recordView(tenderId: number): void {
  const entries = getEntries().filter((e) => e.id !== tenderId);
  entries.unshift({ id: tenderId, at: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)));
}

export function getRecentlyViewedIds(limit = 5): number[] {
  return getEntries()
    .slice(0, limit)
    .map((e) => e.id);
}

function getEntries(): ViewedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ViewedEntry[];
  } catch {
    return [];
  }
}
