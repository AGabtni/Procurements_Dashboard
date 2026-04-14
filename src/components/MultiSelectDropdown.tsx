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
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const labelMap = Object.fromEntries(options.map((o) => [o.value, o.label]));

  function toggle(val: string) {
    const next = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val];
    onChange(next);
  }

  return (
    <div className="dropdown" ref={ref} id={id}>
      <button
        type="button"
        className={`form-select text-start ${className}`}
        onClick={() => setOpen(!open)}
      >
        {value.length
          ? value.map((v) => labelMap[v] ?? v).join(", ")
          : placeholder}
      </button>
      {open && (
        <div className="dropdown-menu show w-100 p-2" style={{ maxHeight: 250, overflowY: "auto" }}>
          {options.map((opt) => (
            <div className="form-check" key={opt.value}>
              <input
                className="form-check-input"
                type="checkbox"
                id={`msd-${id ?? "x"}-${opt.value}`}
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <label
                className="form-check-label"
                htmlFor={`msd-${id ?? "x"}-${opt.value}`}
              >
                {opt.label}
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
