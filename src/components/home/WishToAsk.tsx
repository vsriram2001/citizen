"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Delta } from "@/components/ask/AskCard";
import { Card } from "@/components/ui/Card";
import { VerificationBadge } from "@/components/ui/Badge";
import { answerableTo } from "@/components/home/answerableTo";
import type { Ask } from "@/lib/types";

const HOLD_MS = 5200;
const TYPE_MS = 55;

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
    <Card className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
          A wish becomes an ask
        </span>
        <VerificationBadge status="unverified" />
      </div>

      <p className="relative w-fit max-w-full font-sans text-lg text-text-secondary min-h-[1.75rem]" aria-hidden>
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

      <div className="grid border-t border-border pt-4">
        {examples.map(({ ask }, i) => (
          <div
            key={ask.id}
            className={cn(
              "[grid-area:1/1] flex flex-col gap-3 transition-[opacity,transform] duration-500 motion-reduce:transition-none",
              i !== index && "invisible",
              i === index && !resolved && "opacity-0 translate-y-1.5",
            )}
          >
            <h3 className="font-sans text-xl font-semibold text-text leading-snug tracking-normal">
              {ask.askText}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Deadline</span>
              <span className="text-sm font-semibold text-text tabular-nums">{ask.timeframe}</span>
            </div>
            <Delta
              ask={ask}
              className="text-[15px] py-2.5 px-3 bg-paper border border-border rounded-sm"
            />
            <p className="text-sm text-text-secondary leading-relaxed">
              <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted mr-1.5">
                Answerable to
              </span>
              <span className="font-semibold text-text">{answerableTo(ask)}</span>
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
