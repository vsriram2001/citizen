"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const GAP = 8; // between trigger and card
const EDGE = 8; // minimum distance from the window edge

/**
 * The desktop hover card beside an ask's icons (who answers, done before).
 *
 * Rendered into <body> with fixed positioning rather than as an absolute
 * child of the trigger: on /search the list is its own scrolling column, and
 * a scroll container clips anything that pokes out of it, so a card opening
 * to the right of an icon far along a row was cut off at the column's edge.
 *
 * Opens to the right of the anchor, top-aligned and growing down (side, not
 * below, so it doesn't sit on the row underneath). If there's no room on the
 * right it flips to the left; failing that it is clamped inside the window.
 * Follows the anchor while the list scrolls.
 *
 * React events bubble through portals by component tree, so the parent's
 * onPointerLeave still treats the card as "inside". Its click-outside check
 * is DOM-based, though, so it needs `cardRef` to know the card is its own.
 */
export function FloatingCard({
  anchorRef,
  cardRef,
  className,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  cardRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    function place() {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const card = cardRef.current;
      if (!anchor || !card) return;
      const width = card.offsetWidth;
      const height = card.offsetHeight;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;

      let left = anchor.right + GAP;
      if (left + width > vw - EDGE) left = anchor.left - GAP - width;
      left = Math.max(EDGE, Math.min(left, vw - EDGE - width));

      let top = anchor.top - 4;
      top = Math.max(EDGE, Math.min(top, vh - EDGE - height));

      setPos({ top, left });
    }
    place();
    // Capture: the list scrolls inside its own column, not the window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchorRef, cardRef]);

  return createPortal(
    <div
      ref={cardRef}
      role="tooltip"
      style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
      className={cn("fixed z-30 whitespace-normal", className)}
    >
      {children}
    </div>,
    document.body,
  );
}
