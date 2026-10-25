"use client";

import { useCallback, useMemo, useState } from "react";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyFilters,
  facetOptions,
  type AskFilters,
  type FacetKey,
  type SortKey,
} from "@/lib/filters";
import type { Ask } from "@/lib/types";

/**
 * Filter + sort state for the Popular list. `asks` is the query-matched
 * set (lib/match.ts runs first), so option counts follow what's typed.
 */
export function useAskFilters(asks: Ask[]) {
  const [filters, setFilters] = useState<AskFilters>(EMPTY_FILTERS);

  const results = useMemo(() => applyFilters(asks, filters), [asks, filters]);
  const optionsFor = useCallback(
    (key: FacetKey) => facetOptions(asks, filters, key),
    [asks, filters],
  );

  const setSort = useCallback((sort: SortKey) => setFilters((f) => ({ ...f, sort })), []);
  const toggle = useCallback((key: FacetKey, value: string) => {
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  }, []);
  const clearFacet = useCallback((key: FacetKey) => setFilters((f) => ({ ...f, [key]: [] })), []);
  const clearAll = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return {
    filters,
    results,
    optionsFor,
    activeCount: activeFilterCount(filters),
    setSort,
    toggle,
    clearFacet,
    clearAll,
  };
}
