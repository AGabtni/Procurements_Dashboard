/** Maps single-letter procurement category codes to full display names. */
export const CATEGORY_MAP: Record<string, string> = {
  C: "Construction",
  G: "Goods",
  R: "Services related to goods",
  S: "Services",
};

/** Returns the full display name for a category code, or the code itself if unknown. */
export function categoryLabel(code: string | null | undefined): string {
  if (!code) return "—";
  return CATEGORY_MAP[code] ?? code;
}
