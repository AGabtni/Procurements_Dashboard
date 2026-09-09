import { useState, useRef, useEffect } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: DropdownOption[];
  value: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export default function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  id,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const labelMap = Object.fromEntries(options.map((o) => [o.value, o.label]));

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function toggle(val: string) {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);
  }

  function triggerLabel() {
    if (value.length === 0) return placeholder;
    if (value.length === 1) return labelMap[value[0]] ?? value[0];
    return `${value.length} selected`;
  }

  return (
    <div className="dropdown" ref={ref} id={id}>
      <button
        type="button"
        className={`form-select text-start text-truncate ${className}`}
        style={{ color: value.length === 0 ? "#adb5bd" : undefined }}
        onClick={() => setOpen(!open)}
      >
        {triggerLabel()}
      </button>

      {open && (
        <div
          className="border rounded bg-white shadow"
          style={{ position: "absolute", zIndex: 1050, left: 0, right: 0, top: "calc(100% + 2px)" }}
        >
          {/* Search */}
          <div className="p-2 border-bottom">
            <div className="input-group input-group-sm">
              <input
                ref={searchRef}
                type="text"
                className="form-control"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="btn btn-outline-secondary" type="button" onClick={() => setQuery("")}>
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div className="text-muted small p-3 text-center">No results</div>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt.value}
                  className={`d-flex align-items-center px-3 py-2${value.includes(opt.value) ? " bg-primary bg-opacity-10" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => toggle(opt.value)}
                >
                  <input
                    className="form-check-input me-2 flex-shrink-0"
                    type="checkbox"
                    checked={value.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    onClick={(e) => e.stopPropagation()}
                    tabIndex={-1}
                  />
                  <span className="small">{opt.label}</span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-top d-flex justify-content-between align-items-center bg-light">
            <span className="text-muted" style={{ fontSize: "0.8em" }}>
              {value.length === 0 ? "None selected" : `${value.length} selected`}
            </span>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => { setOpen(false); setQuery(""); }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
