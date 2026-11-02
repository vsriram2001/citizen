import { VOTE_BUDGET } from "@/lib/vote-session";

/**
 * In place of the add-ask panel when every vote is spent. A new ask needs its
 * founding vote, so saying so here spares the person the whole draft and
 * review only to be turned away. Removing a vote brings the panel back.
 */
export function OutOfVotesNotice({ onReview }: { onReview: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-card border border-border rounded-card px-4 py-3">
      <div className="flex-1 min-w-[16rem] flex flex-col gap-0.5">
        <p className="text-[14px] font-semibold text-text">
          You&rsquo;ve used all {VOTE_BUDGET} of your votes
        </p>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          A new ask starts with your vote. To add this one, remove a vote you haven&rsquo;t
          submitted yet.
        </p>
      </div>
      <button
        type="button"
        onClick={onReview}
        className="shrink-0 text-[13px] text-accent hover:underline underline-offset-4 cursor-pointer max-sm:py-2"
      >
        Review my votes
      </button>
    </div>
  );
}
