"use client";

import { useSyncExternalStore } from "react";

/** Live `matchMedia` result. False on the server and on the first client
 *  render, so server and client markup match; corrects itself right after. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** A finger, not a mouse: no hover, so hover popovers become tap sheets. */
export function useIsTouch(): boolean {
  return useMediaQuery("(hover: none), (pointer: coarse)");
}

/**
 * onFocus handler for a field with something that opens under it (city
 * search, occupation list) or a tall one (textarea): once the keyboard has
 * finished sliding up, scroll the field to where it and its list are both
 * visible. Browsers only guarantee the caret is visible, which on a phone
 * often leaves the field on the keyboard's top edge and its list behind it.
 */
export function revealOnFocus(block: ScrollLogicalPosition = "start") {
  return (e: React.FocusEvent<HTMLElement>) => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const el = e.currentTarget;
    setTimeout(() => {
      if (document.activeElement === el) el.scrollIntoView({ block, behavior: "smooth" });
    }, 350);
  };
}
