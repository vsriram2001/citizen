"use client";

import { useEffect, useRef, useState } from "react";
import type { AskSuggestion, ResponsiblePerson } from "@/lib/types";

/** A suggestion plus its slot (0-2) — cards arrive out of order, and this is
 *  what later "people" / "drop" events refer to. `responsiblePeople` is null
 *  until the background lookup lands. */
export type SuggestionItem = AskSuggestion & { index: number };

interface Result {
  forQuery: string;
  /** Why these suggestions, in a line or two for the whole set. */
  summary: string;
  items: SuggestionItem[];
  /** Existing asks that drafts were dropped for repeating (see /api/suggest). */
  coveredBy: string[];
  /** The stream has ended (cleanly or not). */
  done: boolean;
  error: boolean;
}

const EMPTY: Omit<Result, "forQuery"> = {
  summary: "",
  items: [],
  coveredBy: [],
  done: false,
  error: false,
};

type Event =
  | { t: "summary"; summary: string }
  | { t: "ask"; index: number; ask: Omit<AskSuggestion, "responsiblePeople"> }
  | { t: "people"; index: number; people: ResponsiblePerson[] }
  | { t: "drop"; index: number; duplicateId?: string }
  | { t: "done"; coveredBy?: string[] }
  | { t: "error" };

function apply(r: Result, e: Event): Result {
  switch (e.t) {
    case "summary":
      return { ...r, summary: e.summary };
    case "ask":
      return {
        ...r,
        items: [...r.items, { ...e.ask, responsiblePeople: null, index: e.index }].sort(
          (a, b) => a.index - b.index,
        ),
      };
    case "people":
      return {
        ...r,
        items: r.items.map((s) =>
          s.index === e.index ? { ...s, responsiblePeople: e.people } : s,
        ),
      };
    case "drop":
      return {
        ...r,
        items: r.items.filter((s) => s.index !== e.index),
        // No id = dropped for repeating another card, not an existing ask.
        coveredBy:
          !e.duplicateId || r.coveredBy.includes(e.duplicateId)
            ? r.coveredBy
            : [...r.coveredBy, e.duplicateId],
      };
    case "done":
      return { ...r, done: true, coveredBy: e.coveredBy ?? r.coveredBy };
    case "error":
      return { ...r, done: true, error: r.items.length === 0 };
  }
}

/**
 * AI-drafted asks for a query (POST /api/suggest), read as a stream: the
 * cards land one by one as they're written, and who's responsible fills in
 * after. No debounce here — AddAskPanel is keyed by the query and only
 * mounts once typing has paused, so the query is already stable.
 *
 * Loading is derived — "nothing has arrived for this exact query yet" —
 * rather than tracked as its own state.
 */
export function useSuggestions(query: string, enabled: boolean) {
  const [result, setResult] = useState<Result>({ forQuery: "", ...EMPTY });
  const latest = useRef(result);
  useEffect(() => {
    latest.current = result;
  }, [result]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();

    // Events for a new query start from scratch; later ones build on it.
    const push = (e: Event) =>
      setResult((prev) => apply(prev.forQuery === query ? prev : { forQuery: query, ...EMPTY }, e));

    (async () => {
      try {
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("suggest failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (line) push(JSON.parse(line) as Event);
          }
        }
        // A stream cut short without its "done" must not leave the spinner up.
        push({ t: "done" });
      } catch {
        if (!controller.signal.aborted) push({ t: "error" });
      }
    })();

    return () => controller.abort();
  }, [query, enabled]);

  const fresh = enabled && result.forQuery === query;
  const current = fresh ? result : { forQuery: query, ...EMPTY };

  /**
   * Who's responsible for one card, waiting for the background lookup if it
   * hasn't landed yet. Resolves to [] if it failed or took too long — the
   * caller then falls back to /api/resolve.
   */
  function peopleFor(index: number): Promise<ResponsiblePerson[]> {
    return new Promise((resolve) => {
      const started = Date.now();
      const check = () => {
        const state = latest.current;
        const item = state.forQuery === query && state.items.find((s) => s.index === index);
        if (item && item.responsiblePeople) return resolve(item.responsiblePeople);
        if (!item || state.done || Date.now() - started > 25_000) return resolve([]);
        setTimeout(check, 150);
      };
      check();
    });
  }

  return {
    summary: current.summary,
    suggestions: current.items,
    coveredBy: current.coveredBy,
    error: current.error,
    /** Nothing to show yet — the first card (or the end) hasn't arrived. */
    loading: enabled && current.items.length === 0 && !current.done && !current.error,
    /** Cards are in but the rest of the set is still being written/checked. */
    streaming: enabled && !current.done,
    peopleFor,
  };
}
