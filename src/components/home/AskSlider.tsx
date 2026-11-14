"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Ask } from "@/lib/types";

/*
  What people are backing, in one row. Replaced the practice ballot on the
  home page: that took a full screen to make one point, and this shows real
  asks in the height of a card.

  It's a scroll-snap row, so a phone can swipe it natively, and it advances
  itself every few seconds. It stops when someone touches, hovers or focuses
  it (they're reading), and never moves on its own under reduced motion.
*/

const ADVANCE_MS = 3500;

export function AskSlider({ asks }: { asks: Ask[] }) {
  const rowRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);

  // Which card is in front follows the row's scroll, however it got there.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const cards = [...row.children] as HTMLElement[];
        const left = row.scrollLeft;
        let best = 0;
        cards.forEach((c, i) => {
          if (Math.abs(c.offsetLeft - row.offsetLeft - left) < Math.abs(cards[best].offsetLeft - row.offsetLeft - left)) best = i;
        });
        setActive(best);
      });
    };
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      row.removeEventListener("scroll", onScroll);
    };
  }, []);

  function go(i: number) {
    const row = rowRef.current;
    const card = row?.children[i] as HTMLElement | undefined;
    if (!row || !card) return;
    row.scrollTo({ left: card.offsetLeft - row.offsetLeft, behavior: "smooth" });
  }

  useEffect(() => {
    if (held || asks.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => {
      const row = rowRef.current;
      // At the end of the row (wide screens show several at once), go back to the start.
      const atEnd = row ? row.scrollLeft + row.clientWidth >= row.scrollWidth - 4 : false;
      go(atEnd ? 0 : active + 1);
    }, ADVANCE_MS);
    return () => clearTimeout(id);
  }, [active, held, asks.length]);

  if (asks.length === 0) return null;
  const leader = Math.max(...asks.map((a) => a.voteCount), 1);

  return (
    <div
      className="flex flex-col gap-3"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onTouchStart={() => setHeld(true)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <ol
        ref={rowRef}
        aria-label="Asks people are backing"
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0 scroll-px-4 sm:scroll-px-0"
      >
        {asks.map((ask, i) => (
          <li
            key={ask.id}
            className="snap-start shrink-0 basis-[86%] sm:basis-[calc((100%-0.75rem)/2)] lg:basis-[calc((100%-1.5rem)/3)] min-w-0"
          >
            <Link
              href="/onboarding"
              className="h-full flex flex-col gap-3 rounded-card border border-border bg-card p-4 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted">#{i + 1}</span>
                <span className="text-sm text-text tabular-nums">
                  {ask.voteCount.toLocaleString("en-IN")} votes
                </span>
              </div>
              <p className="text-[16px] font-semibold text-text leading-snug">{ask.askText}</p>
              <p className="text-[13px] text-text-secondary leading-snug">
                {ask.currentValue} <span className="text-text-muted">→</span> {ask.targetValue}
                <span className="text-text-muted"> · by {ask.timeframe}</span>
              </p>
              <span className="mt-auto h-1 rounded-sm bg-paper overflow-hidden">
                <span className="block h-full bg-accent" style={{ width: `${(ask.voteCount / leader) * 100}%` }} />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose an ask">
        {asks.map((ask, i) => (
          <button
            key={ask.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Ask ${i + 1}`}
            onClick={() => go(i)}
            // Small dot, finger-sized hit area.
            className="p-1.5 -m-0.5"
          >
            <span
              className={cn(
                "block h-1.5 rounded-sm transition-[width,background-color] duration-300 motion-reduce:transition-none",
                i === active ? "w-5 bg-accent" : "w-1.5 bg-border",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
