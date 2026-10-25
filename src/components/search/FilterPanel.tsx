"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  FACETS,
  FACET_LABEL,
  SORT_OPTIONS,
  type AskFilters,
  type FacetKey,
  type FacetOption,
  type SortKey,
} from "@/lib/filters";

type Pane = "sort" | FacetKey;

// Short lists read fine at a glance; past this, a find box earns its place.
const SEARCH_THRESHOLD = 6;

const PANE_NOTE: Partial<Record<Pane, string>> = {
  states: "Asks that name no state apply across India.",
  cities: "Includes asks aimed at a city's own bodies (e.g. BMTC, BWSSB).",
  people: "Officeholders accountable for an ask.",
  deadline: "The year an ask is due.",
};

/**
 * Two-pane filter panel: a category rail on the left, that category's
 * options on the right (the Ajio/Zomato layout). Stateless about the
 * filters themselves — the parent owns them, since they feed the list.
 * Rendered in the desktop sidebar and inside the mobile sheet.
 */
export function FilterPanel({
  filters,
  optionsFor,
  onSort,
  onToggle,
  onClearFacet,
  onClearAll,
  className,
}: {
  filters: AskFilters;
  optionsFor: (key: FacetKey) => FacetOption[];
  onSort: (sort: SortKey) => void;
  onToggle: (key: FacetKey, value: string) => void;
  onClearFacet: (key: FacetKey) => void;
  onClearAll: () => void;
  className?: string;
}) {
  const [pane, setPane] = useState<Pane>("sort");
  const anyActive = filters.sort !== "votes" || FACETS.some((k) => filters[k].length > 0);

  return (
    <div className={cn("bg-card border border-border rounded-card flex flex-col min-h-0 overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
        <h2 className="font-sans text-[15px] font-semibold text-text tracking-normal">
          Filter &amp; sort
        </h2>
        <button
          type="button"
          onClick={onClearAll}
          disabled={!anyActive}
          className={cn(
            "text-[13px] text-accent underline-offset-4 hover:underline cursor-pointer",
            "disabled:text-text-muted disabled:no-underline disabled:cursor-default",
          )}
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="Filter categories"
          className="w-[108px] shrink-0 bg-paper border-r border-border overflow-y-auto py-1"
        >
          <RailItem
            label="Sort by"
            active={pane === "sort"}
            dot={filters.sort !== "votes"}
            onClick={() => setPane("sort")}
          />
          {FACETS.map((key) => (
            <RailItem
              key={key}
              label={FACET_LABEL[key]}
              active={pane === key}
              count={filters[key].length}
              onClick={() => setPane(key)}
            />
          ))}
        </div>

        <div role="tabpanel" className="flex-1 min-w-0 overflow-y-auto">
          {pane === "sort" ? (
            <SortPane value={filters.sort} onChange={onSort} />
          ) : (
            <OptionsPane
              key={pane}
              facet={pane}
              selected={filters[pane]}
              options={optionsFor(pane)}
              onToggle={(value) => onToggle(pane, value)}
              onClear={() => onClearFacet(pane)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RailItem({
  label,
  active,
  count = 0,
  dot = false,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative w-full text-left px-3 py-2.5 text-[13px] flex items-center justify-between gap-1.5 cursor-pointer transition-colors",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
        active
          ? "bg-card text-text font-semibold"
          : "text-text-secondary hover:text-text hover:bg-border/30",
      )}
    >
      {/* Active marker — the left edge bar from the reference, in accent. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-sm transition-colors",
          active ? "bg-accent" : "bg-transparent",
        )}
      />
      <span className="truncate">{label}</span>
      {count > 0 ? (
        <span className="text-[11px] tabular-nums leading-none px-1.5 py-[3px] rounded-sm bg-accent text-paper font-medium">
          {count}
        </span>
      ) : (
        dot && <span aria-label="changed" className="size-1.5 rounded-sm bg-accent shrink-0" />
      )}
    </button>
  );
}

function PaneHeader({ title, note, onClear }: { title: string; note?: string; onClear?: () => void }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 pt-3.5 pb-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium">{title}</p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] text-accent hover:underline underline-offset-4 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      {note && <p className="text-[12px] text-text-muted leading-snug">{note}</p>}
    </div>
  );
}

function SortPane({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div role="radiogroup" aria-label="Sort by">
      <PaneHeader title="Sort by" />
      <div className="flex flex-col pb-2">
        {SORT_OPTIONS.map((opt) => {
          const checked = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(opt.value)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors hover:bg-paper",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
              )}
            >
              <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className={cn("text-[13px]", checked ? "text-text font-semibold" : "text-text")}>
                  {opt.label}
                </span>
                <span className="text-[12px] text-text-muted leading-snug">{opt.hint}</span>
              </span>
              {/* A tick, not a round radio — the radius scale has no circles. */}
              <CheckMark className={cn("mt-0.5 size-4 shrink-0 text-accent", !checked && "invisible")} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OptionsPane({
  facet,
  selected,
  options,
  onToggle,
  onClear,
}: {
  facet: FacetKey;
  selected: string[];
  options: FacetOption[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [find, setFind] = useState("");
  const q = find.trim().toLowerCase();
  const visible = q
    ? options.filter(
        (o) => o.value.toLowerCase().includes(q) || o.detail?.toLowerCase().includes(q),
      )
    : options;

  return (
    <div>
      <PaneHeader
        title={FACET_LABEL[facet]}
        note={PANE_NOTE[facet]}
        onClear={selected.length > 0 ? onClear : undefined}
      />

      {options.length > SEARCH_THRESHOLD && (
        <div className="px-4 pb-2">
          <input
            type="search"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder={`Find ${FACET_LABEL[facet].toLowerCase()}`}
            aria-label={`Find ${FACET_LABEL[facet].toLowerCase()}`}
            className={cn(
              "w-full bg-paper text-[13px] text-text placeholder:text-text-muted",
              "border border-border rounded-sm px-2.5 py-1.5",
              "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
            )}
          />
        </div>
      )}

      {options.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-text-muted">Nothing to filter by yet.</p>
      ) : visible.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-text-muted">No match for &ldquo;{find}&rdquo;.</p>
      ) : (
        <ul className="flex flex-col pb-2">
          {visible.map((opt) => {
            const checked = selected.includes(opt.value);
            const empty = opt.count === 0 && !checked;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={empty}
                  onClick={() => onToggle(opt.value)}
                  className={cn(
                    "w-full flex items-start gap-2.5 px-4 py-2 text-left cursor-pointer transition-colors hover:bg-paper",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                    "disabled:cursor-default disabled:hover:bg-transparent disabled:opacity-45",
                  )}
                >
                  <Checkbox checked={checked} />
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className={cn("text-[13px] text-text truncate", checked && "font-semibold")}>
                      {opt.value}
                    </span>
                    {opt.detail && (
                      <span className="text-[11px] text-text-muted leading-snug line-clamp-2">
                        {opt.detail}
                      </span>
                    )}
                  </span>
                  <span className="text-[12px] text-text-muted tabular-nums shrink-0 mt-px">
                    {opt.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-[1px] size-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors",
        checked ? "bg-accent border-accent" : "bg-card border-muted",
      )}
    >
      {checked && <CheckMark className="size-3 text-paper" />}
    </span>
  );
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2.5 6.2 5 8.5 9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
