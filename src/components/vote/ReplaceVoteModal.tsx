"use client";

import { Button } from "@/components/ui/Button";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { VOTE_BUDGET } from "@/lib/vote-session";
import type { Ask } from "@/lib/types";

/**
 * Shown when someone taps Vote with all 3 votes spent. Votes are scarce, so
 * instead of a dead button they see the ask they wanted, the asks holding
 * their votes, and a Replace on each one that can still change. A vote that
 * was already submitted (Finish & share) is final: it's listed, marked
 * locked, and has no button — and if all of them are locked there is nothing
 * to swap, so the card just says so.
 */
export function ReplaceVoteModal({
  wanted,
  current,
  submittedIds,
  busy,
  onReplace,
  onClose,
}: {
  /** The ask they just tried to vote for. */
  wanted: Ask;
  /** The asks currently holding their votes. */
  current: Ask[];
  submittedIds: Set<string>;
  /** True while a swap is in flight, so it can't be double-tapped. */
  busy: boolean;
  onReplace: (oldId: string) => void;
  onClose: () => void;
}) {
  const canReplace = current.some((a) => !submittedIds.has(a.id));

  return (
    <Sheet
      title={`You can only take ${VOTE_BUDGET} votes a year`}
      description={
        canReplace
          ? "To back this ask, replace one of your current votes. A vote you've already submitted can't be changed."
          : "You've submitted all your votes for the year, so they can't be changed or replaced."
      }
      width="lg"
      onClose={onClose}
      footer={
        <SheetActions>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {canReplace ? "Keep my votes" : "Close"}
          </Button>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-widest text-text-muted">
            You wanted to vote for
          </span>
          <p className="text-[14px] leading-6 text-text border border-border rounded-sm px-3 py-2">
            {wanted.askText}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-widest text-text-muted">
            Your current votes
          </span>
          <ol className="flex flex-col divide-y divide-border border border-border rounded-sm">
            {current.map((ask, i) => {
              const locked = submittedIds.has(ask.id);
              return (
                <li key={ask.id} className="flex items-start gap-3 px-3 py-3">
                  <span className="font-display font-black text-[18px] leading-6 text-text-muted tabular-nums">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-[14px] leading-6 text-text">{ask.askText}</span>
                  {locked ? (
                    <span className="shrink-0 text-[12px] leading-6 text-text-muted">
                      Submitted · locked
                    </span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0 -my-1 max-sm:min-h-9"
                      onClick={() => onReplace(ask.id)}
                      disabled={busy}
                    >
                      Replace
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Sheet>
  );
}
