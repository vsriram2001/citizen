import { chatJSON } from "@/lib/llm";
import { findNearIdentical, rankAsks, type SemanticVerdict } from "@/lib/match";
import type { Ask } from "@/lib/types";

/*
  The meaning layer of search matching (keyword layer: lib/match.ts).
  Server-only — it calls the LLM gateway.

  One question, asked of an LLM: given what someone typed, which existing
  asks are the *same* ask (a vote for it would count for them), and which
  are merely related? Keyword search can't see that "more BMTC buses" and
  "Double Bengaluru's city bus fleet" are one ask, or that "abolish income
  tax" and "raise income tax" are opposite ones.

  The same verdicts serve three places, so one cached call covers a person
  typing a query, the add-ask panel's duplicate filter, and the duplicate
  guard on submission:
    - /api/match        search results by meaning
    - /api/suggest      drops AI drafts that repeat an existing ask
    - /api/submissions  refuses a new ask that repeats an existing one
*/

/** Asks shown to the model per call. Past this, the keyword layer picks. */
const MAX_CANDIDATES = 120;

const SYSTEM_PROMPT = `You match what a citizen typed against the policy asks already on an Indian civic platform. Each existing ask is a specific demand of government.

For each existing ask decide:
- "same": it already asks for what the citizen wants — the same outcome from the same lever, for the same place — so a vote for it would count for them. Wording, the exact figure or the deadline may differ (e.g. "more BMTC buses" is the same as "Double Bengaluru's city bus fleet"; "make schools free" is the same as an ask to abolish school fees).
  NOT "same" when: the direction is opposite (abolish vs raise; "Halve the bus fleet" vs "Double the bus fleet" — opposite, so related, not same), the place differs (one named state or city vs another, or a named city vs all of India), or it is a different lever on the same topic (school fees vs teacher vacancies).
  A bare topic ("water", "buses", "pollution") is never "same" as anything — the citizen hasn't said what they want yet.
- "related": same topic or problem, and someone who typed this would plausibly want to see it. Include opposite-direction asks on the same subject here.
- otherwise leave it out. Don't stretch: an education budget is not related to potholes.

Output ONLY {"same":[numbers],"related":[numbers]} using the numbers in the list. No prose, no markdown fence.`;

interface Verdicts {
  same: number[];
  related: number[];
}

// Live search sends a query on every pause in typing, and the same text
// comes back again from the duplicate checks — a small in-memory cache keeps
// that to one LLM call per distinct text. Per server instance; that's fine.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
// Holds the promise, not the result: the search box and /api/suggest now ask
// the same question at the same moment, and should share one LLM call.
const cache = new Map<string, { at: number; verdicts: Promise<SemanticVerdict[]> }>();

function cacheKey(text: string, candidates: Ask[], model: string) {
  return `${model}|${text.trim().toLowerCase().replace(/\s+/g, " ")}|${candidates
    .map((a) => a.id)
    .join(",")}`;
}

/** Most relevant by keyword first, then the most-voted, up to the cap. */
function pickCandidates(text: string, asks: Ask[]): Ask[] {
  if (asks.length <= MAX_CANDIDATES) return asks;
  const picked = new Map<string, Ask>();
  for (const r of rankAsks(asks, { query: text, tags: [] })) {
    if (picked.size >= MAX_CANDIDATES / 2) break;
    picked.set(r.ask.id, r.ask);
  }
  for (const ask of [...asks].sort((a, b) => b.voteCount - a.voteCount)) {
    if (picked.size >= MAX_CANDIDATES) break;
    picked.set(ask.id, ask);
  }
  return [...picked.values()];
}

function describe(ask: Ask, n: number) {
  const delta =
    ask.currentValue && ask.targetValue ? ` (${ask.currentValue} → ${ask.targetValue})` : "";
  const body = ask.targetBody ? `; ${ask.targetBody}` : "";
  return `${n}. ${ask.askText}${delta}${body}`;
}

/**
 * Which existing asks are the same as / related to `text`. Throws when the
 * LLM is unreachable — callers decide whether that should fail open.
 *
 * `model`: "default" (Opus) everywhere: it is also the quicker one for this
 * short answer (~1.5s vs ~2.3s — Haiku thinks invisibly first), and the fast
 * model has been seen calling "Halve the bus fleet" a duplicate of "Double
 * the bus fleet".
 */
export async function semanticMatch(
  text: string,
  asks: Ask[],
  { model = "default" }: { model?: "fast" | "default" } = {},
): Promise<SemanticVerdict[]> {
  const candidates = pickCandidates(text, asks);
  if (candidates.length === 0 || text.trim().length < 3) return [];

  const key = cacheKey(text, candidates, model);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.verdicts;

  const verdicts = ask(text, candidates, model);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), verdicts });
  // A failed call must not be remembered, or every retry would fail too.
  verdicts.catch(() => cache.delete(key));
  return verdicts;
}

async function ask(
  text: string,
  candidates: Ask[],
  model: "fast" | "default",
): Promise<SemanticVerdict[]> {
  const result = await chatJSON<Verdicts>({
    model,
    system: SYSTEM_PROMPT,
    user: `Citizen typed: "${text.trim()}"\n\nExisting asks:\n${candidates
      .map((ask, i) => describe(ask, i + 1))
      .join("\n")}`,
  });

  const byNumber = (n: unknown) =>
    typeof n === "number" ? candidates[n - 1] : undefined;
  const same = new Set(
    (result.same ?? []).map(byNumber).filter((a): a is Ask => !!a).map((a) => a.id),
  );
  return [
    ...[...same].map((id) => ({ id, relation: "same" as const })),
    ...(result.related ?? [])
      .map(byNumber)
      .filter((a): a is Ask => !!a && !same.has(a.id))
      .map((a) => ({ id: a.id, relation: "related" as const })),
  ];
}

/**
 * The existing ask that `askText` would duplicate, or null. Near-identical
 * wording is caught without the LLM; paraphrases need it. If the LLM is
 * down this fails open (wording check only) — a blocked genuine ask is
 * worse than a rare duplicate that moderation can merge later.
 */
export async function findDuplicate(askText: string, asks: Ask[]): Promise<Ask | null> {
  const identical = findNearIdentical(askText, asks);
  if (identical) return identical;
  try {
    const verdicts = await semanticMatch(askText, asks, { model: "default" });
    const same = verdicts.find((v) => v.relation === "same");
    return same ? (asks.find((a) => a.id === same.id) ?? null) : null;
  } catch (err) {
    console.error("duplicate check (meaning layer) failed:", err);
    return null;
  }
}
