"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { revealOnFocus } from "@/components/mobile/useMediaQuery";

interface SearchableSelectProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Type-to-filter select over a fixed option list, with a fallback: if
 * nothing in the list matches, the user can still submit exactly what they
 * typed. Built for occupation, where the standard categories won't cover
 * everyone and forcing a pick from a closed list would just produce bad
 * data (whichever option is "closest enough" to click).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  id,
}: SearchableSelectProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-sync the text box when the parent changes `value` (adjusting state
  // during render, per React's "you might not need an effect").
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setQuery(value);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        // Commit whatever was typed, even if it matched nothing.
        onChange(query.trim());
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [query, onChange]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const exactMatch = options.some(
    (o) => o.toLowerCase() === query.trim().toLowerCase(),
  );
  const showCustomOption = query.trim().length > 0 && !exactMatch;

  function select(option: string) {
    setQuery(option);
    onChange(option);
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          // Phones: lift it so the option list opens above the keyboard.
          revealOnFocus("start")(e);
        }}
        autoComplete="off"
        className={cn(
          "scroll-mt-12 w-full bg-card text-text placeholder:text-text-muted",
          "border border-border rounded-sm px-3 py-2.5 sm:py-2 text-sm",
          "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
        )}
      />
      {open && (filtered.length > 0 || showCustomOption) && (
        <ul className="absolute z-10 mt-1 w-full bg-card border border-border rounded-sm shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((option) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(option)}
                className="w-full text-left px-3 py-3 sm:py-2 text-sm hover:bg-paper active:bg-paper cursor-pointer border-b border-border last:border-b-0"
              >
                {option}
              </button>
            </li>
          ))}
          {showCustomOption && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(query.trim())}
                className="w-full text-left px-3 py-3 sm:py-2 text-sm hover:bg-paper active:bg-paper cursor-pointer text-text-secondary"
              >
                Use &ldquo;{query.trim()}&rdquo; as typed
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
