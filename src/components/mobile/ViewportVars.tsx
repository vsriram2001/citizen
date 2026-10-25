"use client";

import { useEffect } from "react";

// A drop in visible height bigger than any browser toolbar collapsing, so
// only the keyboard (or iOS's select wheel) counts.
const KEYBOARD_MIN_PX = 150;

const TEXT_ENTRY =
  "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]):not([type=file]), textarea, select, [contenteditable=true]";

/**
 * Publishes the *visible* viewport to CSS, once, for the whole app:
 *
 *   --vv-height / --vv-top  the area actually on screen. Sheets pin to it, so
 *                           when the keyboard opens they shrink to sit above
 *                           it instead of being covered (iOS never resizes
 *                           the layout for the keyboard; this is the only
 *                           reliable signal there).
 *   --kb-inset              how much of the layout the keyboard covers.
 *   html[data-keyboard=open] while a keyboard is up — page-level bottom bars
 *                           use .hide-on-keyboard to step aside.
 *
 * Android Chrome resizes the layout itself (viewport interactiveWidget in
 * app/layout.tsx), so there the keyboard is detected against the tallest
 * height seen at the current width rather than against innerHeight.
 */
export function ViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;

    let width = window.innerWidth;
    // Tallest keyboard-free height at this width, in screen-scaled px so a
    // pinch zoom (which also shrinks vv.height) isn't mistaken for a keyboard.
    let tallest = window.innerHeight;
    let frame = 0;

    function update() {
      frame = 0;
      if (window.innerWidth !== width) {
        // Rotated or resized: start over.
        width = window.innerWidth;
        tallest = window.innerHeight;
      }
      const visible = vv!.height * vv!.scale;
      tallest = Math.max(tallest, window.innerHeight, visible);

      root.style.setProperty("--vv-height", `${vv!.height}px`);
      root.style.setProperty("--vv-top", `${vv!.offsetTop}px`);
      root.style.setProperty(
        "--kb-inset",
        `${Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop)}px`,
      );

      const typing = document.activeElement?.matches(TEXT_ENTRY) ?? false;
      if (typing && tallest - visible > KEYBOARD_MIN_PX) root.dataset.keyboard = "open";
      else delete root.dataset.keyboard;
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Focus moving between two fields fires focusout then focusin; wait a
    // beat so the bars don't flash in between.
    let blurTimer: ReturnType<typeof setTimeout> | undefined;
    const onFocusOut = () => {
      clearTimeout(blurTimer);
      blurTimer = setTimeout(schedule, 120);
    };

    update();
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    window.addEventListener("focusin", schedule);
    window.addEventListener("focusout", onFocusOut);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(blurTimer);
      vv.removeEventListener("resize", schedule);
      vv.removeEventListener("scroll", schedule);
      window.removeEventListener("focusin", schedule);
      window.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return null;
}
