import { ALL_INDIA, isPlaceName, placesFor } from "@/lib/places";
import type { Ask } from "@/lib/types";

/*
  Filters and sort for the Popular list. Kept apart from lib/match.ts:
  matching decides what the typed query hits, this decides how the
  remaining asks are narrowed and ordered. Pure functions, no React.

  Semantics (the Ajio/Zomato convention people already know): options
  within one facet are OR-ed ("Karnataka or Maharashtra"), facets are
  AND-ed ("Karnataka and Transport"). Option counts are faceted — each
  count ignores its own facet's selection but respects every other one,
  so a count always says how many asks you'd see after ticking it.
*/

export type SortKey = "votes" | "deadline-soon" | "deadline-late";

export const SORT_OPTIONS: { value: SortKey; label: string; heading: string; hint: string }[] = [
  { value: "votes", label: "Most votes", heading: "Popular", hint: "What most people are backing" },
  { value: "deadline-soon", label: "Deadline: soonest", heading: "Closing soon", hint: "Asks due first — hold them to it" },
  { value: "deadline-late", label: "Deadline: latest", heading: "Longer horizon", hint: "Long-range asks first" },
];

export const FACETS = ["states", "cities", "topics", "people", "deadline"] as const;
export type FacetKey = (typeof FACETS)[number];

export const FACET_LABEL: Record<FacetKey, string> = {
  states: "States",
  cities: "Cities",
  topics: "Topics",
  people: "People",
  deadline: "Deadline",
};

export type AskFilters = { sort: SortKey } & Record<FacetKey, string[]>;

export const EMPTY_FILTERS: AskFilters = {
  sort: "votes",
  states: [],
  cities: [],
  topics: [],
  people: [],
  deadline: [],
};

type AskFacets = Record<FacetKey, string[]>;

// Facets are derived per ask (regexes over its text), and every count
// recomputes them for every ask — cache by object identity.
const facetCache = new WeakMap<Ask, AskFacets>();

function facetsOf(ask: Ask): AskFacets {
  const cached = facetCache.get(ask);
  if (cached) return cached;
  const { states, cities } = placesFor(`${ask.askText} ${ask.targetBody}`);
  const year = ask.timeframe.match(/\d{4}/)?.[0];
  const facets: AskFacets = {
    states,
    cities,
    // Seed asks tag places too ("Bengaluru"); the Cities facet covers those.
    topics: (ask.tags ?? []).filter((tag) => !isPlaceName(tag)),
    people: (ask.responsiblePeople ?? []).map((p) => p.name),
    deadline: year ? [year] : [],
  };
  facetCache.set(ask, facets);
  return facets;
}

function matches(ask: Ask, filters: AskFilters, except?: FacetKey): boolean {
  const facets = facetsOf(ask);
  return FACETS.every(
    (key) =>
      key === except ||
      filters[key].length === 0 ||
      filters[key].some((value) => facets[key].includes(value)),
  );
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Mar 2029" → a sortable month number; unparseable deadlines sort last. */
function deadlineKey(timeframe: string): number {
  const year = Number(timeframe.match(/\d{4}/)?.[0]);
  if (!year) return Number.POSITIVE_INFINITY;
  const month = MONTHS.indexOf(timeframe.trim().slice(0, 3).toLowerCase());
  return year * 12 + (month >= 0 ? month : 11);
}

/**
 * Filter, then order. "Most votes" keeps the incoming order on purpose:
 * it's already vote-ranked from the server, and re-sorting on every vote
 * would make the card jump out from under the cursor mid-click (and push
 * a just-added ask out of sight).
 */
export function applyFilters(asks: Ask[], filters: AskFilters): Ask[] {
  const kept = asks.filter((ask) => matches(ask, filters));
  if (filters.sort === "votes") return kept;
  const dir = filters.sort === "deadline-soon" ? 1 : -1;
  return kept
    .map((ask, i) => ({ ask, i, key: deadlineKey(ask.timeframe) }))
    .sort((a, b) => {
      // Unparseable deadlines stay at the bottom in both directions.
      if (a.key !== b.key) {
        if (!Number.isFinite(a.key)) return 1;
        if (!Number.isFinite(b.key)) return -1;
        return (a.key - b.key) * dir;
      }
      return a.i - b.i;
    })
    .map(({ ask }) => ask);
}

export interface FacetOption {
  value: string;
  count: number;
  /** Secondary line — a person's designation. */
  detail?: string;
}

/**
 * Every value this facet takes across `asks`, with faceted counts. Values
 * already selected are kept even at zero, so a tick never vanishes from
 * under you.
 */
export function facetOptions(asks: Ask[], filters: AskFilters, key: FacetKey): FacetOption[] {
  const all = new Map<string, FacetOption>();
  for (const ask of asks) {
    for (const value of facetsOf(ask)[key]) {
      if (!all.has(value)) {
        const detail =
          key === "people"
            ? ask.responsiblePeople?.find((p) => p.name === value)?.designation
            : undefined;
        all.set(value, { value, count: 0, detail });
      }
    }
  }
  for (const value of filters[key]) {
    if (!all.has(value)) all.set(value, { value, count: 0 });
  }
  for (const ask of asks) {
    if (!matches(ask, filters, key)) continue;
    for (const value of facetsOf(ask)[key]) all.get(value)!.count += 1;
  }

  const options = Array.from(all.values());
  if (key === "deadline") return options.sort((a, b) => a.value.localeCompare(b.value));
  return options.sort((a, b) => {
    // All-India leads the states list — it's the answer for most asks.
    if (a.value === ALL_INDIA) return -1;
    if (b.value === ALL_INDIA) return 1;
    return b.count - a.count || a.value.localeCompare(b.value);
  });
}

export function activeFilterCount(filters: AskFilters): number {
  return FACETS.reduce((n, key) => n + filters[key].length, 0);
}
