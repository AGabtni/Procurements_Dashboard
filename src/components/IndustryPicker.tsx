import { useState, useRef, useEffect } from "react";
import type { IndustryNode, IndustrySearchResult, IndustryElements } from "../types/industry";
import { getIndustryChildren, searchIndustries } from "../api/industriesApi";

export interface IndustryPickerProps {
  value: string[];
  onChange: (codes: string[]) => void;
  initialLabels?: Record<string, string>;
  error?: boolean;
  id?: string;
}

interface TreeItem extends IndustryNode {
  depth: number;
}

function textEndAnchor(el: HTMLElement): { x: number; y: number } {
  const node = el.firstChild;
  if (node && node.nodeType === Node.TEXT_NODE) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = range.getClientRects();
    if (rects.length > 0) {
      const last = rects[rects.length - 1];
      return { x: last.right, y: last.bottom };
    }
  }
  const r = el.getBoundingClientRect();
  return { x: r.right, y: r.bottom };
}

function isDescendant(code: string, ancestorCode: string): boolean {
  return code.length > ancestorCode.length && code.startsWith(ancestorCode);
}

function buildHint(elements: IndustryElements | null): string | null {
  if (!elements) return null;
  if (elements.examples.length > 0) {
    const preview = elements.examples.slice(0, 2).join(", ");
    return elements.examples.length > 2 ? `${preview}…` : preview;
  }
  if (elements.exclusions.length > 0) return `Excl: ${elements.exclusions[0]}`;
  return null;
}

