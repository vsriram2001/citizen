"use client";

import { useEffect, useState } from "react";
import type { SemanticVerdict } from "@/lib/match";

interface Result {
  forQuery: string;
  matches: SemanticVerdict[];
  /** The meaning layer actually answered (vs. failed or unreachable). */
  ok: boolean;
}

/** Long enough that it fires on a pause, not on every keystroke. */
const DEBOUNCE_MS = 400;

/**
 * Meaning-based matches for the search box (POST /api/match), alongside
 * the instant keyword matching. `settled` turns true once the meaning layer
 * has answered for this exact query, or failed — the screen waits for that
 * before deciding a query has no match, so the add-ask panel doesn't flash
 * up and then vanish. A failure just leaves the keyword results.
 */
export function useSemanticMatches(query: string) {
  const enabled = query.length >= 3;
  const [result, setResult] = useState<Result>({ forQuery: "", matches: [], ok: false });
  const [startedFor, setStartedFor] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Typing has paused: other work for this query (the add-ask panel's
      // suggestions) can start now, in parallel with this call.
      setStartedFor(query);
      let matches: SemanticVerdict[] = [];
      let ok = false;
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (res.ok) {
          matches = (await res.json()).matches ?? [];
          ok = true;
        }
      } catch {
        // Network error — fall through with no meaning matches.
      }
      if (!cancelled) setResult({ forQuery: query, matches, ok });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, enabled]);

  const fresh = enabled && result.forQuery === query;
  // While the next answer is on its way, keep the last one if this query
  // just extends it (still typing the same thought) so meaning-only matches
  // don't blink out between keystrokes; drop it if they started over.
  const continuing =
    enabled && result.forQuery !== "" && query.startsWith(result.forQuery);
  return {
    matches: fresh || continuing ? result.matches : [],
    settled: !enabled || fresh,
    /** Typing has paused on this exact query (the meaning check is under
     *  way, not necessarily answered). */
    started: enabled && startedFor === query,
    /** Its verdicts are in for this exact query, so weak keyword hits it
     *  left out can be dropped (see rankAsks). False when it failed. */
    judged: fresh && result.ok,
  };
}
