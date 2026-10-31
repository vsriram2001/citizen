"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { preloadBallotArt } from "@/components/vote/BallotAnimation";
import { answerableTo } from "@/components/home/answerableTo";
import { INTRO_SEEN_COOKIE } from "@/components/home/introCookie";
import type { Ask } from "@/lib/types";

/** Seconds into the opener; the final fade lives in globals.css. Paced to be
 *  read, not just seen: every line gets time to land before the next. */
const AT = {
  wishes: [0.2, 0.6, 1.0, 1.4],
  blame: 2.0,
  strikes: [2.6, 2.8, 3.0, 3.2],
  wishesOut: 3.8,
  makeIt: 4.2,
  ballotIn: 4.7,
  facts: [5.4, 5.9, 6.4],
  ballotOut: 8.0,
  box: 8.3,
  drops: 8.5,
  votes: [9.54, 10.94, 12.34],
  slotOpens: 12.8,
};

/** One vote's trip into the box: BallotAnimation's cycle, run three times. A
 *  card is gone 74% of the way through, which is when its segment fills. */
const DROP_S = 1.4;

// Ends on roads so the ask on the ballot answers the last wish struck.
const WISHES = ["Clean water.", "Good schools.", "Safe streets.", "Better roads."];

/** Never hold the opener longer than this waiting on fonts or art. */
const START_WAIT_MS = 1500;

const at = (seconds: number) => ({ "--at": `${seconds}s` }) as React.CSSProperties;

const POSTER = "font-display font-black text-paper tracking-[-0.045em]";

/** A line of the ballot, rising from behind its own edge. */
function Fact({ seconds, label, value }: { seconds: number; label: string; value?: string }) {
  return (
    <div className="overflow-hidden">
      <div className="intro-rise" style={at(seconds)}>
        <dt className="text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</dt>
        <dd className="text-[17px] font-semibold text-text leading-snug">{value}</dd>
      </div>
    </div>
  );
}

/**
 * Phones only, first visit only: about fourteen seconds on what this site is.
 * On a phone the hero can only show one thing at a time, so this tells the
 * story before the page has to, as one unbroken thing happening to one object.
 *
 * Navy, the one screen on the site that isn't paper. Wishes everyone agrees
 * with get struck out, because the first two seconds decide whether anyone
 * stays. Then the answer arrives as a ballot paper, that ballot goes into the
 * hand, and three votes drop in. The last slot opens and paper floods out of it:
 * the home page is that same paper, so the story lands on the site with no cut.
 *
 * The motion is CSS, held paused until `is-playing`: a CSS clock starts when
 * styles load, not when the screen paints, so on a slow load the first seconds
 * played unseen and people landed on a half-finished screen. So it waits for the
 * fonts, the ballot art and a painted first frame. A second, always-running
 * timer in globals.css clears the overlay if scripts never arrive, so it can't
 * trap anyone. Everything here repeats the page, so it's hidden from screen
 * readers, and reduced motion skips it.
 */
