"use client";

import { Button } from "@/components/ui/Button";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { VOTE_BUDGET } from "@/lib/vote-session";
import type { Ask } from "@/lib/types";

/**
 * Last look before the ballot: the asks the person backed, numbered like a
 * ballot slip, each removable. Votes already count the moment they're cast,
 * so "Finish" isn't a commit — it plays the ballot animation and lands on
 * the share page. Removing a vote here just frees that vote to use elsewhere
 * — until Finish, which submits them: submitted votes are locked, so they show
 * "Submitted" instead of Remove.
 */
export function ReviewVotesModal({
  asks,
  busyId,
  submittedIds,
  onRemove,
  onFinish,
  onClose,
}: {
  asks: Ask[];
  /** Ask whose vote is mid-retract, so its button can't be double-tapped. */
  busyId: string | null;
  /** Votes already submitted — shown locked, no Remove. */
  submittedIds: Set<string>;
  onRemove: (id: string) => void;
  onFinish: () => void;
  onClose: () => void;
}) {
  const unused = VOTE_BUDGET - asks.length;
  const pending = asks.filter((a) => !submittedIds.has(a.id));

  return (
    <Sheet
      title="Your votes"
      description={
        asks.length === 0
          ? "You haven't backed any asks yet."
          : pending.length === 0
            ? `You've submitted ${asks.length} of ${VOTE_BUDGET}. Submitted votes can't be changed.`
            : `You've backed ${asks.length} of ${VOTE_BUDGET}. Remove one to use that vote somewhere else — once you submit, votes can't be changed.`
      }
      width="lg"
      onClose={onClose}
      footer={
        <SheetActions>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Keep browsing
          </Button>
          <Button variant="primary" size="sm" onClick={onFinish} disabled={asks.length === 0}>
            {pending.length === 0 ? "Share" : "Submit & share"}
          </Button>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-4">
        {asks.length > 0 && (
          <ol className="flex flex-col divide-y divide-border border border-border rounded-sm">
            {asks.map((ask, i) => (
              <li key={ask.id} className="flex items-start gap-3 px-3 py-3">
                <span className="font-display font-black text-[18px] leading-6 text-text-muted tabular-nums">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 text-[14px] leading-6 text-text">{ask.askText}</span>
                {submittedIds.has(ask.id) ? (
                  <span className="shrink-0 text-[12px] leading-6 text-text-muted">
                    Submitted · locked
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 -my-1 max-sm:min-h-9"
                    onClick={() => onRemove(ask.id)}
                    disabled={busyId === ask.id}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}

        {unused > 0 && asks.length > 0 && (
          <p className="text-[12px] text-text-muted">
            {unused} {unused === 1 ? "vote" : "votes"} unused — you can finish now and spend
            {unused === 1 ? " it" : " them"} later this year.
          </p>
        )}
      </div>
    </Sheet>
  );
}
