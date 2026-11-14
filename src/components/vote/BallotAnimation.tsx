"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Ask } from "@/lib/types";
import {
  InkMark,
  INK_MARK_ART,
  INK_MARK_DURATION,
  INK_MARK_FORMED_AT,
} from "@/components/vote/InkMark";

/**
 * The celebratory moment after "Finish & share". Three line-art layers cut
 * from one drawing (public/ballot-box.png, ballot-card.png, ballot-hand.png;
 * the scans are in docs/assets/*-v2-source.png) share a single coordinate
 * system, so they line up by construction. Once per vote the hand arrives
 * with a tilted card, lowers it straight down until it is halfway into the
 * slot, lets go, and the card falls straight down the rest of the way
 * (clipped at the slot line, so it visibly goes *in*) while the hand rises
 * clear of the box and fades. The ask ticks onto the checklist as its card drops.
 * After the last one the box fades and the voter's hand rises where it stood
 * to be inked; the camera pushes in until its fingertip is the logo (InkMark).
 *
 * Why layers: a single illustration with the card baked into the hand can
 * never have the card stay behind when the hand rises.
 *
 * Robustness, since this runs on every kind of laptop:
 *  - It waits for the images (ballot layers and InkMark's) before starting, so a card never drops
 *    "blank" on a slow connection (preloadBallotArt also warms the cache from
 *    the vote tray).
 *  - Every move is a transform in % of a layer that is the size of the stage
 *    (see globals.css), not container-query units, so no newer-browser CSS.
 *  - The images are served untouched (`unoptimized`): the optimizer re-encodes
 *    PNGs, which softens thin linework and can nick its transparency.
 *  - The overlay scrolls if the checklist outgrows a short screen, so
 *    Continue is always reachable.
 * Measured off the 1082×1219 layers: slot line at 74.2% of the width down.
 * Motion is vertical only — gravity, not the card's tilt, sets the path. The cycle's % marks in globals.css are the single
 * clock; checklist delays are derived from CYCLE_S / ENTER_AT here.
 */
const CYCLE_S = 1.8;
const ENTER_AT = 0.74 * CYCLE_S; // card has slipped fully into the slot
const HOLD_S = 2.2; // time on the finished logo and checklist before moving on
const HAND_GONE = 0.84 * CYCLE_S; // the last ballot hand has faded out
const BOX_FADE_S = 0.35;
const continueClass =
  "ballot-checklist-item mt-5 text-[13px] text-text-secondary hover:text-text underline decoration-transparent hover:decoration-current underline-offset-4 transition-colors cursor-pointer";
const ART = ["/ballot-box.png", "/ballot-card.png", "/ballot-hand.png", ...INK_MARK_ART];

let artPromise: Promise<void> | null = null;

