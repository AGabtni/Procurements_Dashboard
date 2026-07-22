// Decode HTML entities (e.g. &amp; → &) using the browser's own parser.
// Safe against XSS: we read .value from a textarea, not innerHTML.
export function decodeHtml(s: string | null | undefined): string | null {
  if (!s) return s ?? null;
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}
