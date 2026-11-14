"use client";

import { useEffect, useState } from "react";
import { MobileIntro } from "@/components/home/MobileIntro";
import type { Ask } from "@/lib/types";

/*
  The opener plays once, on a first visit, and people told us they missed it or
  skipped it before it said why the site exists. So the home header carries a
  way to play it again.

  The button lives in SiteHeader, which renders its extras twice (desktop nav
  and phone bar), so it can't own the overlay: two buttons would mean two
  overlays. It sends a window event instead, and the one IntroPlayer on the
  page answers it.
*/

const REPLAY_EVENT = "cp:replay-intro";

export function IntroPlayer({ ask, autoPlay }: { ask: Ask; autoPlay: boolean }) {
  // Each run is a fresh mount, so the CSS timeline starts from zero again.
  const [run, setRun] = useState(autoPlay ? 1 : 0);

  useEffect(() => {
    const replay = () => {
      // The ending floods paper onto the top of the page, so start from there.
      window.scrollTo(0, 0);
      setRun((n) => n + 1);
    };
    window.addEventListener(REPLAY_EVENT, replay);
    return () => window.removeEventListener(REPLAY_EVENT, replay);
  }, []);

  return run > 0 ? <MobileIntro key={run} ask={ask} /> : null;
}

/** Header control for IntroPlayer. Hidden under reduced motion, where the
 *  opener never shows, so it would do nothing. */
export function ReplayIntroButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(REPLAY_EVENT))}
      className="motion-reduce:hidden flex h-10 sm:h-auto items-center gap-1.5 text-[13px] text-text-secondary hover:text-text active:text-text transition-colors cursor-pointer shrink-0"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6.5 5.2v5.6L11 8z" fill="currentColor" />
      </svg>
      <span className="sm:hidden">Intro</span>
      <span className="hidden sm:inline">Watch intro</span>
    </button>
  );
}
