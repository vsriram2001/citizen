"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";
import { FloatingCard } from "@/components/ask/FloatingCard";
import { useIsTouch } from "@/components/mobile/useMediaQuery";
import type { Precedent } from "@/lib/types";

/** Two footprints walking up and to the right: a path someone has already
 *  walked. Not a tick — a tick beside an unverified ask reads as "verified". */
export const DoneBeforeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
    {/* left foot, lower */}
    <ellipse cx="6.6" cy="10.4" rx="2.2" ry="3.3" transform="rotate(-12 6.6 10.4)" />
    <ellipse cx="7.4" cy="15.9" rx="1.6" ry="1.35" />
    {/* right foot, ahead */}
    <ellipse cx="13.2" cy="4.9" rx="2.2" ry="3.3" transform="rotate(12 13.2 4.9)" />
    <ellipse cx="12.5" cy="10.4" rx="1.6" ry="1.35" />
  </svg>
);

/**
 * Footsteps trigger, last in the card's icon row, on asks somewhere has
 * already achieved — "this path has been walked before" at a glance, the
 * precedent itself one hover or tap away, so the card stays as compact as
 * one without it. Same behaviour as InfoPopover: a side card on hover
 * (desktop), a bottom sheet on tap (touch). Styled like its neighbours but
 * for a faint green border — set apart, without shouting.
 */
export function PrecedentButton({
  precedent,
  variant = "icon",
}: {
  precedent: Precedent;
  /** "tag" spells it out — "Done before · Delhi" — for suggested asks,
   *  where it's the reason to pick one card over another and an icon alone
   *  went unnoticed. "icon" is the quiet form for asks already listed. */
  variant?: "icon" | "tag";
}) {
  const tag = variant === "tag";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const touch = useIsTouch();

  useEffect(() => {
    if (touch) return; // the sheet's backdrop handles outside taps
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      // The card is portalled out of the container, so check it separately.
      if (containerRef.current?.contains(target) || cardRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [touch]);

  const source = (
    <a
      href={precedent.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-text-muted hover:text-text-secondary underline underline-offset-2 transition-colors"
    >
      Source ↗
    </a>
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex", tag && "self-start")}
      // Mouse only: a tap fires a synthetic enter and then the click.
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Done before in ${precedent.place}`}
        aria-haspopup="dialog"
        className="relative flex items-center cursor-pointer group after:absolute after:-inset-[7px]"
      >
        {tag ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs",
              "border border-support/35 bg-support-bg text-support-fg",
              "group-hover:border-support transition-colors",
            )}
          >
            <DoneBeforeIcon className="w-3 h-3 shrink-0" />
            <span>
              Done before · <span className="font-semibold">{precedent.place}</span>
            </span>
          </span>
        ) : (
          <span
            className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full",
              "border border-support/35 text-text-muted",
              "group-hover:border-support group-hover:text-support-fg transition-colors",
            )}
          >
            <DoneBeforeIcon className="w-3 h-3" />
          </span>
        )}
      </button>

      {open && touch && (
        <Sheet eyebrow="Done before" title={precedent.place} onClose={() => setOpen(false)}>
          <p className="text-[15px] text-text leading-relaxed">{precedent.summary}</p>
          <p className="text-[13px] mt-3">{source}</p>
        </Sheet>
      )}

      {open && !touch && (
        <FloatingCard anchorRef={containerRef} cardRef={cardRef} className="w-80 max-w-[80vw]">
          <div className="bg-card border border-ink/80 rounded-card shadow-lg px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
              Done before
            </p>
            <p className="font-sans text-[15px] font-semibold text-text mt-0.5">
              {precedent.place}
            </p>
            <p className="text-[13px] text-text-secondary leading-snug mt-1">
              {precedent.summary}
            </p>
            <p className="text-xs mt-2">{source}</p>
          </div>
        </FloatingCard>
      )}
    </div>
  );
}
