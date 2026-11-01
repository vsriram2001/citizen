import { EMPTY_FILTERS, facetOptions, type FacetKey } from "@/lib/filters";
import type { Ask } from "@/lib/types";

const SUGGESTION_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;
/** Short things first: a topic or place is a broader search than one ask. */
const SUGGESTED_FACETS: FacetKey[] = ["topics", "cities", "states"];

/** The typed text starts the value, or any word in it. */
function startsAWord(value: string, typed: string): boolean {
  const text = value.toLowerCase();
  return text.startsWith(typed) || text.includes(` ${typed}`);
}

/**
 * What to offer under the box while typing: topics, places, then asks (they
 * arrive vote-ranked). Only what actually exists, so a tap always finds
 * something. A full sentence matches nothing here, which is the point: an
 * idea being written shouldn't have a list opening over the add-ask panel.
 */
export function searchSuggestions(asks: Ask[], query: string): string[] {
  const typed = query.trim().toLowerCase();
  if (typed.length < MIN_QUERY_LENGTH) return [];
  const facets = SUGGESTED_FACETS.flatMap((key) =>
    facetOptions(asks, EMPTY_FILTERS, key)
      .sort((a, b) => b.count - a.count)
      .map((o) => o.value),
  );
  const candidates = [...facets, ...asks.map((ask) => ask.askText)];
  const matches = candidates.filter(
    (value) => value.toLowerCase() !== typed && startsAWord(value, typed),
  );
  // Tags arrive in mixed case ("Education", "education"); the first one stands for both.
  const byText = new Map(matches.map((value) => [value.toLowerCase(), value]).reverse() as [string, string][]);
  return [...byText.values()].reverse().slice(0, SUGGESTION_LIMIT);
}
