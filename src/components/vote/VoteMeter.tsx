import { cn } from "@/lib/cn";

/**
 * Remaining votes, as discrete segments rather than a continuous bar.
 *
 * The scarcity *is* the mechanism — three votes a year, and spending one is
 * meant to feel like a decision. Discrete segments read as countable tokens
 * you are spending down; a smooth progress bar reads as a task you are
 * completing. Those are different feelings and we want the first one.
 */
export function VoteMeter({
  used,
  total = 3,
  className,
}: {
  used: number;
  total?: number;
  className?: string;
}) {
  const spent = Math.max(0, Math.min(used, total));
  const remaining = total - spent;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-text-secondary">
          {remaining === 0
            ? "No votes remaining this year"
            : `${remaining} of ${total} votes remaining`}
        </span>
      </div>
      <div
        className="flex gap-1.5"
        role="meter"
        aria-valuenow={spent}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${spent} of ${total} votes used`}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-sm transition-colors duration-200",
              i < spent ? "bg-accent" : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}
