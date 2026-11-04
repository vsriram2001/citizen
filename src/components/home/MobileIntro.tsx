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
  wishes: [0.26, 0.78, 1.3, 1.82],
  strikes: [2.6, 2.8, 3.0, 3.2],
  blame: 3.8,
  wishesOut: 5.94,
  makeIt: 6.46,
  ballotIn: 7.11,
  facts: [8.02, 8.67, 9.32],
  ballotOut: 11.4,
  box: 11.79,
  drops: 12.05,
  votes: [13.4, 15.22, 17.04],
  wisely: 13.4,
  boxOut: 17.9,
  why: 18.3,
  answers: [19.8, 24.3, 28.8],
  arcOut: 20.6,
  arcBack: 25.1,
  tick: 29.3,
  pulses: [29.9, 30.5],
  slotOpens: 33.3,
};

/** One vote's trip into the box: BallotAnimation's cycle, run three times. A
 *  card is gone 74% of the way through, which is when its segment fills. */
const DROP_S = 1.82;

// Ends on roads so the ask on the ballot answers the last wish struck.
const WISHES = ["Clean water.", "Good schools.", "Safe streets.", "Better roads."];

// People told us they couldn't see why the site exists, so the opener ends on it.
const ANSWERS = [
  { who: "You", body: "answer for what you ask: a real number, a date, and only three votes a year." },
  { who: "Leaders", body: "answer for what they deliver: every ask names who is responsible." },
  { who: "We", body: "check when the date arrives, and show whether it was delivered." },
];

/** Never hold the opener longer than this waiting on fonts or art. */
const START_WAIT_MS = 1500;

const at = (seconds: number) => ({ "--at": `${seconds}s` }) as React.CSSProperties;

const POSTER = "font-display font-black text-paper tracking-[-0.045em]";

// The why scene's drawing, in the ballot art's chalk line: the ask goes out over
// the top, delivery comes back underneath, and the check sits between them.
const BALLOT = ["M34 60h52v72H34z", "M46 76h20v20H46z", "M50 86l6 6 14-18", "M46 110h28", "M46 120h18"];
const LEADERS = ["M250 78L290 54L330 78z", "M260 86v38", "M280 86v38", "M300 86v38", "M320 86v38", "M248 130h84"];
const CALENDAR = ["M151 72h48v48h-48z", "M151 86h48", "M163 66v10", "M187 66v10"];
const ARC_OUT = "M72 50C120 8 230 8 276 44";
const ARC_BACK = "M282 140C230 184 120 184 72 146";

