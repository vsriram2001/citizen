"use client";

import { useState } from "react";
import { AskCard } from "@/components/ask/AskCard";
import type { Ask } from "@/lib/types";
import { Button } from "@/components/ui/Button";

// Enough rows to scroll a good while before the button appears.
const PAGE = 12;

/**
 * A ranked group of compact asks. Shows the first twelve, then reveals twelve
 * more per click, so a long list never becomes a wall. Each card carries a
 * thin vote-share bar relative to the leading ask, which makes the gap
 * between #1 and #12 visible without reading a single number.
 */
export function AskList({
  asks,
  renderCard,
}: {
  asks: Ask[];
  /** Lets the caller wire up voting per card; falls back to a plain card. */
  renderCard?: (ask: Ask, rank: number, barPct: number) => React.ReactNode;
}) {
  const [shown, setShown] = useState(PAGE);
  const top = Math.max(...asks.map((a) => a.voteCount), 1);
  const visible = asks.slice(0, shown);
  const remaining = asks.length - visible.length;

  return (
    <div className="flex flex-col gap-3">
      {visible.map((ask, i) => {
        const barPct = (ask.voteCount / top) * 100;
        return (
          renderCard?.(ask, i + 1, barPct) ?? (
            <AskCard key={ask.id} ask={ask} compact rank={i + 1} barPct={barPct} />
          )
        );
      })}

      {remaining > 0 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button variant="secondary" size="sm" onClick={() => setShown((n) => n + PAGE)}>
            Show {Math.min(PAGE, remaining)} more
          </Button>
          <span className="text-xs text-text-muted tabular-nums">
            {visible.length} of {asks.length}
          </span>
        </div>
      )}
    </div>
  );
}
