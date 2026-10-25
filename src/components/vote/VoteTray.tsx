"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { preloadBallotArt } from "@/components/vote/BallotAnimation";
import { VOTE_BUDGET } from "@/lib/vote-session";

/**
 * "Your votes" tray — pinned to the bottom of the search screen once the
 * person has cast their first vote. Three pips fill as the budget is spent
 * (personal, not platform-wide), and the one action is "Review my votes",
 * which leads to the review sheet and then the ballot. It is offered from
 * the first vote, not only at 3/3: someone may care about one ask only.
 * Sits below the cards in the page flow's z-order and never touches them.
 */
export function VoteTray({
  used,
  submitted = false,
  onReview,
}: {
  used: number;
  /** All cast votes are submitted (locked). */
  submitted?: boolean;
  onReview: () => void;
}) {
  const complete = used >= VOTE_BUDGET;

  // The ballot art is a few hundred KB; fetch it while they're still voting
  // so the animation starts instantly when they finish.
  useEffect(() => {
    preloadBallotArt();
  }, []);

  // Phones: a full-width bar docked to the bottom edge (padded clear of the
  // home indicator); from sm, the floating card. Steps aside while the
  // keyboard is up so it never sits on top of the search box's results.
  return (
    <div className="hide-on-keyboard fixed inset-x-0 bottom-0 z-40 sm:px-4 sm:pb-4 pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto mx-auto sm:max-w-xl flex items-center gap-3 sm:gap-4",
          "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-3",
          "bg-card border-t sm:border border-border sm:rounded-card shadow-sm",
        )}
      >
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: VOTE_BUDGET }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 w-5 sm:h-3 sm:w-7 rounded-full transition-colors duration-300",
                i < used ? "bg-support" : "bg-border",
              )}
            />
          ))}
        </div>

        <span className="flex-1 min-w-0 text-[13px] font-semibold text-text-secondary tabular-nums">
          {used} of {VOTE_BUDGET} votes used
          {!complete && (
            <span className="hidden sm:inline font-normal text-text-muted">
              {" "}
              · {VOTE_BUDGET - used} left
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={onReview}
          className={cn(
            "shrink-0 text-[12px] px-4 py-2 max-sm:min-h-11 rounded-[2px]",
            "font-display font-black uppercase tracking-[0.07em]",
            "bg-navy text-paper border border-navy hover:bg-ink hover:border-ink active:bg-ink transition-colors",
            "btn-shimmer cursor-pointer",
          )}
        >
          {submitted ? (
            "My votes"
          ) : (
            <>
              <span className="sm:hidden">Review</span>
              <span className="hidden sm:inline">Review my votes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
