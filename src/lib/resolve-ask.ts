import { chatJSON } from "@/lib/llm";
import { webSearch, formatSearchContext } from "@/lib/web-search";

import type { ResponsiblePerson } from "@/lib/types";

// Listed only on asks that sit squarely with the Union Government (see
// Jurisdiction.national) — not on every ask, or the name stops meaning
// anything. Kept as a constant (not LLM-generated) since it doesn't need
// per-ask verification, just occasional manual updates if the office
// changes hands.
export const PRIME_MINISTER: ResponsiblePerson = {
  name: "Narendra Modi",
  designation: "Prime Minister of India",
  organization: "Government of India",
  twitterHandle: "narendramodi",
};

export type OfficeLevel = "union" | "state" | "city";

export interface Jurisdiction {
  /** The 1-3 offices that actually hold power over this ask, most direct
   *  first — searched by name to find who currently holds them. */
  offices: { office: string; level: OfficeLevel }[];
  /** True only when the ask sits squarely with the Union Government (the
   *  budget, a central law, national policy) — the one case where the Prime
   *  Minister is genuinely accountable and gets listed. */
  national: boolean;
}

const FALLBACK_JURISDICTION: Jurisdiction = {
  offices: [{ office: "Union Minister of Home Affairs", level: "union" }],
  national: true,
};

/** Maximum people shown per ask, PM included. */
export const MAX_RESPONSIBLE_PEOPLE = 3;

/** Shared by /api/suggest and /api/resolve so both pick people the same way. */
export const RESPONSIBLE_PEOPLE_RULES = `responsiblePeople: the 2-3 real, current officeholders who hold actual power over this ask, most directly accountable first — never more than 3, and fewer is better than padding. Pick them by who can really make it happen, at whatever level that is:
  - A local matter (city roads, potholes, garbage, water supply, city buses, lakes, local policing) -> the city and state officials who run it. For Bengaluru: the Mayor or, where there is no elected Mayor, the Chief Commissioner / Administrator of the city corporation (BBMP / Greater Bengaluru Authority), plus the relevant Karnataka state minister (e.g. Bengaluru Development, Urban Development, Water Resources) and, for a single agency, its head (e.g. BMTC or BWSSB Managing Director / Chairman). Do NOT substitute a Union minister for a city or state matter.
  - A shared matter (metro, urban transport, state schools funded by central schemes, health insurance) -> the state minister who executes it, the head of the implementing agency or the city head, and the Union minister only where central funding or approval is the real lever. For Bengaluru metro that is the Karnataka Urban Development Minister, the BMRCL Managing Director, and the Union Minister of Housing and Urban Affairs.
  - A state subject that applies across India (state schools, state police, state fee rules, with the ask aimed at "State ... Departments" in general) -> the Union minister who sets national policy and coordinates the states (e.g. Union Education Minister, Union Home Minister). Name a single state's minister only when the ask itself names that state or a city in it.
  - A state subject in one named state (e.g. "Karnataka school fees") -> that state's relevant minister, plus the Chief Minister only if the ask is state-wide policy.
  - A Union subject (national budget, central law, national exams, GST, MSP) -> the relevant Union minister. The Prime Minister is added separately only for these; never list the PM yourself.
Use the live search results below to name the person who holds each office today. Never invent a name the results don't support: if an office has no named holder in the results (for example the city has no elected Mayor), name the official who actually runs it instead, or skip that office. Each person is {name, designation, organization} where designation is their exact title and organization is the body they head.`;

/**
 * Works out who really holds power over a citizen's ask — city, state, or
 * Union, often a mix — rather than defaulting everything to a Union ministry.
 * Used to aim the officeholder web searches, and to decide whether the PM
 * belongs on the ask at all.
 */
