// The first step of /api/suggest — server-only (LLM). People type the way
// they talk ("I want the driving liceses to be really good, like…"), and
// searching on those words verbatim found a Delaware DMV page and a Facebook
// video. So one call reads what they meant, splits it into the distinct
// changes that would deliver it, and writes the searches: where India
// stands today, and where each change has already been made. Its memory
// only aims the searches; nothing it writes here is shown or claimed.

import { chatJSON } from "@/lib/llm";

export interface ResearchPlan {
  /** The issue in plain words, e.g. "fake driving licences and unlicensed driving in India". */
  topic: string;
  /** Searches for where things stand in India today. */
  statusQueries: string[];
  /** One per suggestion card: a distinct change, and a search for a place
   *  that has already made it. Distinct by construction — when the cards
   *  were only told their angle, a strong precedent pulled all three onto
   *  the same ask. */
  facets: { focus: string; precedentQuery: string }[];
}

const PLAN_PROMPT = `A citizen in India typed a request into a civic accountability platform — possibly rambling, misspelt or vague. Plan how to turn it into three concrete policy asks, and the web research for them.

Output ONLY this JSON, no prose:
{"topic": "...", "statusQueries": ["...", "..."], "facets": [{"focus": "...", "precedentQuery": "..."}, ...]}

- topic: the issue in 6-12 plain words, with the place if they named one (e.g. "fake driving licences and unlicensed driving in India").
- statusQueries: 2 searches for where this stands in India today — official figures, the rules and schemes in force, recent government reports. Name the city or state if they did.
- facets: exactly 3 DIFFERENT changes that together would deliver what they want — never the same change reworded. First the core change they asked for; then the other things they asked for, or the levers that make it happen (a rule, technology, funding, enforcement). A "publish data / track / report" facet only if they themselves asked for data or transparency.
  - focus: the change in one line (e.g. "automated, camera-recorded driving tests at every RTO", "catch unlicensed drivers with roadside and camera licence checks").
  - precedentQuery: a search for a specific place that has already made that change, worded to find its measured result (e.g. "Delhi automated driving test track pass rate results"). Prefer Indian cities or states, then countries at a similar income level, then anywhere. Never the place they asked about.

These are only plans and search queries: nothing you write is shown to anyone, and every claim will come from what the searches find.`;

/** The angles cards used before the plan existed — the fallback if it fails. */
const GENERIC_FACETS = [
  "the citizen's own request, made realistic: the most direct measurable change in what they typed",
  "the lever that would actually make it happen — the funding, staffing, law, rule or technology change",
  "the next most important part of what they asked for, as its own measurable change",
];

/** Falls back to searching on the citizen's own words if the plan fails. */
export async function planResearch(query: string, signal?: AbortSignal): Promise<ResearchPlan> {
  const fallback: ResearchPlan = {
    topic: query,
    statusQueries: [`${query} India government policy current status 2026`],
    facets: GENERIC_FACETS.map((focus, i) => ({
      focus,
      precedentQuery:
        i === 0
          ? `other cities or countries that already achieved: ${query} — measured results before and after`
          : "",
    })),
  };
  try {
    const out = await chatJSON<{ topic?: unknown; statusQueries?: unknown; facets?: unknown }>({
      system: PLAN_PROMPT,
      user: query,
      signal,
    });
    const statusQueries = Array.isArray(out.statusQueries)
      ? out.statusQueries.filter((s): s is string => typeof s === "string" && s.trim() !== "").slice(0, 2)
      : [];
    const facets = Array.isArray(out.facets)
      ? out.facets
          .filter(
            (f): f is { focus: string; precedentQuery?: unknown } =>
              !!f && typeof f.focus === "string" && f.focus.trim() !== "",
          )
          .slice(0, 3)
          .map((f) => ({
            focus: f.focus.trim(),
            precedentQuery: typeof f.precedentQuery === "string" ? f.precedentQuery.trim() : "",
          }))
      : [];
    if (facets.length === 0) return fallback;
    return {
      topic: typeof out.topic === "string" && out.topic.trim() ? out.topic.trim() : query,
      statusQueries: statusQueries.length ? statusQueries : fallback.statusQueries,
      facets,
    };
  } catch (err) {
    if (!signal?.aborted) console.error("research plan failed:", err);
    return fallback;
  }
}
