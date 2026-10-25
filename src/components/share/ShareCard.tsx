import { PartyBadge } from "@/components/ui/Badge";
import type { Ask } from "@/lib/types";

/**
 * The visual unit being shared for a single ask — current→target delta,
 * deadline, and vote count, stripped of any interactive chrome (no vote
 * button, no popovers). Used on /share/[askId] itself; the OG image
 * (opengraph-image.tsx) mirrors this layout in plain inline styles since
 * ImageResponse can't render arbitrary Tailwind/React.
 */
export function ShareCard({ ask }: { ask: Ask }) {
  return (
    <div className="bg-card border border-border rounded-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
          Citizen Poll
        </span>
        <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
          Deadline&nbsp;
          <span className="font-semibold text-text tabular-nums">
            {ask.timeframe}
          </span>
        </span>
      </div>

      <h2 className="text-2xl leading-snug">{ask.askText}</h2>

      {(ask.currentValue || ask.targetValue) && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-secondary">{ask.currentValue}</span>
          <span className="text-text-muted" aria-hidden>
            →
          </span>
          <span className="font-semibold text-text">{ask.targetValue}</span>
        </div>
      )}

      {/* Party positions only with a source (product rule) — seed data has none yet. */}
      {ask.partyResponses.some((r) => r.sourceUrl) && (
        <div className="flex flex-wrap gap-1.5">
          {ask.partyResponses.filter((r) => r.sourceUrl).map((r) => (
            <PartyBadge key={r.party} party={r.party} status={r.status} />
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <span className="text-[13px] text-text-secondary tabular-nums">
          {ask.voteCount.toLocaleString("en-IN")}{" "}
          {ask.voteCount === 1 ? "vote" : "votes"}
        </span>
      </div>
    </div>
  );
}
