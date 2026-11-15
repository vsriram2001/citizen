/*
  How many votes an ask needs before it goes to the officials it names, as the
  home page explains it (page.tsx, SystemFlowVariants, SystemFlow). One place,
  so the copy and the drawings can't drift apart. A plain module, not a client
  one, so the server-rendered page can read the value too.

  Not enforced anywhere yet: sending is still planned (drawn dashed).
*/

export const DELIVERY_THRESHOLD = 100_000;

/** The threshold as people say it: "1 lakh". */
export const DELIVERY_THRESHOLD_LABEL = "1 lakh";

/** A vote count the Indian way, short enough for a narrow drawing: 1.42L, 76K, 950. */
export function shortVotes(n: number): string {
  if (n >= 100_000) return `${+(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
}