export async function identifyJurisdiction(
  query: string,
): Promise<Jurisdiction> {
  try {
    const result = await chatJSON<Jurisdiction>({
      system: `Given a citizen's policy ask in India, name the 1-3 offices that hold real power over it, most direct first, at city, state or Union level as appropriate. Be local for local things: a Bengaluru road, bus, water or lake ask is run by the Bengaluru city corporation (BBMP / Greater Bengaluru Authority, Mayor or Chief Commissioner), the relevant agency (BMTC, BWSSB, BMRCL) and the Karnataka state minister — NOT a Union minister. Name a Union office only when the Union Government genuinely has the lever (national budget, central law, central funding for a shared project such as metro). Each office is a specific title that can be searched, e.g. "Karnataka Minister of Urban Development", "Chief Commissioner of Greater Bengaluru Authority", "Managing Director of BMRCL", "Union Minister of Finance". Set national=true only if the ask belongs squarely to the Union Government. Output ONLY {"offices":[{"office":"...","level":"union"|"state"|"city"}],"national":true|false}. No prose.`,
      user: query,
    });
    const offices = (result.offices ?? []).slice(0, 3);
    if (offices.length === 0) return FALLBACK_JURISDICTION;
    return { offices, national: result.national === true };
  } catch {
    return FALLBACK_JURISDICTION;
  }
}

/** Runs the topic-status search plus one officeholder search per relevant
 *  office, and formats them together as grounding context for an LLM prompt. */
export async function gatherGroundingContext(query: string): Promise<{
  context: string;
  hasResults: boolean;
  jurisdiction: Jurisdiction;
}> {
  const jurisdiction = await identifyJurisdiction(query);
  const [statusResults, ...officeholderResults] = await Promise.all([
    webSearch(`${query} India government policy current status 2026`),
    ...jurisdiction.offices.map((o) =>
      webSearch(`${o.office} India current officeholder 2026`, 3),
    ),
  ]);

  const searchResults = [...statusResults, ...officeholderResults.flat()];
  if (searchResults.length === 0) {
    return {
      hasResults: false,
      jurisdiction,
      context:
        "\n\nNo web search results were available — use qualitative currentValue language rather than guessing specific figures, and name only officeholders you are certain of.",
    };
  }

  return {
    hasResults: true,
    jurisdiction,
    context: `\n\nOffices that hold power here: ${jurisdiction.offices
      .map((o) => `${o.office} (${o.level})`)
      .join("; ")}\n\nLive web search results (use these for current facts, not your own memory):\n${formatSearchContext(searchResults)}`,
  };
}

/**
 * Just the "who holds each office today" half of gatherGroundingContext —
 * jurisdiction plus one officeholder search per office. Split out so the
 * suggest flow can run it in the background while the ask cards are still
 * being written, since only the responsible-people step needs it.
 */
export async function gatherOfficeholderContext(query: string): Promise<{
  context: string;
  jurisdiction: Jurisdiction;
}> {
  const jurisdiction = await identifyJurisdiction(query);
  const results = (
    await Promise.all(
      jurisdiction.offices.map((o) =>
        webSearch(`${o.office} India current officeholder 2026`, 3),
      ),
    )
  ).flat();
  const offices = jurisdiction.offices.map((o) => `${o.office} (${o.level})`).join("; ");
  return {
    jurisdiction,
    context:
      results.length === 0
        ? `\n\nOffices that hold power here: ${offices}\n\nNo web search results were available — name only officeholders you are certain of.`
        : `\n\nOffices that hold power here: ${offices}\n\nLive web search results (use these for who holds each office today, not your own memory):\n${formatSearchContext(results)}`,
  };
}

/**
 * Final list shown on the card: the PM first, but only when the ask is
 * squarely Union-level; then the model's picks, deduped. Capped at three
 * in total so every name carries real accountability.
 */
export function finalizeResponsiblePeople(
  picked: ResponsiblePerson[] | undefined,
  national: boolean,
): ResponsiblePerson[] {
  const seen = new Set<string>([PRIME_MINISTER.name.toLowerCase()]);
  const others = (picked ?? []).filter((p) => {
    const key = p?.name?.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const people = national ? [PRIME_MINISTER, ...others] : others;
  return people.slice(0, MAX_RESPONSIBLE_PEOPLE);
}
