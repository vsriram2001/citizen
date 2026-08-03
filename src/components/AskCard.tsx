import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PartyBadge, VerificationBadge } from "@/components/ui/Badge";
import type { PartyStatus, VerificationStatus } from "@/lib/status";

export interface PartyResponse {
  party: string;
  status: PartyStatus;
  sourceUrl?: string;
}

export interface Ask {
  id: string;
  askText: string;
  currentValue: string;
  targetValue: string;
  timeframe: string;
  targetBody: string;
  mechanism?: string;
  verificationStatus: VerificationStatus;
  voteCount: number;
  partyResponses: PartyResponse[];
}

/**
 * The recurring unit of the product.
 *
 * `compact` is for dense lists (search results, popular asks); the default
 * shows the full current→target delta and the mechanism. Both always render
 * the verification badge — an unverified number must never be able to appear
 * without saying it's unverified, regardless of how tight the layout gets.
 */
export function AskCard({
  ask,
  compact = false,
  voted = false,
  disabled = false,
  onVote,
  className,
}: {
  ask: Ask;
  compact?: boolean;
  voted?: boolean;
  disabled?: boolean;
  onVote?: () => void;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2">
        <h3 className={cn("leading-snug", compact ? "text-[17px]" : "text-xl")}>
          {ask.askText}
        </h3>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <VerificationBadge status={ask.verificationStatus} />
          <span className="text-xs text-text-muted">{ask.targetBody}</span>
        </div>
      </div>

      {/* The current→target delta is the forced-specificity mechanism made
          visible, so it appears in both variants — compact just renders it
          tighter. Hiding it in lists would leave users browsing headlines
          that read as vague as the wishes this product exists to replace. */}
      <div
        className={cn(
          "flex flex-wrap items-baseline gap-x-2 gap-y-1 border-y border-border",
          compact ? "text-[13px] py-2" : "text-sm py-2.5",
        )}
      >
        <span className="text-text-muted">From</span>
        <span className="font-medium text-text tabular-nums">
          {ask.currentValue}
        </span>
        <span className="text-text-muted">to</span>
        <span className="font-medium text-text tabular-nums">
          {ask.targetValue}
        </span>
        <span className="text-text-muted">by {ask.timeframe}</span>
      </div>

      {!compact && ask.mechanism && (
        <p className="text-sm text-text-secondary leading-relaxed">
          {ask.mechanism}
        </p>
      )}

      {ask.partyResponses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ask.partyResponses.map((r) => (
            <PartyBadge key={r.party} party={r.party} status={r.status} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[13px] text-text-secondary tabular-nums">
          {ask.voteCount.toLocaleString("en-IN")}{" "}
          {ask.voteCount === 1 ? "vote" : "votes"}
        </span>
        {onVote && (
          <Button
            variant={voted ? "secondary" : "primary"}
            size="sm"
            disabled={disabled || voted}
            onClick={onVote}
          >
            {voted ? "Voted" : "Vote"}
          </Button>
        )}
      </div>
    </Card>
  );
}
