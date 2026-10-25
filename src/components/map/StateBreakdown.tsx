import { Card } from "@/components/ui/Card";
import { STATE_VOTE_SHARE } from "@/lib/mock/states";

/**
 * Where votes are coming from, by state — a ranked list with proportional
 * bars rather than a literal India outline. Illustrative/placeholder data
 * (see lib/mock/states.ts) until real votes carry enough city/state volume
 * (captured at onboarding) to make a live query worth showing.
 */
export function StateBreakdown() {
  const maxVotes = Math.max(...STATE_VOTE_SHARE.map((s) => s.votes));

  return (
    <Card className="flex flex-col gap-4 w-full min-w-0">
      <div className="flex flex-col gap-1">
        <h3 className="font-sans text-[15px] font-semibold text-text">
          Where votes come from
        </h3>
        <p className="text-xs text-text-muted">
          Illustrative — real breakdown coming soon
        </p>
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        {STATE_VOTE_SHARE.map((entry) => {
          const widthPct = (entry.votes / maxVotes) * 100;
          return (
            <div key={entry.state} className="flex flex-col gap-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 min-w-0">
                <span className="text-[13px] text-text truncate">{entry.state}</span>
                <span className="text-xs text-text-muted tabular-nums shrink-0">
                  {entry.votes.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="h-1.5 rounded-sm bg-border overflow-hidden">
                <div
                  className="h-full rounded-sm bg-accent"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
