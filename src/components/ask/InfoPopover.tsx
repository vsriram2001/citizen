"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Sheet } from "@/components/ui/Sheet";
import { useIsTouch } from "@/components/mobile/useMediaQuery";
import type { ResponsiblePerson } from "@/lib/types";

const PersonIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="6.5" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M3.5 17c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);


// The X (formerly Twitter) logo — a link to the person's profile, not a
// close/dismiss control. The popover itself already closes on hover-out
// or click-outside, so there's no separate close button per person.
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.9 2.4h3.2l-7 8.1 8.2 10.9h-6.4l-5-6.6-5.8 6.6H2l7.5-8.6L1.6 2.4H8.2l4.6 6.1zm-1.1 17h1.8L6.3 4.3H4.4z" />
  </svg>
);

/**
 * Person-icon trigger that reveals who's accountable for an ask — the
 * responsible body, and the named officeholder(s) currently running it, if
 * known — on hover (desktop) or click (touch, and keyboard). Kept out of
 * the always-visible row on purpose: it's detail worth having one tap away,
 * not detail that should compete with the ask itself for space in a dense
 * list.
 *
 * The trigger itself becomes overlapping circles (like stacked avatars) the
 * moment there's more than one person, so "there's more than one name here"
 * is visible before the popover even opens. Each person then renders as its
 * own callout card in the popover — asks with a multi-body target (e.g.
 * "State Home Departments") name several people at once, and stacking them
 * as distinct cards keeps each one individually attributable instead of
 * blurring into a single list.
 *
 * Opens to the side (right of the trigger), not below — sitting in a dense
 * list row, a below-anchored popover collides with the row underneath it.
 */
export function InfoPopover({
  body,
  people,
}: {
  body: string;
  people?: ResponsiblePerson[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const count = people?.length ?? 0;
  // Touch screens have no hover, and a side popover runs off a phone's edge:
  // a tap opens the same content as a bottom sheet instead.
  const touch = useIsTouch();

  useEffect(() => {
    if (touch) return; // the sheet's backdrop handles outside taps
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [touch]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      // Mouse only: a tap fires a synthetic enter and then the click, which
      // opened and immediately re-closed the popover on phones.
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          count > 1 ? `Responsible: ${count} people` : `Responsible: ${body}`
        }
        aria-haspopup="dialog"
        className="relative flex items-center cursor-pointer group after:absolute after:-inset-[7px]"
      >
        {count > 1 ? (
          <span className="flex items-center">
            {people!.slice(0, 3).map((person, i) => (
              <span
                key={person.name}
                style={{ marginLeft: i === 0 ? 0 : -7, zIndex: 10 - i }}
                className={cn(
                  "relative flex items-center justify-center w-5 h-5 rounded-full",
                  "bg-card border border-border text-text-muted",
                  "group-hover:border-accent group-hover:text-accent transition-colors",
                )}
              >
                <PersonIcon className="w-3 h-3" />
              </span>
            ))}
            {count > 3 && (
              <span
                style={{ marginLeft: -7, zIndex: 6 }}
                className={cn(
                  "relative flex items-center justify-center w-5 h-5 rounded-full",
                  "bg-ink text-paper text-[9px] font-semibold border border-ink",
                )}
              >
                +{count - 3}
              </span>
            )}
          </span>
        ) : (
          <span
            className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full",
              "border border-border text-text-muted",
              "group-hover:border-accent group-hover:text-accent transition-colors",
            )}
          >
            <PersonIcon className="w-3 h-3" />
          </span>
        )}
      </button>

      {open && touch && (
        <Sheet
          eyebrow="Who's responsible"
          title={body}
          onClose={() => setOpen(false)}
        >
          {people && people.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border border border-border rounded-sm">
              {people.map((person) => (
                <li key={person.name} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-text">{person.name}</p>
                    <p className="text-[13px] text-text-secondary leading-snug mt-0.5">
                      {person.designation}
                      {person.organization && (
                        <>
                          <span className="text-text-muted"> · </span>
                          {person.organization}
                        </>
                      )}
                    </p>
                  </div>
                  {person.twitterHandle && (
                    <a
                      href={`https://x.com/${person.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${person.name} on X`}
                      className="shrink-0 flex items-center justify-center w-10 h-10 rounded-sm border border-border text-text-secondary active:bg-paper"
                    >
                      <TwitterIcon className="w-4 h-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">No named officeholder on file yet.</p>
          )}
        </Sheet>
      )}

      {open && !touch && (
        <div
          role="tooltip"
          className="absolute z-20 left-full top-1/2 -translate-y-1/2 ml-2 w-max max-w-80"
        >
          {people && people.length > 0 ? (
            <div className="bg-card border border-ink/80 rounded-card shadow-lg overflow-hidden">
              {people.map((person, i) => (
                <div
                  key={person.name}
                  className={cn(
                    "px-4 py-3",
                    i > 0 && "border-t border-border",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-sans text-[15px] font-semibold text-text truncate">
                      {person.name}
                    </span>
                    {person.twitterHandle && (
                      <a
                        href={`https://x.com/${person.twitterHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${person.name} on X`}
                        className={cn(
                          "flex items-center justify-center w-5 h-5 rounded-sm border border-border shrink-0",
                          "text-text-muted hover:text-text hover:border-muted transition-colors cursor-pointer",
                        )}
                      >
                        <TwitterIcon className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <p className="text-[13px] text-text-secondary leading-snug mt-0.5">
                    {person.designation}
                    {person.organization && (
                      <>
                        <span className="text-text-muted"> · </span>
                        {person.organization}
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-ink/80 text-text-secondary text-xs px-4 py-3 rounded-card shadow-lg">
              No named officeholder on file yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