export function MobileIntro({ ask }: { ask: Ask }) {
  const [gone, setGone] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // Not on desktop, where it never showed: a phone-sized window later should
    // still get the first-visit version.
    if (!window.matchMedia("(max-width: 39.99rem)").matches) return;
    document.cookie = `${INTRO_SEEN_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;

    let live = true;
    const ready = Promise.all([document.fonts.ready, preloadBallotArt()]);
    const tooLong = new Promise((done) => setTimeout(done, START_WAIT_MS));
    Promise.race([ready, tooLong]).then(() => {
      // Two frames: the first schedules, the second means it was on screen.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (live) setPlaying(true);
        }),
      );
    });
    return () => {
      live = false;
    };
  }, []);

  if (gone) return null;

  const drop = { animationDelay: `${AT.drops}s`, animationDuration: `${DROP_S}s`, animationIterationCount: 3 };

  return (
    <div
      className={cn(
        "mobile-intro fixed inset-0 z-50 bg-navy overflow-hidden touch-none sm:hidden",
        playing && "is-playing",
      )}
      onClick={() => setGone(true)}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setGone(true);
      }}
    >
      {/* Same height and gutter as SiteHeader. */}
      <div className="absolute inset-x-0 top-[env(safe-area-inset-top)] z-20 h-14 flex items-center justify-between px-4 text-paper">
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Citizen Poll</span>
        <button type="button" className="text-[13px] underline underline-offset-4 py-2 -my-2 cursor-pointer">
          Skip
        </button>
      </div>

      <div className="absolute inset-0" aria-hidden>
        {/* Wishes */}
        <div
          className="intro-out absolute inset-0 flex flex-col justify-center gap-6 px-5"
          style={at(AT.wishesOut)}
        >
          <div className="flex flex-col">
            {WISHES.map((wish, i) => (
              <span key={wish} className="relative w-fit overflow-hidden">
                <span
                  className={cn("intro-wish block text-[clamp(44px,13.6vw,60px)] leading-[1.14] whitespace-nowrap", POSTER)}
                  style={{ "--at": `${AT.wishes[i]}s`, "--dim": `${AT.strikes[i]}s` } as React.CSSProperties}
                >
                  {wish}
                </span>
                <span className="intro-strike absolute left-0 top-[56%] h-1 w-full bg-paper" style={at(AT.strikes[i])} />
              </span>
            ))}
          </div>
          <p className="intro-in text-xl text-paper leading-snug" style={at(AT.blame)}>
            Everyone has wishes.
            <br />
            Nobody has to answer for them.
          </p>
        </div>

        {/* The ballot */}
        <div
          className="intro-out absolute inset-0 flex flex-col justify-center gap-5 px-5 pt-14"
          style={at(AT.ballotOut)}
        >
          <span className="block overflow-hidden">
            <span
              className={cn("intro-rise block text-[min(11.3vw,60px)] leading-[1.1] whitespace-nowrap", POSTER)}
              style={at(AT.makeIt)}
            >
              So make it an ask.
            </span>
          </span>
          <div
            className="intro-ballot flex flex-col gap-3 bg-paper rounded-card p-5"
            style={{ "--at": `${AT.ballotIn}s`, "--out": `${AT.ballotOut}s` } as React.CSSProperties}
          >
            <p className="text-[22px] font-semibold text-text leading-tight">{ask.askText}</p>
            <dl className="flex flex-col gap-2.5 border-t border-border pt-3">
              <Fact seconds={AT.facts[0]} label="A number" value={ask.targetValue} />
              <Fact seconds={AT.facts[1]} label="A date" value={ask.timeframe} />
              <Fact seconds={AT.facts[2]} label="A name" value={answerableTo(ask)} />
            </dl>
          </div>
        </div>

        {/* Three votes. bg-navy: this scene is its own stacking context while it
            animates, and the art's screen blend needs something opaque to hit. */}
        <div
          className="intro-in absolute inset-0 bg-navy flex flex-col items-center justify-center px-5 pt-14"
          style={at(AT.box)}
        >
          <div className="ballot-stage">
            {/* No z-index here: it would cut the blend below off from the navy. */}
            <div className="relative" style={{ marginTop: "8%" }}>
              {/* The art is dark line on paper fill. Inverted, then screened as
                  one group, the lines turn to chalk and the fill drops to navy,
                  while the hand still hides the box. */}
              <div className="relative invert mix-blend-screen">
                <Image src="/ballot-box.png" alt="" width={1082} height={1219} unoptimized className="relative z-10 block w-full h-auto" />
                {/* Same layers and clip as BallotAnimation: the card goes *in*. */}
                <div className="absolute inset-0 z-20" style={{ clipPath: "inset(-89% -30% 34.1% -30%)" }}>
                  <div className="ballot-card-cycle ballot-layer absolute inset-0" style={drop}>
                    <Image src="/ballot-card.png" alt="" width={1082} height={1219} unoptimized className="block w-full h-auto" />
                  </div>
                </div>
                <div className="ballot-hand-cycle ballot-layer absolute inset-0 z-30" style={drop}>
                  <Image src="/ballot-hand.png" alt="" width={1082} height={1219} unoptimized className="block w-full h-auto ballot-hand-fade" />
                </div>
              </div>
              {/* Centred on the slot line, 65.9% down the art (see BallotAnimation):
                  the slot opens and paper fills the screen. */}
              <span className="intro-slot absolute z-10 left-1/2 top-[65.9%] w-[300vw] h-[300vh] -ml-[150vw] -mt-[150vh] bg-paper" style={at(AT.slotOpens)} />
            </div>
          </div>

          <p className={cn("mt-2 text-center text-[38px] leading-[1.08] text-balance", POSTER)}>
            You get three votes a year.
          </p>
          {/* VoteMeter's segments, one for each card that goes in. */}
          <div className="mt-5 flex gap-1.5 w-full max-w-[220px]">
            {AT.votes.map((seconds) => (
              <span key={seconds} className="relative h-1.5 flex-1 rounded-sm bg-paper/25 overflow-hidden">
                <span className="intro-fill absolute inset-0 bg-paper" style={at(seconds)} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
