// "Done before" — server-only (LLM, web search). An ask that some city or
// country has already achieved is one a government can't wave off as
// impossible, so asks are drafted from, and shown with, a place that has
// done it. Used by /api/suggest (while drafting the cards) and
// /api/precedent (asks typed by hand, at review).

import { chatJSON } from "@/lib/llm";
import { webSearch, webSearchAll } from "@/lib/web-search";
import type { Precedent } from "@/lib/types";

type SearchResult = Awaited<ReturnType<typeof webSearch>>[number];

/** What counts as a precedent — shared by the suggest cards and the lookup
 *  so both pick the same way. */
export const PRECEDENT_RULES = `A precedent is a place that has ALREADY made the same kind of change the ask asks for, with a measured result — it need not match the ask's target exactly (a city that cut road deaths by a third is a precedent for halving them), but the summary must say what it actually achieved, not what the ask wants. A plan, an announcement, a pilot just launched or a budget allotted is not one; nor is a place that was simply always better off, with no change made. Take it only from the "done elsewhere" search results, never from memory, and only when a result actually says so; otherwise there is none.
  - place: the city, state or country (e.g. "Indore, Madhya Pradesh", "Bogotá, Colombia", "Seoul, South Korea").
  - summary: 25 words at most — what they did and the measured result, with years (e.g. "Cut average pothole repair time from 15 days to 48 hours between 2019 and 2022"). No praise, no "successfully".
  - sourceUrl: the URL of the search result that says so.
  Prefer, in order: an Indian city or state (same laws, budgets and bureaucracy), then a country at a similar income level, then anywhere else. Never the place the ask is about.`;

const QUERY_PROMPT = `A citizen in India wants a policy change. Name where in the world it has most likely already been achieved, as 2 web search queries that would find the evidence — each naming a specific place and what it did (e.g. "Beijing PM2.5 reduction 2013 2017 results", "Indore waste segregation at source 100% households"). Prefer Indian cities or states, then countries at a similar income level, then anywhere. Never the place the ask itself is about. These are only search queries: nothing you write is shown to anyone, and the claim will come from what the search finds. Output ONLY {"queries":["...","..."]}.`;

/**
 * Searches for places that have already done this. A generic "who has
 * achieved X" search mostly finds articles about X, not the city that did
 * it, so the model first names the likely candidates to aim the search
 * — its memory picks where to look, never what is claimed. Falls back to
 * the generic search if that call fails. Runs beside the topic-status
 * search in /api/suggest, so it adds little wait of its own.
 */
export async function precedentSearch(topic: string, signal?: AbortSignal): Promise<SearchResult[]> {
  let queries: string[] = [];
  try {
    const out = await chatJSON<{ queries?: unknown }>({
      system: QUERY_PROMPT,
      user: topic,
      // Not "fast": here the bigger model named better places and, with
      // less to think through, answered sooner (~4s against 5-8s).
      signal,
    });
    if (Array.isArray(out.queries)) {
      queries = out.queries.filter((q): q is string => typeof q === "string" && q.trim() !== "").slice(0, 2);
    }
  } catch (err) {
    if (!signal?.aborted) console.error("precedent queries failed:", err);
  }
  if (queries.length === 0) {
    // "Other" because the ask usually names its own city, and results about
    // that city are the one thing a precedent can't be.
    queries = [`other cities or countries that already achieved: ${topic} — measured results before and after`];
  }
  return webSearchAll(queries, 5);
}

/** Formats the precedent search for a prompt, labelled so its figures are
 *  never mistaken for where India stands today. */
export function formatPrecedentContext(results: SearchResult[]): string {
  if (results.length === 0) return "";
  // Longer excerpts than the shared formatter's 500 characters: the
  // before-and-after figures a precedent needs often sit further in.
  const excerpts = results
    .map((r, i) => `[${i + 1}] ${r.title} (${r.url})\n${r.content.slice(0, 1200)}`)
    .join("\n\n");
  return `\n\n"Done elsewhere" search results — places that may already have achieved this. These are NOT India's current status; use them only for the precedent and to set a realistic target:\n${excerpts}`;
}

/** A model's precedent, kept only if it cites one of the searched pages —
 *  a precedent without a real source is exactly what we never show. */
export function validPrecedent(raw: unknown, results: SearchResult[]): Precedent | null {
  if (!raw || typeof raw !== "object") return null;
  const { place, summary, sourceUrl } = raw as Record<string, unknown>;
  if (typeof place !== "string" || typeof summary !== "string" || typeof sourceUrl !== "string") {
    return null;
  }
  if (!place.trim() || !summary.trim()) return null;
  // The page has to be one we searched, and has to name the place: a real
  // link about somewhere else ("Malta" citing a page about Zurich) would
  // send a voter who checks it to the wrong evidence.
  const source = results.find((r) => r.url === sourceUrl);
  if (!source) return null;
  const name = plain(place.split(",")[0]);
  if (!name || !plain(`${source.title} ${source.content}`).includes(name)) return null;
  return { place: place.trim(), summary: capWords(summary.trim(), 30), sourceUrl };
}

/**
 * A precedent as stored or as sent by the browser, or null if it isn't one.
 * The submit route can't re-check it against the searches that found it
 * (those happened in another request), so this holds it to the shape a
 * found one has: a place, a short summary, and an http(s) source link.
 */
export function asStoredPrecedent(raw: unknown): Precedent | null {
  if (!raw || typeof raw !== "object") return null;
  const { place, summary, sourceUrl } = raw as Record<string, unknown>;
  if (typeof place !== "string" || typeof summary !== "string" || typeof sourceUrl !== "string") {
    return null;
  }
  const p = { place: place.trim(), summary: summary.trim(), sourceUrl: sourceUrl.trim() };
  if (!p.place || !p.summary || p.place.length > 100 || p.summary.length > 400) return null;
  try {
    const url = new URL(p.sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return p.sourceUrl.length > 1000 ? null : p;
}

const LOOKUP_PROMPT =`For one policy ask on an Indian civic accountability platform, find a place that has already done it.

${PRECEDENT_RULES}

Output ONLY {"precedent":{"place":"...","summary":"...","sourceUrl":"..."}} or {"precedent":null}. No prose, no fence.`;

type AskShape = { askText: string; currentValue?: string; targetValue?: string };

/** The precedent for a finished ask (one typed by hand or edited), or null. */
export async function findPrecedent(ask: AskShape): Promise<Precedent | null> {
  return pickPrecedent(ask, await precedentSearch(ask.askText));
}

/** Picks the precedent for one ask from searches already run — /api/suggest
 *  reuses its one search across all three cards. */
export async function pickPrecedent(
  ask: AskShape,
  results: SearchResult[],
  signal?: AbortSignal,
): Promise<Precedent | null> {
  if (results.length === 0) return null;
  const figures =
    ask.currentValue && ask.targetValue ? ` (${ask.currentValue} → ${ask.targetValue})` : "";
  const out = await chatJSON<{ precedent?: unknown }>({
    system: LOOKUP_PROMPT,
    user: `Ask: "${ask.askText}"${figures}${formatPrecedentContext(results)}`,
    signal,
  });
  return validPrecedent(out.precedent, results);
}

function capWords(text: string, n: number): string {
  const words = text.split(/\s+/);
  return words.length <= n ? text : `${words.slice(0, n).join(" ")}…`;
}

/** Lowercase without accents, so "Bogotá" matches "Bogota". */
function plain(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