export default function IndustryPicker({
  value,
  onChange,
  initialLabels = {},
  error,
  id,
}: IndustryPickerProps) {
  const [open, setOpen]                       = useState(false);
  const [query, setQuery]                     = useState("");
  const [treeItems, setTreeItems]             = useState<TreeItem[]>([]);
  const [expanded, setExpanded]               = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults]     = useState<IndustrySearchResult[]>([]);
  const [searchLoading, setSearchLoading]     = useState(false);
  const [rootLoaded, setRootLoaded]           = useState(false);
  const [labelMap, setLabelMap]               = useState<Record<string, string>>(initialLabels);
  const [hoveredElements, setHoveredElements] = useState<IndustryElements | null>(null);
  const [hoveredTitle, setHoveredTitle]       = useState<string>("");
  const [hoverAnchor, setHoverAnchor]         = useState({ x: 0, y: 0 });
  const containerRef    = useRef<HTMLDivElement>(null);
  const panelRef        = useRef<HTMLDivElement>(null);
  const searchTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mousePos        = useRef({ x: 0, y: 0 });

  const isSearching = query.trim().length > 0;

  const showDetailPanel =
    hoveredElements !== null &&
    (hoveredElements.examples.length > 0 ||
      hoveredElements.inclusions.length > 0 ||
      hoveredElements.exclusions.length > 0);

  // Panel bottom-left corner aligns with the bottom-right of the hovered title text.
  const detailPanelStyle: React.CSSProperties | null = (() => {
    if (!showDetailPanel) return null;
    const PANEL_W   = 300;
    const PANEL_MAX = 340;
    // left  = right edge of title text; clamp so panel doesn't overflow right viewport edge
    const left      = Math.min(hoverAnchor.x, window.innerWidth - PANEL_W - 8);
    // bottom (CSS) = distance from viewport bottom so the panel's actual bottom lands at anchorY
    const bottomCSS = Math.max(8, window.innerHeight - hoverAnchor.y);
    // maxHeight = space available above the anchor, so the panel never goes off the top
    const maxHeight = Math.min(PANEL_MAX, hoverAnchor.y - 8);
    return {
      position:  "fixed",
      left,
      bottom:    bottomCSS,
      width:     PANEL_W,
      maxHeight: Math.max(maxHeight, 80),
      zIndex:    1051,
    };
  })();

  // Track cursor position so endHover can check if mouse moved to the panel.
  useEffect(() => {
    function track(e: MouseEvent) { mousePos.current = { x: e.clientX, y: e.clientY }; }
    document.addEventListener("mousemove", track);
    return () => document.removeEventListener("mousemove", track);
  }, []);

  useEffect(() => {
    setLabelMap((prev) => ({ ...initialLabels, ...prev }));
  }, [initialLabels]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (open && !rootLoaded) loadChildren(undefined, 0);
  }, [open]);

  useEffect(() => {
    if (!isSearching) { setSearchResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchIndustries(query.trim());
        setSearchResults(results);
        const newLabels: Record<string, string> = {};
        results.forEach((r) => { newLabels[r.code] = r.titleEn; });
        setLabelMap((prev) => ({ ...prev, ...newLabels }));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  async function loadChildren(parentCode: string | undefined, depth: number) {
    try {
      const children = await getIndustryChildren(parentCode);
      const items: TreeItem[] = children.map((c) => ({ ...c, depth }));
      const newLabels: Record<string, string> = {};
      children.forEach((c) => { newLabels[c.code] = c.titleEn; });
      setLabelMap((prev) => ({ ...prev, ...newLabels }));
      if (parentCode === undefined) {
        setTreeItems(items);
        setRootLoaded(true);
      } else {
        setTreeItems((prev) => {
          const idx = prev.findIndex((n) => n.code === parentCode);
          if (idx === -1) return prev;
          const next = [...prev];
          next.splice(idx + 1, 0, ...items);
          return next;
        });
      }
    } catch { /* ignore */ }
  }

  async function handleExpand(node: TreeItem) {
    if (!node.hasChildren) return;
    if (expanded.has(node.code)) {
      setTreeItems((prev) =>
        prev.filter((n) => n.code === node.code || !isDescendant(n.code, node.code))
      );
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(node.code);
        prev.forEach((c) => { if (isDescendant(c, node.code)) next.delete(c); });
        return next;
      });
    } else {
      setExpanded((prev) => new Set([...prev, node.code]));
      await loadChildren(node.code, node.depth + 1);
    }
  }

  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
  }

  function hasSelectedDescendant(code: string) {
    return value.some((v) => isDescendant(v, code));
  }

  // anchorX / anchorY = bottom-right corner of the title text span.
  // The panel's bottom-left will align to this point.
  function startHover(titleEn: string, elements: IndustryElements | null, anchorX: number, anchorY: number) {
    if (hoverClearTimer.current) clearTimeout(hoverClearTimer.current);
    setHoveredTitle(titleEn);
    setHoveredElements(elements);
    setHoverAnchor({ x: anchorX, y: anchorY });
  }

  function endHover() {
    hoverClearTimer.current = setTimeout(() => {
      // Don't clear if cursor has arrived on the detail panel.
      const el = document.elementFromPoint(mousePos.current.x, mousePos.current.y);
      if (panelRef.current && panelRef.current.contains(el)) return;
      setHoveredTitle("");
      setHoveredElements(null);
    }, 200);
  }

  function cancelClear() {
    if (hoverClearTimer.current) clearTimeout(hoverClearTimer.current);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }} id={id}>
      {/* ── Trigger ── */}
      <button
        type="button"
        className={`form-select text-start${error ? " is-invalid" : ""}`}
        style={{ color: value.length === 0 ? "#adb5bd" : undefined }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value.length === 0
          ? "Select industries..."
          : `${value.length} industr${value.length === 1 ? "y" : "ies"} selected`}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="border rounded bg-white shadow"
          style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 1050 }}
          role="dialog"
          aria-label="Industry selector"
        >
          {/* Search */}
          <div className="p-2 border-bottom">
            <div className="input-group input-group-sm">
              <input
                autoFocus
                type="text"
                className="form-control"
                placeholder="Search industries…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="btn btn-outline-secondary" type="button" onClick={() => setQuery("")}>×</button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 280, overflowY: "auto" }} role="listbox" aria-multiselectable="true">
            {isSearching ? (
              searchLoading ? (
                <div className="text-muted small p-3 text-center">Searching…</div>
              ) : searchResults.length === 0 ? (
                <div className="text-muted small p-3 text-center">No results for "{query}"</div>
              ) : (
                searchResults.map((r) => {
                  const sel  = value.includes(r.code);
                  const hint = buildHint(r.elements);
                  return (
                    <div
                      key={r.code}
                      role="option"
                      aria-selected={sel}
                      className={`d-flex align-items-start px-3 py-2${sel ? " bg-primary bg-opacity-10" : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggle(r.code)}
                      onMouseLeave={endHover}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input me-2 mt-1 flex-shrink-0"
                        checked={sel}
                        onChange={() => toggle(r.code)}
                        onClick={(e) => e.stopPropagation()}
                        tabIndex={-1}
                      />
                      <div className="min-w-0">
                        <div className="small fw-semibold">
                          <span
                            onMouseEnter={(e) => {
                              const { x, y } = textEndAnchor(e.currentTarget);
                              startHover(r.titleEn, r.elements, x, y);
                            }}
                          >{r.titleEn}</span>
                        </div>
                        {r.ancestorTitles.length > 0 && (
                          <div className="text-muted" style={{ fontSize: "0.72em" }}>
                            {r.ancestorTitles.join(" › ")}
                          </div>
                        )}
                        {hint && (
                          <div className="text-muted" style={{ fontSize: "0.72em", fontStyle: "italic" }}>
                            {hint}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : treeItems.length === 0 ? (
              <div className="text-muted small p-3 text-center">Loading sectors…</div>
            ) : (
              treeItems.map((node) => {
                const sel    = value.includes(node.code);
                const hasSel = !sel && hasSelectedDescendant(node.code);
                const hint   = node.level >= 4 ? buildHint(node.elements) : null;
                return (
                  <div
                    key={node.code}
                    role="option"
                    aria-selected={sel}
                    className={`d-flex align-items-start py-1${sel ? " bg-primary bg-opacity-10" : ""}`}
                    style={{ paddingLeft: `${8 + node.depth * 16}px`, paddingRight: 8, cursor: "pointer" }}
                    onMouseLeave={endHover}
                  >
                    {/* Expand arrow */}
                    <span
                      className="me-1 flex-shrink-0"
                      style={{ width: 16, fontSize: "0.7em", color: "#6c757d", userSelect: "none", paddingTop: 3 }}
                      onClick={(e) => { e.stopPropagation(); handleExpand(node); }}
                    >
                      {node.hasChildren ? (expanded.has(node.code) ? "▼" : "▶") : " "}
                    </span>

                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      className="form-check-input me-2 flex-shrink-0"
                      style={{ marginTop: 2 }}
                      checked={sel}
                      onChange={() => toggle(node.code)}
                    />

                    {/* Label + inline hint */}
                    <span className="small flex-grow-1" style={{ userSelect: "none" }} onClick={() => toggle(node.code)}>
                      <span
                        onMouseEnter={(e) => {
                          const { x, y } = textEndAnchor(e.currentTarget);
                          startHover(node.titleEn, node.elements, x, y);
                        }}
                      >{node.titleEn}</span>
                      {hasSel && (
                        <span className="ms-1" style={{ color: "#0d6efd", fontSize: "0.6em", verticalAlign: "middle" }} title="Contains selected sub-industries">●</span>
                      )}
                      {hint && (
                        <div className="text-muted" style={{ fontSize: "0.72em", fontStyle: "italic", marginTop: 1 }}>
                          {hint}
                        </div>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-top d-flex justify-content-between align-items-center bg-light">
            <span className="text-muted" style={{ fontSize: "0.8em" }}>
              {value.length === 0 ? "No industries selected" : `${value.length} selected`}
            </span>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>

          {/* ── Floating detail panel — fixed to the viewport ── */}
          {detailPanelStyle && (
            <div
              ref={panelRef}
              className="border rounded bg-white shadow"
              style={{ ...detailPanelStyle, overflowY: "auto", padding: "12px 14px" }}
            >
              <div className="fw-semibold mb-2" style={{ fontSize: "0.85em", color: "#212529", lineHeight: 1.3 }}>
                {hoveredTitle}
              </div>

              {hoveredElements!.examples.length > 0 && (
                <div className="mb-3">
                  <div style={{ fontSize: "0.65em", textTransform: "uppercase", letterSpacing: "0.06em", color: "#6c757d", fontWeight: 600, marginBottom: 4 }}>
                    Examples
                  </div>
                  <ul className="mb-0 ps-3" style={{ fontSize: "0.8em", color: "#495057" }}>
                    {hoveredElements!.examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hoveredElements!.inclusions.length > 0 && (
                <div className="mb-3">
                  <div style={{ fontSize: "0.65em", textTransform: "uppercase", letterSpacing: "0.06em", color: "#198754", fontWeight: 600, marginBottom: 4 }}>
                    Inclusions
                  </div>
                  <ul className="mb-0 ps-3" style={{ fontSize: "0.8em", color: "#495057" }}>
                    {hoveredElements!.inclusions.map((inc, i) => (
                      <li key={i}>{inc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hoveredElements!.exclusions.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.65em", textTransform: "uppercase", letterSpacing: "0.06em", color: "#dc3545", fontWeight: 600, marginBottom: 4 }}>
                    Exclusions
                  </div>
                  <ul className="mb-0 ps-3" style={{ fontSize: "0.8em", color: "#495057" }}>
                    {hoveredElements!.exclusions.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Selected chips ── */}
      {value.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mt-2">
          {value.map((code) => {
            const label     = labelMap[code];
            const isGeneral = hasSelectedDescendant(code);
            return (
              <span
                key={code}
                className="badge bg-primary d-inline-flex align-items-center gap-1"
                style={{ fontSize: "0.78em", fontWeight: 400 }}
              >
                {label ?? code}
                {isGeneral && (
                  <span className="badge ms-1" style={{ background: "rgba(255,255,255,0.25)", fontSize: "0.75em" }}>
                    General
                  </span>
                )}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-1"
                  style={{ fontSize: "0.45em" }}
                  onClick={() => onChange(value.filter((c) => c !== code))}
                  aria-label={`Remove ${label ?? code}`}
                />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
