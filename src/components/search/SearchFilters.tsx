"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FilterPanel } from "@/components/search/FilterPanel";
import { Sheet } from "@/components/ui/Sheet";
import type { useAskFilters } from "@/components/search/useAskFilters";
import { cn } from "@/lib/cn";
import { FACETS, SORT_OPTIONS } from "@/lib/filters";

type FilterState = ReturnType<typeof useAskFilters>;

/**
 * List heading ("Asks", or "Results" for a search), the active-filter chips,
 * and — below lg — the Filters button that opens the panel as a bottom
 * sheet. On lg+ the panel itself sits in the sidebar (FilterSidebar).
 */
export function SearchFilters({
  state,
  total,
  searching = false,
  tabTopic,
}: {
  state: FilterState;
  total: number;
  /** A query is typed — the list is matches for it, not the whole board. */
  searching?: boolean;
  /** The topic tab that's open — the tab already shows it, so no chip for it. */
  tabTopic?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { filters, activeCount, toggle, clearAll } = state;
  // Not "Popular": that's the first topic tab right under it (TopicTabs),
  // and the same word twice read as two things. A search shows its matches.
  const heading = searching ? "Results" : "Asks";
  // Most votes is the default and the "Popular" tab already says so; any
  // other order is named beside the heading.
  const sortLabel =
    filters.sort === "votes" ? null : SORT_OPTIONS.find((o) => o.value === filters.sort)?.heading;
  const chips = FACETS.flatMap((key) => filters[key].map((value) => ({ key, value }))).filter(
    ({ key, value }) => !(key === "topics" && value === tabTopic),
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[22px] font-black text-headline tracking-[-0.02em]">
            {heading}
          </h2>
          {sortLabel && <span className="text-[13px] text-text-secondary">{sortLabel}</span>}
          {activeCount > 0 && (
            <span className="text-[13px] text-text-muted tabular-nums">
              {state.results.length} of {total}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            "lg:hidden text-[13px] px-3.5 py-1.5 max-sm:min-h-9 rounded-sm border transition-colors cursor-pointer",
            "flex items-center gap-1.5",
            activeCount > 0 || filters.sort !== "votes"
              ? "bg-ink text-paper border-ink"
              : "bg-card text-text-secondary border-border hover:border-muted",
          )}
        >
          Filters
          {activeCount > 0 && <span className="tabular-nums">({activeCount})</span>}
        </button>
      </div>

      {/* Phones: one row that scrolls sideways, so adding filters never
          grows the pinned area and pushes the list down. */}
      {chips.length > 0 && (
        <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-visible no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 *:shrink-0">
          {chips.map(({ key, value }) => (
            <button
              key={`${key}:${value}`}
              type="button"
              onClick={() => toggle(key, value)}
              aria-label={`Remove filter ${value}`}
              className={cn(
                "group text-[13px] pl-3 pr-2 py-1 rounded-sm border cursor-pointer transition-colors",
                "flex items-center gap-1.5 bg-accent text-paper border-accent hover:bg-ink hover:border-ink",
              )}
            >
              {value}
              <svg aria-hidden viewBox="0 0 12 12" className="size-3 opacity-70 group-hover:opacity-100" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M3 3l6 6M9 3 3 9" strokeLinecap="round" />
              </svg>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-[13px] text-accent px-1 hover:underline underline-offset-4 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {sheetOpen && (
        <FilterSheet state={state} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}

/** Desktop sidebar: the panel, sticky, filling the space under the pinned header so only its lists scroll. */
export function FilterSidebar({ state }: { state: FilterState }) {
  return (
    <FilterPanel
      // Sized to fit the first screen, where the panel starts lowest: header
      // 3.5rem + main's top padding 2rem + controls' margins 1.5rem + their
      // height + a 1rem gap below. Once stuck it sits higher, leaving a
      // little slack under it rather than ever spilling off-screen. Floor
      // keeps the lists usable on very short windows.
      className="h-[max(320px,calc(100vh-8rem-var(--controls-h,0px)))]"
      filters={state.filters}
      optionsFor={state.optionsFor}
      onSort={state.setSort}
      onToggle={state.toggle}
      onClearFacet={state.clearFacet}
      onClearAll={state.clearAll}
    />
  );
}

/** Mobile bottom sheet. Filters apply live; the footer just confirms. A
 *  bottom sheet up to lg (tablets too), since the sidebar only exists there. */
function FilterSheet({ state, onClose }: { state: FilterState; onClose: () => void }) {
  const n = state.results.length;

  return (
    <Sheet
      label="Filter and sort"
      placement="bottom"
      size="full"
      onClose={onClose}
      bodyClassName="flex flex-col px-0 pb-0 sm:pb-0 overflow-hidden"
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="flex-1 min-h-11" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" className="flex-[2] min-h-11" onClick={onClose} disabled={n === 0}>
            {n === 0 ? "No asks match" : `Show ${n} ask${n === 1 ? "" : "s"}`}
          </Button>
        </div>
      }
    >
      <FilterPanel
        className="flex-1 rounded-none border-0"
        filters={state.filters}
        optionsFor={state.optionsFor}
        onSort={state.setSort}
        onToggle={state.toggle}
        onClearFacet={state.clearFacet}
        onClearAll={state.clearAll}
      />
    </Sheet>
  );
}
