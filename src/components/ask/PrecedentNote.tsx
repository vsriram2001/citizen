import { cn } from "@/lib/cn";
import type { Precedent } from "@/lib/types";

/**
 * "Done before": a place that has already achieved what an ask asks for,
 * with its source. Shown only when there is one — an ask without a
 * precedent shows nothing rather than a "none found" line.
 */
export function PrecedentNote({
  precedent,
  className,
}: {
  precedent: Precedent;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-text-secondary leading-relaxed", className)}>
      <span className="font-semibold text-support-fg">
        <span aria-hidden>✓ </span>Done before · {precedent.place}:
      </span>{" "}
      {precedent.summary}{" "}
      <a
        href={precedent.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-muted hover:text-text-secondary underline underline-offset-2 transition-colors whitespace-nowrap"
      >
        source ↗
      </a>
    </p>
  );
}
