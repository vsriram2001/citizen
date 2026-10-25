import Link from "next/link";
import { VOTE_BUDGET } from "@/lib/vote-session";

/**
 * Top of /search once all votes are submitted. The ballot is final, so the
 * screen stops inviting votes and says why; the one action left is sharing.
 */
export function VotesSubmittedNotice() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-card border border-border rounded-card px-4 py-3">
      <div className="flex-1 min-w-[16rem] flex flex-col gap-0.5">
        <p className="text-[14px] font-semibold text-text">
          You&rsquo;ve submitted all {VOTE_BUDGET} of your votes for the year
        </p>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          They&rsquo;re final and can&rsquo;t be changed or replaced. You can still browse every
          ask and see who&rsquo;s responsible.
        </p>
      </div>
      <Link
        href="/share/votes"
        className="shrink-0 text-[13px] text-accent hover:underline underline-offset-4"
      >
        View &amp; share my votes
      </Link>
    </div>
  );
}
