"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Delta } from "@/components/ask/AskCard";
import { AskDrawing } from "@/components/home/AskDrawings";
import { VerificationBadge } from "@/components/ui/Badge";
import { answerableTo } from "@/components/home/answerableTo";
import type { Ask } from "@/lib/types";

const HOLD_MS = 5200;
/** Hidden on phones short of 700px of visible height. */
const TALL_PHONES_UP = "max-sm:[@media(max-height:699px)]:hidden";
const TYPE_MS = 55;

/*
  Drawn as a ballot slip: a stub with a serial number and the Unverified badge,
  a perforated tear line, then the wish and the ask, with a line drawing of the
  ask (AskDrawings) that draws itself in.

  Steady height: every full wish is laid out invisibly in the same cell, so the
  wish row is always as tall as the longest one. Before, a long wish
  ("Healthcare I can afford") wrapped beside the badge on narrow phones while
  it typed, and the card grew and shrank.
*/

/**
 * The product's whole idea in one loop: a wish is typed, struck through, and
 * becomes an ask. Starts on a finished example so the card says its piece
 * before anything moves, and stays there under reduced motion.
 *
 * Every ask sits in the same grid cell with only the current one visible, so
 * the tallest sets the height and the page below never jumps as they change.
 */
export function WishToAsk({ examples }: { examples: { wish: string; ask: Ask }[] }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState<number | null>(null); // null = the whole wish
  const [resolved, setResolved] = useState(true);

  useEffect(() => {
    if (examples.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

    (async () => {
      let next = 0;
      await sleep(HOLD_MS);
      while (!cancelled) {
        setResolved(false);
        await sleep(450);
        if (cancelled) return;

        next = (next + 1) % examples.length;
        setIndex(next);
        for (let n = 0; n <= examples[next].wish.length; n++) {
          if (cancelled) return;
          setTyped(n);
          await sleep(TYPE_MS);
        }
        await sleep(800);
        if (cancelled) return;

        setResolved(true);
        await sleep(HOLD_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [examples]);

  const { wish } = examples[index];

  return (
    // Drawn as a ballot slip: a stub with a serial number and the badge, a
    // perforated tear line with notches cut into both edges, then the slip.
    // Phones: this shares one screen with the headline and the buttons, so the
    // deadline and names only show on screens tall enough to hold them. Every
    // ask keeps its full detail on the ballot below.
    <div className="relative overflow-hidden bg-card border border-border rounded-card">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3">
        <span className="flex items-baseline gap-2 min-w-0 text-[11px] uppercase tracking-[0.16em] text-text-muted">
          <span className="whitespace-nowrap tabular-nums tracking-[0.08em] text-text-secondary">
            N&ordm;&nbsp;{String(index + 1).padStart(4, "0")}
          </span>
          {/* Phones: the stub is just the serial and the badge. */}
          <span className="max-sm:hidden truncate">A wish becomes an ask</span>
        </span>
        <VerificationBadge status="unverified" />
      </div>

      {/* Tear line. The notches are paper-coloured circles centred on the card's
          edges; overflow-hidden on the card keeps only their inner halves. */}
      <div className="relative" aria-hidden>
        <div className="mx-4 sm:mx-6 border-t-2 border-dashed border-border" />
        <span className="absolute -left-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-paper border border-border" />
        <span className="absolute -right-2 top-1/2 -translate-y-1/2 size-4 rounded-full bg-paper border border-border" />
      </div>

      <div className="flex flex-col gap-2.5 sm:gap-4 p-4 sm:p-6 pt-3 sm:pt-5">
        <div
          className="grid font-sans text-base sm:text-lg text-text-secondary"
          aria-hidden
        >
          {/* Sizers: the row takes the height of the longest wish, typed or not. */}
          {examples.map((e) => (
            <span key={e.wish} className="[grid-area:1/1] invisible">
              &ldquo;{e.wish}&rdquo;
            </span>
          ))}
          <p className="[grid-area:1/1] self-start relative w-fit max-w-full">
            &ldquo;{typed === null ? wish : wish.slice(0, typed)}
            {!resolved && (
              <span className="inline-block w-0.5 h-[1em] -mb-0.5 ml-0.5 bg-accent animate-pulse" />
            )}
            &rdquo;
            <span
              className={cn(
                "absolute left-0 top-1/2 h-0.5 w-full origin-left bg-accent/70 transition-transform duration-500 motion-reduce:transition-none",
                resolved ? "scale-x-100" : "scale-x-0",
              )}
            />
          </p>
        </div>

        <div className="grid border-t border-border pt-2.5 sm:pt-4">
          {examples.map(({ ask }, i) => (
            <div
              key={ask.id}
              className={cn(
                "[grid-area:1/1] flex flex-col gap-2 sm:gap-3 transition-[opacity,transform] duration-500 motion-reduce:transition-none",
                i !== index && "invisible",
                i === index && !resolved && "opacity-0 translate-y-1.5",
              )}
            >
              <h3 className="font-sans text-[17px] sm:text-xl font-semibold text-text leading-snug tracking-normal">
                {ask.askText}
              </h3>
              <div className={cn("flex items-center gap-1.5", TALL_PHONES_UP)}>
                <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Deadline</span>
                <span className="text-sm font-semibold text-text tabular-nums">{ask.timeframe}</span>
              </div>
              <Delta
                ask={ask}
                className="text-sm sm:text-[15px] py-2 sm:py-2.5 px-3 bg-paper border border-border rounded-sm"
              />
              {/* The ask, drawn, gets its own space at the end of the last row.
                  It used to sit behind the text in the corner, where the
                  solid "from → to" strip above covered it on some asks. */}
              <div className={cn("flex items-end justify-between gap-3", TALL_PHONES_UP)}>
                <p className="min-w-0 text-sm text-text-secondary leading-relaxed">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted mr-1.5">
                    Answerable to
                  </span>
                  <span className="font-semibold text-text">{answerableTo(ask)}</span>
                </p>
                {/* Draws itself in once the wish has become this ask. */}
                <AskDrawing
                  id={ask.id}
                  drawn={i === index && resolved}
                  className="shrink-0 w-16 sm:w-24 -mb-1 text-muted opacity-60"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
