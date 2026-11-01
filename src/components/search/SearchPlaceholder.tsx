"use client";

import { useState } from "react";

/** Topics between whole asks with a number in them, so the hint shows both
 *  work. Short: at 320px anything past about 24 characters gets cut off. */
const EXAMPLES = [
  "water",
  "cut traffic by 35%",
  "school fees",
  "cut air pollution by 40%",
  "jobs",
  "cap fee hikes at 5%",
  "safer roads",
  "50 km more metro",
];

/**
 * Stands in for the box's placeholder, which browsers can't animate: each
 * example slides up and out and the next takes over, one animation loop each.
 * With reduced motion no loop runs, so the first example just stays.
 */
export function SearchPlaceholder() {
  const [index, setIndex] = useState(0);
  return (
    <span
      aria-hidden
      className="flex h-6 overflow-hidden whitespace-pre text-[15px] leading-6 text-text-muted"
    >
      Try{" "}
      <span
        className="placeholder-swap min-w-0 truncate"
        onAnimationIteration={() => setIndex((i) => (i + 1) % EXAMPLES.length)}
      >
        &ldquo;{EXAMPLES[index]}&rdquo;
      </span>
    </span>
  );
}
