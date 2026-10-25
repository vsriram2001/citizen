"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";
import { useIsTouch } from "@/components/mobile/useMediaQuery";

/**
 * "+N" trigger beside the first visible tag that reveals the *complete*
 * tag list to the side on hover or click — the popup repeats the
 * already-visible tag too, so someone hovering sees everything in one
 * place rather than having to mentally merge the row and the popup. Same
 * interaction and positioning as InfoPopover, so the two read as one
 * consistent pattern rather than two different disclosure styles on the
 * same card.
 */
export function TagsPopover({
  tags,
  hiddenCount,
}: {
  /** Full tag list, shown in the popup. */
  tags: string[];
  /** How many are hidden from the row — drives the "+N" label. */
  hiddenCount: number;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Same touch rule as InfoPopover: a tap opens a bottom sheet.
  const touch = useIsTouch();

  useEffect(() => {
    if (touch) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [touch]);

  if (tags.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${tags.length} tags total`}
        className={cn(
          "text-xs text-text-muted hover:text-accent transition-colors cursor-pointer",
          // Bigger target for a thumb, same footprint in the row.
          "px-1.5 py-1 -mx-1 -my-1",
        )}
      >
        +{hiddenCount}
      </button>

      {open && touch && (
        <Sheet title="Tags" onClose={() => setOpen(false)}>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[13px] px-3 py-1.5 rounded-sm bg-paper border border-border text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </Sheet>
      )}

      {open && !touch && (
        <div
          role="tooltip"
          className="absolute z-20 left-full top-1/2 -translate-y-1/2 ml-2 w-max max-w-56 flex flex-col gap-1.5 bg-ink p-2 rounded-card shadow-lg"
        >
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 rounded-sm bg-paper/15 text-paper"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
