import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CANADA_PROVINCES } from "../utils/provinces";

interface Props {
  value: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  /** When provided, only show provinces that appear in this set */
  availableValues?: string[];
}

export default function ProvinceDropdown({ value, onChange, placeholder, id, className = "", availableValues }: Props) {
  const { t } = useTranslation("tenders");
  const [open, setOpen] = useState(false);
  const [canadaOpen, setCanadaOpen] = useState(true);
  const [usOpen, setUsOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(val: string) {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);
  }

  function triggerLabel() {
    if (value.length === 0) return placeholder ?? t("searchBar.allProvinces");
    if (value.length === 1) {
      const all = [...CANADA_PROVINCES, { value: "FED", label: t("searchBar.provinceGroups.federal") }, { value: "NATO", label: "NATO" }, { value: "US", label: t("searchBar.provinceGroups.us") }];
      return all.find((o) => o.value === value[0])?.label ?? value[0];
    }
    return `${value.length} selected`;
  }

  const federalLabel = t("searchBar.provinceGroups.federal");
  const canadaLabel  = t("searchBar.provinceGroups.canada");
  const usLabel      = t("searchBar.provinceGroups.us");

  const avail = availableValues ? new Set(availableValues) : null;
  const isAvailable = (val: string) => !avail || avail.has(val);

  const canadaProvinces = CANADA_PROVINCES.filter((p) => isAvailable(p.value));
  const showFed  = isAvailable("FED");
  const showNato = isAvailable("NATO");
  const showUs   = isAvailable("US");
  const hasCanadaGroup = canadaProvinces.length > 0 || showFed || showNato;
  const hasUsGroup = showUs;

  const groupHeader = (label: string, expanded: boolean, onToggle: () => void) => (
    <div
      onClick={onToggle}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "6px 12px", background: "var(--pp-bg)", cursor: "pointer",
        fontWeight: 600, fontSize: ".78rem", textTransform: "uppercase",
        letterSpacing: ".04em", color: "var(--pp-text-muted)", userSelect: "none",
        borderBottom: "1px solid var(--pp-border-light)",
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: "10px", opacity: .7 }}>{expanded ? "▲" : "▼"}</span>
    </div>
  );

  const optionRow = (val: string, label: string) => (
    <div
      key={val}
      onClick={() => toggle(val)}
      style={{
        display: "flex", alignItems: "center", padding: "6px 14px",
        cursor: "pointer", fontSize: ".875rem",
        background: value.includes(val) ? "var(--pp-primary-subtle)" : undefined,
      }}
    >
      <input
        type="checkbox"
        className="form-check-input me-2 flex-shrink-0"
        checked={value.includes(val)}
        onChange={() => toggle(val)}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      />
      <span>{label}</span>
    </div>
  );

  return (
    <div ref={ref} id={id} style={{ position: "relative" }}>
      <button
        type="button"
        className={`form-select text-start text-truncate ${className}`}
        style={{ color: value.length === 0 ? "#adb5bd" : undefined }}
        onClick={() => setOpen((o) => !o)}
      >
        {triggerLabel()}
      </button>

      {open && (
        <div
          className="border rounded bg-white shadow"
          style={{ position: "absolute", zIndex: 1050, left: 0, right: 0, top: "calc(100% + 2px)", minWidth: 220 }}
        >
          <div style={{ maxHeight: 320, overflowY: "auto" }}>

            {/* Canada group */}
            {hasCanadaGroup && groupHeader(canadaLabel, canadaOpen, () => setCanadaOpen((o) => !o))}
            {hasCanadaGroup && canadaOpen && (
              <>
                {canadaProvinces.map((p) => optionRow(p.value, p.label))}
                {showFed  && optionRow("FED",  federalLabel)}
                {showNato && optionRow("NATO", "NATO")}
              </>
            )}

            {/* United States group */}
            {hasUsGroup && groupHeader(usLabel, usOpen, () => setUsOpen((o) => !o))}
            {hasUsGroup && usOpen && optionRow("US", usLabel)}

          </div>

          <div className="px-3 py-2 border-top d-flex justify-content-between align-items-center bg-light">
            <span className="text-muted" style={{ fontSize: ".8em" }}>
              {value.length === 0 ? "—" : `${value.length} selected`}
            </span>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