/** Loads and decodes the art once; safe to call early and often. */
export function preloadBallotArt(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  artPromise ??= Promise.all(
    ART.map((src) => {
      const img = new window.Image();
      img.src = src;
      // decode() can reject (e.g. old Safari); the load itself is what matters.
      return (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
    }),
  ).then(() => {});
  return artPromise;
}

export function BallotAnimation({
  asks,
  onComplete,
  continueHref,
}: {
  asks: Ask[];
  onComplete: () => void;
  /** Where Continue goes. As a link it's prefetched in full while the
   *  animation plays (production only), so that page opens with its data. */
  continueHref?: string;
}) {
  const votedAsks = asks.slice(0, 3);
  const n = votedAsks.length;
  // After the last vote drops, the box makes way for the inked finger; the
  // title lands with the logo.
  const inkAt = (n - 1) * CYCLE_S + HAND_GONE;
  const inkStart = inkAt + BOX_FADE_S * 0.6;
  // The line under the logo lands in two beats, then the title.
  const lineAt = inkStart + INK_MARK_FORMED_AT;
  const titleAt = lineAt + 1.0;

  // Don't start until the art is in (or 2.5s have passed — never hang).
  const [ready, setReady] = useState(false);
  // Reduced motion: no drops, no ink — the finished logo and checklist.
  const [still, setStill] = useState(false);
  const [boxGone, setBoxGone] = useState(false);
  useEffect(() => {
    let live = true;
    const go = () => {
      if (!live) return;
      setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      setReady(true);
    };
    const timeout = setTimeout(go, 2500);
    preloadBallotArt().then(() => {
      clearTimeout(timeout);
      go();
    });
    return () => {
      live = false;
      clearTimeout(timeout);
    };
  }, []);

  const doneRef = useRef(false);
  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }

  useEffect(() => {
    if (!ready) return;
    const box = setTimeout(() => setBoxGone(true), inkAt * 1000);
    const t = setTimeout(finish, (inkStart + INK_MARK_DURATION + HOLD_S) * 1000);
    return () => {
      clearTimeout(box);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const cycles = { animationIterationCount: n } as const;

  if (!ready) return <div className="fixed inset-0 z-50 bg-paper" aria-hidden="true" />;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-6">
        <div className="ballot-stage relative">
          {/* margin-top in % is of the stage width: room above the box for the hand */}
          <div
            className="relative transition-opacity ease-in"
            style={{
              marginTop: "8%",
              opacity: boxGone || still ? 0 : 1,
              transitionDuration: `${BOX_FADE_S}s`,
            }}
          >
            <Image
              src="/ballot-box.png"
              alt=""
              width={1082}
              height={1219}
              unoptimized
              className="relative z-10 block w-full h-auto"
            />

            {/* Card layer: clipped at the slot line (34.1% of the height up from
                the bottom) so the card slips in. */}
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{ clipPath: "inset(-89% -30% 34.1% -30%)" }}
              aria-hidden="true"
            >
              <div className="ballot-card-cycle ballot-layer absolute inset-0" style={cycles}>
                <Image
                  src="/ballot-card.png"
                  alt=""
                  width={1082}
                  height={1219}
                  unoptimized
                  className="block w-full h-auto"
                />
              </div>
            </div>

            {/* Hand: arrives with the card, leaves once it lets go. The arm's
                far end is an open stroke, so it fades out rather than stopping
                short. */}
            <div
              className="ballot-hand-cycle ballot-layer absolute inset-0 z-30 pointer-events-none"
              style={cycles}
              aria-hidden="true"
            >
              <Image
                src="/ballot-hand.png"
                alt=""
                width={1082}
                height={1219}
                unoptimized
                className="block w-full h-auto ballot-hand-fade"
              />
            </div>
          </div>

          {/* The inked finger, over the same stage so it rises where the box stood. */}
          <div className="absolute inset-0 z-40 pointer-events-none">
            <InkMark delay={inkStart} freezeAt={still ? INK_MARK_DURATION : undefined} />
          </div>

          {/* Under the logo, in the room the stage leaves below it. Real
              election ink wears off; these votes are kept on record. Two
              centred lines, so each sentence lands centred on its own beat. */}
          <p className="absolute inset-x-0 top-[72%] z-40 text-center font-display italic text-[17px] leading-snug text-text-secondary">
            <span className="ballot-checklist-item block" style={{ animationDelay: `${lineAt}s` }}>
              The ink fades.
            </span>
            <span
              className="ballot-checklist-item block text-headline"
              style={{ animationDelay: `${lineAt + 0.5}s` }}
            >
              The record doesn&rsquo;t.
            </span>
          </p>
        </div>

        <p
          className="ballot-checklist-item font-display text-[22px] font-black text-headline tracking-[-0.02em] mt-2"
          style={{ animationDelay: `${titleAt}s` }}
        >
          Your votes are in
        </p>

        <div className="flex flex-col gap-2 mt-5 w-full max-w-sm">
          {votedAsks.map((ask, i) => (
            <div
              key={ask.id}
              className="ballot-checklist-item flex items-start gap-2.5 bg-card border border-border rounded-sm px-3.5 py-2.5"
              style={{ animationDelay: `${i * CYCLE_S + ENTER_AT}s` }}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="w-4 h-4 text-support shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <path
                  d="M4 10.5l3.5 3.5L16 6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-[13px] text-text leading-snug">{ask.askText}</p>
            </div>
          ))}
        </div>

        {continueHref ? (
          <Link
            href={continueHref}
            prefetch
            onClick={(e) => {
              e.preventDefault();
              finish();
            }}
            className={continueClass}
            // Early, so nobody has to sit through all of it.
            style={{ animationDelay: `${ENTER_AT}s` }}
          >
            Continue
          </Link>
        ) : (
          <button
            type="button"
            onClick={finish}
            className={continueClass}
            style={{ animationDelay: `${ENTER_AT}s` }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
