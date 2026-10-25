import Link from "next/link";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PartyBadge } from "@/components/ui/Badge";
import { InfoPopover } from "@/components/ask/InfoPopover";
import { AskInfoButton } from "@/components/ask/AskInfoButton";
import { TagsPopover } from "@/components/ask/TagsPopover";
import type { Ask } from "@/lib/types";

/** The accountability gap itself: where things are now → where the ask wants
 *  them. Hidden when either side is empty (e.g. a brand-new freeform ask). */
function Delta({ ask, className }: { ask: Ask; className?: string }) {
  if (!ask.currentValue || !ask.targetValue) return null;
  return (
    <p
      className={cn(
        "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums",
        className,
      )}
    >
      <span className="text-text-muted">{ask.currentValue}</span>
      <span className="text-text-muted" aria-hidden>
        →
      </span>
      <span className="font-semibold text-text">{ask.targetValue}</span>
    </p>
  );
}

/** askText with the words search matched underlined (see lib/match.ts —
 *  `words` are lowercased whole words). Plain text when there are none. */
function AskText({ text, words }: { text: string; words?: string[] }) {
  if (!words || words.length === 0) return <>{text}</>;
  const hits = new Set(words);
  return (
    <>
      {text.split(/([A-Za-z0-9]+)/).map((part, i) =>
        hits.has(part.toLowerCase()) ? (
          <mark
            key={i}
            className="bg-transparent text-inherit underline decoration-accent/60 decoration-2 underline-offset-[3px]"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
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
  rank,
  voted = false,
  disabled = false,
  onVote,
  onUnvote,
  voteLabel,
  barPct,
  highlight,
  showInfo = true,
  className,
}: {
  ask: Ask;
  compact?: boolean;
  /** 1-based position in a ranked list (e.g. Popular). Compact-only. */
  rank?: number;
  voted?: boolean;
  /** Disables casting a new vote (e.g. budget exhausted). Never disables
   *  retracting an existing vote — that stays available regardless. */
  disabled?: boolean;
  onVote?: () => void;
  /** When set, the "Voted" state becomes clickable and calls this to
   *  retract the vote, instead of being a static disabled pill. */
  onUnvote?: () => void;
  /** Override the vote button's unvoted label (default "Vote") — e.g.
   *  "1st vote" for a brand-new suggested ask with no votes yet. */
  voteLabel?: string;
  /** Compact-only: 0–100 width of the thin vote-share bar along the card's
   *  bottom edge, relative to the leading ask in the same list. */
  barPct?: number;
  /** Words to underline in askText — the search terms it matched. */
  highlight?: string[];
  /** Show the "i" button that opens the ask's full Info section. Off for
   *  not-yet-added suggestions, which have no stored ask to describe. */
  showInfo?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <CompactAskCard
        ask={ask}
        rank={rank}
        voted={voted}
        disabled={disabled}
        onVote={onVote}
        onUnvote={onUnvote}
        voteLabel={voteLabel}
        barPct={barPct}
        highlight={highlight}
        showInfo={showInfo}
        className={className}
      />
    );
  }

  return (
    <Card className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="font-sans text-xl font-semibold text-text leading-snug">
            <AskText text={ask.askText} words={highlight} />
          </h3>
          <InfoPopover body={ask.targetBody} people={ask.responsiblePeople} />
          {showInfo && <AskInfoButton ask={ask} />}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
            Deadline
          </span>
          <span className="text-sm font-semibold text-text tabular-nums">
            {ask.timeframe}
          </span>
        </div>
      </div>

      <Delta
        ask={ask}
        className="text-[15px] py-2.5 px-3 bg-paper border border-border rounded-sm"
      />

      {ask.mechanism && (
        <p className="text-sm text-text-secondary leading-relaxed">
          {ask.mechanism}
        </p>
      )}

      {ask.tags && ask.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ask.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 rounded-sm bg-paper border border-border text-text-secondary"
            >
              {tag}
            </span>
          ))}
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

      <div className="flex items-center justify-between pt-0.5">
        <span className="text-[13px] text-text-secondary tabular-nums">
          {ask.voteCount.toLocaleString("en-IN")}{" "}
          {ask.voteCount === 1 ? "vote" : "votes"}
        </span>
        <div className="flex items-center gap-2">
          {voted && (
            <Link
              href={`/share/${ask.id}`}
              className="text-[13px] text-text-secondary hover:text-text transition-colors underline decoration-transparent hover:decoration-current underline-offset-4"
            >
              Share
            </Link>
          )}
          {onVote && (
            <Button
              variant={voted ? "secondary" : "primary"}
              size={voted ? "sm" : "vote"}
              disabled={voted ? !onUnvote : disabled}
              onClick={voted ? onUnvote : onVote}
              title={voted && onUnvote ? "Click to remove your vote" : undefined}
            >
              {voted ? "Voted" : "Vote"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Compact row for dense lists (search results, Popular). Apple-style
 * restraint: generous type for the two things that matter most — the ask
 * and the vote count — everything else (body, extra tags) is one tap away
 * rather than crammed into view. Only the first tag shows; the rest live
 * behind a "+N" toggle so the row never grows to fit an unbounded tag list.
 */
function CompactAskCard({
  ask,
  rank,
  voted,
  disabled,
  onVote,
  onUnvote,
  voteLabel,
  barPct,
  highlight,
  showInfo,
  className,
}: {
  ask: Ask;
  rank?: number;
  voted: boolean;
  disabled: boolean;
  onVote?: () => void;
  onUnvote?: () => void;
  voteLabel?: string;
  barPct?: number;
  highlight?: string[];
  showInfo: boolean;
  className?: string;
}) {
  const tags = ask.tags ?? [];
  const votes = (
    <>
      {ask.voteCount.toLocaleString("en-IN")}{" "}
      {ask.voteCount === 1 ? "vote" : "votes"}
    </>
  );

  // One grid, two arrangements:
  //   phones  — the ask runs the full width; under it a single quiet line
  //             (votes · deadline · tag) with a compact Vote at its end.
  //             Three rows, like a list item in a native app, rather than a
  //             form with a separate footer.
  //   sm+     — the desktop row: rank | ask | count + Vote, centred.
  // Explicit columns (not flex-wrap) so the button can share the metadata
  // line on phones without narrowing the ask text above it. Placement uses
  // col-[a/b] / row-[a/b] (one property each): cn()'s tailwind-merge drops
  // col-start-* when a col-span-* follows, which scrambled the grid.
  const ranked = rank !== undefined;
  const place = ranked
    ? { head: "col-[2/4] sm:col-[2/3]", meta: "col-[2/3]", act: "col-[3/4]" }
    : { head: "col-[1/3] sm:col-[1/2]", meta: "col-[1/2]", act: "col-[2/3]" };

  return (
    <Card
      className={cn(
        "relative grid items-center gap-x-3 sm:gap-x-4 gap-y-1 py-3.5 px-4",
        ranked ? "grid-cols-[auto_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]",
        className,
      )}
    >
      {ranked && (
        <span className="col-[1/2] row-[1/2] self-start sm:row-[1/3] sm:self-center text-[15px] sm:text-base leading-snug sm:leading-normal font-semibold text-text-muted tabular-nums w-4 sm:w-5 text-right">
          {rank}
        </span>
      )}

      <div className={cn("row-[1/2] flex flex-col gap-1 min-w-0", place.head)}>
        {/* The icons ride inline after the last word instead of holding a
            column of their own — on a phone that column took a quarter of
            every line of the ask. nowrap keeps the pair together. */}
        <div className="min-w-0 text-[15px] leading-snug">
          <h3 className="inline font-sans text-[15px] font-semibold text-text leading-snug">
            <AskText text={ask.askText} words={highlight} />
          </h3>
          <div className="inline-flex items-center gap-2 ml-1.5 align-middle whitespace-nowrap -mt-0.5">
            <InfoPopover body={ask.targetBody} people={ask.responsiblePeople} />
            {showInfo && <AskInfoButton ask={ask} />}
          </div>
        </div>

        <Delta ask={ask} className="text-[13px]" />
      </div>

      {/* One thin metadata line: deadline first (the accountability
          clock), then tags. No verification badge — it was duplicating
          what the list context already says. Phones lead with the vote
          count, which has no column of its own there. */}
      <div
        className={cn(
          "row-[2/3] self-center flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] min-w-0",
          place.meta,
        )}
      >
        <span className="sm:hidden font-semibold text-text tabular-nums">{votes}</span>
        <span className="sm:hidden text-text-muted" aria-hidden>
          ·
        </span>
        <span className="text-text-muted uppercase tracking-[0.06em] text-[10px] max-sm:hidden">
          Deadline
        </span>
        <span className="sm:hidden text-text-muted">by</span>
        <span className="font-semibold text-text tabular-nums">
          {ask.timeframe}
        </span>

        {tags.length > 0 && (
          // Desktop only: on a phone a tag wrapped the line to a second row
          // under the Vote button. Topics stay one tap away in Filters.
          <span className="hidden sm:flex items-center gap-1">
            <span className="text-text-muted" aria-hidden>
              ·
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-paper border border-border text-text-secondary text-xs">
              {tags[0]}
            </span>
            {tags.length > 1 && (
              <TagsPopover tags={tags} hiddenCount={tags.length - 1} />
            )}
          </span>
        )}
      </div>

      <div
        className={cn(
          "row-[2/3] self-center sm:row-[1/3] flex items-center gap-3",
          place.act,
        )}
      >
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-xl font-bold text-text tabular-nums">
            {ask.voteCount.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] uppercase tracking-[0.08em] text-text-muted">
            {ask.voteCount === 1 ? "vote" : "votes"}
          </span>
        </div>
        {voted && (
          <Link
            href={`/share/${ask.id}`}
            className="text-[13px] text-text-secondary hover:text-text transition-colors underline decoration-transparent hover:decoration-current underline-offset-4 max-sm:py-2"
          >
            Share
          </Link>
        )}
        {onVote && (
          <Button
            variant={voted ? "secondary" : "primary"}
            size={voted ? "sm" : "vote"}
            disabled={voted ? !onUnvote : disabled}
            onClick={voted ? onUnvote : onVote}
            title={voted && onUnvote ? "Click to remove your vote" : undefined}
            className="max-sm:min-h-9"
          >
            {voted ? "Voted" : (voteLabel ?? "Vote")}
          </Button>
        )}
      </div>
      {barPct !== undefined && (
        <span
          aria-hidden
          className={cn(
            "absolute left-0 bottom-0 h-[3px] bg-accent/70 rounded-bl-card",
            barPct >= 99 && "rounded-br-card",
          )}
          style={{ width: `${Math.max(barPct, 2)}%` }}
        />
      )}
    </Card>
  );
}