/** One chalk stroke, drawing itself on. */
function Draw({ seconds, d, width = 3 }: { seconds: number; d: string; width?: number }) {
  return <path className="intro-draw" style={at(seconds)} d={d} pathLength={1} strokeWidth={width} />;
}

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
 * First visit only: about 34 seconds on what this site is and why. It began on
 * phones, where the hero can only show one thing at a time, and now plays at
 * every width: the story is the same, and from lg the scenes sit side by side.
 * It tells the story before the page has to, as one unbroken thing happening to
 * one object.
 *
 * Navy, the one screen on the site that isn't paper. Wishes everyone agrees
 * with get struck out, because the first two seconds decide whether anyone
 * stays. Then the answer arrives as a ballot paper, that ballot goes into the
 * hand, and three votes drop in. Then why it matters: who answers for what. A
 * last slot opens and paper floods out of it: the home page is that same paper,
 * so the story lands on the site with no cut.
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

  // Desktop: touch-none doesn't stop a wheel, and the paper reveal has to land on
  // the top of the page. Reduced motion never shows the overlay, so nothing to hold.
  useEffect(() => {
    if (gone || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { documentElement: root } = document;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGone(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [gone]);

  // At ~34 seconds with no touch, phones dimmed or slept before the end, and the
  // tap that woke them skipped what was left. Keep the screen on until it's done.
  // The browser drops the lock when the tab is hidden, so take it again on return.
  // Reduced motion never shows the overlay or ends it, so it would never let go.
  useEffect(() => {
    if (gone || !("wakeLock" in navigator) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lock: WakeLockSentinel | null = null;
    let live = true;
    const take = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (live) lock = sentinel;
          else sentinel.release();
        })
        .catch(() => {}); // Low battery or a policy said no: the intro still plays.
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", take);
      lock?.release().catch(() => {});
    };
  }, [gone]);

  if (gone) return null;

  const drop = { animationDelay: `${AT.drops}s`, animationDuration: `${DROP_S}s`, animationIterationCount: 3 };

  return (
    <div
      className={cn(
        "mobile-intro fixed inset-0 z-50 bg-navy overflow-hidden touch-none",
        playing && "is-playing",
      )}
      onClick={() => setGone(true)}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setGone(true);
      }}
    >
      {/* Same height and gutter as SiteHeader. */}
      <div className="absolute inset-x-0 top-[env(safe-area-inset-top)] z-20 mx-auto max-w-7xl h-14 flex items-center justify-between px-4 sm:px-6 text-paper">
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Citizen Poll</span>
        <button type="button" className="text-[13px] underline underline-offset-4 py-2 -my-2 cursor-pointer">
          Skip
        </button>
      </div>

      <div className="absolute inset-0" aria-hidden>
        {/* Wishes */}
        <div
          className="intro-out absolute inset-0 mx-auto max-w-7xl sm:max-lg:max-w-xl flex flex-col justify-center gap-6 px-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12"
          style={at(AT.wishesOut)}
        >
          <div className="flex flex-col">
            {WISHES.map((wish, i) => (
              <span key={wish} className="relative w-fit overflow-hidden">
                <span
                  className={cn("intro-wish block text-[clamp(44px,13.6vw,60px)] sm:text-[min(10vw,13svh,116px)] leading-[1.14] whitespace-nowrap", POSTER)}
                  style={{ "--at": `${AT.wishes[i]}s`, "--dim": `${AT.strikes[i]}s` } as React.CSSProperties}
                >
                  {wish}
                </span>
                <span className="intro-strike absolute left-0 top-[56%] h-1 lg:h-1.5 w-full bg-paper" style={at(AT.strikes[i])} />
              </span>
            ))}
          </div>
          <p className="intro-in text-xl lg:text-2xl lg:shrink-0 text-paper leading-snug" style={at(AT.blame)}>
            Everyone has wishes.
            <br />
            Nobody has to answer for them.
          </p>
        </div>

        {/* The ballot */}
        <div
          className="intro-out absolute inset-0 mx-auto sm:max-w-xl lg:max-w-6xl flex flex-col justify-center gap-5 px-5 sm:px-6 pt-14 lg:flex-row lg:items-center lg:gap-16"
          style={at(AT.ballotOut)}
        >
          <span className="block overflow-hidden lg:flex-1 lg:py-2">
            <span
              className={cn("intro-rise block text-[min(11.3vw,60px)] lg:text-[min(6.8vw,88px)] leading-[1.1] whitespace-nowrap lg:whitespace-normal", POSTER)}
              style={at(AT.makeIt)}
            >
              So make it an ask.
            </span>
          </span>
          <div
            className="intro-ballot flex flex-col gap-3 bg-paper rounded-card p-5 lg:flex-1 lg:p-7"
            style={{ "--at": `${AT.ballotIn}s`, "--out": `${AT.ballotOut}s` } as React.CSSProperties}
          >
            <p className="text-[22px] lg:text-[26px] font-semibold text-text leading-tight">{ask.askText}</p>
            <dl className="flex flex-col gap-2.5 border-t border-border pt-3">
              <Fact seconds={AT.facts[0]} label="A number" value={ask.targetValue} />
              <Fact seconds={AT.facts[1]} label="A date" value={ask.timeframe} />
              <Fact seconds={AT.facts[2]} label="A name" value={answerableTo(ask)} />
            </dl>
          </div>
        </div>

        {/* Three votes. bg-navy: this scene is its own stacking context while it
            animates, and the art's screen blend needs something opaque to hit.
            The out sits on a wrapper: one element can't run intro-in and intro-out. */}
        <div className="intro-out absolute inset-0" style={at(AT.boxOut)}>
        <div
          className="intro-in absolute inset-0 bg-navy flex flex-col items-center justify-center px-5 pt-14 lg:flex-row lg:gap-20"
          style={at(AT.box)}
        >
          <div className="ballot-stage lg:w-[min(30vw,420px,58svh)]!">
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
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-start lg:max-w-xl">
            <p className={cn("mt-2 lg:mt-0 text-center lg:text-left text-[38px] sm:text-[52px] lg:text-[min(6vw,76px)] leading-[1.08] text-balance", POSTER)}>
              You get three votes a year.
            </p>
            <p className="intro-in mt-2 lg:mt-4 text-center lg:text-left text-xl lg:text-2xl text-paper leading-snug" style={at(AT.wisely)}>
              Choose wisely.
            </p>
            {/* VoteMeter's segments, one for each card that goes in. */}
            <div className="mt-5 lg:mt-7 flex gap-1.5 w-full max-w-[220px] lg:max-w-[320px]">
              {AT.votes.map((seconds) => (
                <span key={seconds} className="relative h-1.5 flex-1 rounded-sm bg-paper/25 overflow-hidden">
                  <span className="intro-fill absolute inset-0 bg-paper" style={at(seconds)} />
                </span>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* Why this exists. The drawing builds up beat by beat while one answer
            shows at a time, sharing a grid cell so nothing shifts as they swap.
            The tick is generic on purpose: no real ask or person is shown as
            delivered. */}
        <div className="absolute inset-0 mx-auto sm:max-w-xl lg:max-w-6xl flex flex-col justify-center gap-5 px-5 sm:px-6 pt-14 lg:grid lg:grid-cols-2 lg:content-center lg:items-center lg:gap-x-16">
          <div className="intro-in flex flex-col gap-2 lg:self-end" style={at(AT.why)}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-paper/70">Why this exists</p>
            <p className={cn("text-[38px] lg:text-[min(5.2vw,68px)] leading-[1.08] text-balance", POSTER)}>
              Accountability runs both ways.
            </p>
          </div>

          {/* No animation on this wrapper: it would trap the slot's z-index. */}
          <div className="relative lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <svg
              viewBox="0 0 350 190"
              className="block w-full overflow-visible text-paper"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <g transform="rotate(-8 60 96)">
                {BALLOT.map((d, i) => (
                  <Draw key={d} seconds={AT.answers[0] + i * 0.12} d={d} />
                ))}
              </g>
              <g opacity={0.55}>
                <Draw seconds={AT.arcOut} d={ARC_OUT} />
                <Draw seconds={AT.arcOut + 0.6} d="M270 29L276 44L260 42" />
                <Draw seconds={AT.arcBack} d={ARC_BACK} />
                <Draw seconds={AT.arcBack + 0.6} d="M78 161L72 146L88 148" />
              </g>
              {LEADERS.map((d, i) => (
                <Draw key={d} seconds={AT.answers[1] + i * 0.1} d={d} />
              ))}
              <g className="intro-stamp" style={at(AT.answers[2])}>
                {CALENDAR.map((d) => (
                  <path key={d} d={d} strokeWidth={3} />
                ))}
                <Draw seconds={AT.tick} d="M162 103l8 8 18-20" width={4} />
              </g>
              {/* Round the loop once, so the check reads as closing it. */}
              <path className="intro-pulse" style={at(AT.pulses[0])} d={ARC_OUT} pathLength={1} strokeWidth={4} />
              <path className="intro-pulse" style={at(AT.pulses[1])} d={ARC_BACK} pathLength={1} strokeWidth={4} />
            </svg>
            {/* The check opens and paper fills the screen. */}
            <span className="intro-slot absolute z-10 left-1/2 top-1/2 w-[300vw] h-[300vh] -ml-[150vw] -mt-[150vh] bg-paper" style={at(AT.slotOpens)} />
          </div>

          <dl className="grid lg:col-start-1 lg:row-start-2 lg:self-start">
            {ANSWERS.map(({ who, body }, i) => (
              <div
                key={who}
                className="intro-beat col-start-1 row-start-1"
                style={{ "--at": `${AT.answers[i]}s`, "--out": `${AT.answers[i + 1] ?? 99}s` } as React.CSSProperties}
              >
                <dt className={cn("text-[28px] lg:text-[36px] leading-tight", POSTER)}>{who}</dt>
                <dd className="text-[17px] lg:text-xl text-paper leading-snug">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
