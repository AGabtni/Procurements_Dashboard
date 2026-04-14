import { useState, useRef } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

export default function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter or comma",
  id,
  className = "",
}: TagInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTags(raw: string) {
    const newTags = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && !value.includes(s));
    if (newTags.length) onChange([...value, ...newTags]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) {
        addTags(input);
        setInput("");
      }
    } else if (e.key === "Backspace" && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    addTags(pasted);
    setInput("");
  }

  function handleBlur() {
    if (input.trim()) {
      addTags(input);
      setInput("");
    }
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div
      className={`form-control d-flex flex-wrap align-items-center gap-1 ${className}`}
      style={{ minHeight: 38, cursor: "text", height: "auto" }}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="badge bg-primary d-inline-flex align-items-center gap-1"
          style={{ fontSize: "0.85em" }}
        >
          {tag}
          <button
            type="button"
            className="btn-close btn-close-white"
            style={{ fontSize: "0.55em" }}
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            aria-label={`Remove ${tag}`}
          />
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="border-0 flex-grow-1 p-0"
        style={{ outline: "none", minWidth: 120 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={value.length ? "" : placeholder}
      />
    </div>
  );
}
