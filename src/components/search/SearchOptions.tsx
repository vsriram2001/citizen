"use client";

import { cn } from "@/lib/cn";

/** Keeps the box focused through a tap, so the keyboard doesn't drop and close this first. */
function keepFocus(e: React.MouseEvent) {
  e.preventDefault();
}

/**
 * Opens under the search box, telling people what they can search. Empty:
 * the most-backed ask and the topics most asks are about, with a way to clear
 * them.
 * Typing: what matches so far (lib/search-suggestions.ts), with results
 * themselves still updating in the list below.
 */
export function SearchOptions({
  suggestions,
  suggestionsHeading,
  topics,
  onPick,
  onClear,
  className,
}: {
  suggestions: string[];
  /** Left out while typing: the list explains itself under what's typed. */
  suggestionsHeading?: string;
  topics: string[];
  onPick: (text: string) => void;
  /** Left out while typing: that list goes away by itself. */
  onClear?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 bg-card border border-border rounded-sm shadow-lg p-4 overflow-y-auto overscroll-contain",
        className,
      )}
    >
      {suggestions.length > 0 && (
        <div className="flex flex-col gap-1">
          {(suggestionsHeading || onClear) && (
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[13px] uppercase tracking-[0.08em] text-text-muted">
                {suggestionsHeading}
              </h2>
              {onClear && (
                <button
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={onClear}
                  className="max-sm:min-h-9 text-[13px] text-accent hover:underline underline-offset-4 cursor-pointer"
                >
                  Clear suggestions
                </button>
              )}
            </div>
          )}
          <ul className="flex flex-col">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={() => onPick(suggestion)}
                  className="w-full flex items-start gap-3 py-2.5 sm:py-2 text-left text-sm text-text hover:text-accent active:text-accent cursor-pointer"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="size-4 mt-0.5 shrink-0 text-text-muted" aria-hidden>
                    <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <span className="line-clamp-2">{suggestion}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {topics.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-[13px] uppercase tracking-[0.08em] text-text-muted">Popular topics</h2>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                onMouseDown={keepFocus}
                onClick={() => onPick(topic)}
                className="max-sm:min-h-10 text-[13px] px-3 py-1.5 rounded-sm border border-border text-text-secondary hover:border-muted hover:text-text active:border-muted cursor-pointer transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
