import { EMPTY_FILTERS, facetOptions } from "@/lib/filters";
import { isTopic, toTopics, type Topic } from "@/lib/topics";
import type { Ask } from "@/lib/types";

/*
  The topics a person said they care about, picked on /start before they
  ever see the Popular list. Opening on what everyone else backs anchors
  people to it; asking first lets them start from their own interests.
  The picks become the topic tabs over the list (components/search/TopicTabs).

  Kept in this browser only, like the onboarding record. `null` means they
  haven't been asked yet; `[]` means they skipped, so /start doesn't come back.
*/

const INTERESTS_KEY = "citizen:interests";

/** Any name onto the fixed topic list: picks saved before it existed
 *  ("Water"), or a ?topic= from an old link. Null when it fits none. */
export function asTopic(name: string): Topic | null {
  if (isTopic(name)) return name;
  const [first] = toTopics([name]);
  return first && isTopic(first) ? first : null;
}

export function getInterests(): Topic[] | null {
  try {
    const raw = window.localStorage.getItem(INTERESTS_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const topics = parsed.map((t) => (typeof t === "string" ? asTopic(t) : null));
    return [...new Set(topics.filter((t): t is Topic => t !== null))];
  } catch {
    // Storage unavailable or garbled: treat as asked, so /start never traps anyone.
    return [];
  }
}

export function saveInterests(topics: string[]) {
  try {
    window.localStorage.setItem(INTERESTS_KEY, JSON.stringify(topics));
  } catch {
    // Storage unavailable — the tabs just fall back to the common topics.
  }
}

/** The `n` topics with the most asks: tabs for someone who skipped /start. */
export function popularTopics(asks: Ask[], n: number): Topic[] {
  return facetOptions(asks, EMPTY_FILTERS, "topics")
    .map((o) => o.value)
    .filter(isTopic)
    .slice(0, n);
}
