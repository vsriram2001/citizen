import type { Ask } from "@/lib/types";

/*
  Search matching — the one place that decides which existing asks match
  what the user typed, and how close two asks are to each other. Pure
  functions, no React and no network, so the same code runs in the browser
  (live, on every keystroke) and on the server (duplicate checks before a
  new ask is written).

  Two layers sit on top of each other:

    1. Keyword (here): words are lowercased, stopwords dropped and lightly
       stemmed ("pollution" ~ "polluted"), then matched exactly, by prefix
       (half-typed words), with one-letter typo tolerance, and through a
       small hand-made synonym list (jobs ~ employment, bus ~ BMTC). Hits in
       askText count most, then tags, then the accountable body and people.
    2. Meaning (lib/semantic-match.ts, server-only): an LLM reads the query
       against existing asks and says which are the *same* ask and which are
       related. Its verdicts are folded in here by rankAsks, so the screen
       has one ranked list regardless of which layer found an ask.
*/

export interface MatchOptions {
  query: string;
  tags: string[];
}

/** What the meaning layer said about one existing ask. */
export interface SemanticVerdict {
  id: string;
  relation: "same" | "related";
}

export interface RankedAsk {
  ask: Ask;
  /** 0–1. Keyword coverage of the query, or the meaning layer's verdict. */
  relevance: number;
  /** Strong = this probably *is* what the person was looking for, so the
   *  "add a new ask" panel stays out of the way. */
  strength: "strong" | "weak";
  /** The meaning layer judged this the same ask as the query. */
  sameGoal: boolean;
  /** Lowercased words in askText to highlight on the card. */
  highlight: string[];
}

// --- Text normalisation ----------------------------------------------------

const STOPWORDS = new Set(
  (
    "a an the of for to in on at by with and or but from into onto over under " +
    "is are was were be been being am it its this that these those there their " +
    "as all any some per every each than then so very " +
    "i we you he she they me us my our your his her them " +
    "do does did done can could should would will shall may might must " +
    "want need please make get let have has had " +
    "about across out off yes " +
    "india indian govt government " +
    // Office words appear in every ask's responsible-people list, so they
    // would match everything and rank nothing.
    "minister ministry department dept union secretary official officials"
  ).split(" "),
);

/*
  Direction and size words say *how much*, not *what*. Search ignores them
  — "increase the forest cover" must not match "Raise Ayushman Bharat
  cover" on them — but the duplicate check keeps them, or "Halve the bus
  fleet" would read as identical to "Double the bus fleet".
*/
const DIRECTION_WORDS = new Set(
  (
    "increase increased raise reduce decrease cut improve ensure provide " +
    "double triple halve more most less least fewer no not without up down " +
    "percent pc lakh crore"
  ).split(" "),
);

/**
 * Light suffix stripping — enough that "pollution", "polluted" and
 * "polluting" meet at "pollut", without a full Porter stemmer's surprises.
 */
export function stem(word: string): string {
  let w = word;
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
  else if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (/(ss|us|is)$/.test(w)) {
    // keep: "bus", "status", "crisis", "class"
  } else if (/(ches|shes|xes|zes|ses)$/.test(w)) w = w.slice(0, -2);
  else if (w.endsWith("s")) w = w.slice(0, -1);

  for (const suffix of ["ations", "ation", "itions", "ition", "ions", "ion", "ings", "ing", "ed", "ers", "er", "ments", "ment", "ly", "ity"]) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  // "educate"/"educat", "case"/"cas" — a trailing e never carries meaning,
  // and dropping it keeps singular and plural ("cases" → "cas") together.
  if (w.endsWith("e") && w.length > 3) w = w.slice(0, -1);
  return w;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[×*]/g, "x")
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** A meaningful word: as written (for prefix matching) and stemmed. */
interface Term {
  raw: string;
  stem: string;
}

function terms(text: string, keepDirection = false): Term[] {
  const out: Term[] = [];
  for (const raw of words(text)) {
    if (STOPWORDS.has(raw)) continue;
    if (!keepDirection && DIRECTION_WORDS.has(raw)) continue;
    const s = stem(raw);
    if (s && !out.some((t) => t.stem === s)) out.push({ raw, stem: s });
  }
  return out;
}

/** Meaningful, stemmed words of a text, in order, without duplicates —
 *  direction words included (see DIRECTION_WORDS). */
export function tokenize(text: string): string[] {
  return terms(text, true).map((t) => t.stem);
}

// --- Synonyms --------------------------------------------------------------

/*
  Groups of words people use for the same civic topic. Deliberately small
  and hand-made: a word belongs here only if someone searching it would
  obviously want asks phrased with the others. Synonym hits score below a
  real word hit, so they widen the net without reordering exact matches.
*/
const SYNONYM_GROUPS: string[][] = [
  ["job", "jobs", "employment", "unemployment", "unemployed", "work", "recruitment", "hiring", "vacancy", "vacancies", "vacant", "posts"],
  ["air", "pollution", "polluted", "smog", "aqi", "emissions", "smoke", "clean"],
  ["water", "drinking", "tap", "piped", "supply", "bwssb", "borewell", "tanker"],
  ["school", "schools", "education", "teacher", "teachers", "student", "students", "learning", "classroom", "pupil"],
  ["fee", "fees", "tuition", "hike"],
  ["bus", "buses", "bmtc", "transit", "commute", "ksrtc"],
  ["metro", "bmrcl", "rail", "namma"],
  ["traffic", "congestion", "commute", "jam"],
  ["health", "healthcare", "hospital", "hospitals", "medical", "doctor", "doctors", "treatment", "ayushman", "clinic"],
  ["insurance", "ayushman"], // not "cover": forest cover, tree cover…
  ["road", "roads", "pothole", "potholes", "footpath", "street"],
  ["tax", "taxes", "gst", "taxation"],
  ["police", "policing", "crime", "fir", "complaint", "complaints", "safety"],
  ["lake", "lakes", "sewage", "sewer", "drain", "drains", "stormwater"],
  ["farmer", "farmers", "crop", "crops", "msp", "agriculture", "farm", "farming"],
  ["court", "courts", "judiciary", "judge", "judges", "justice", "backlog", "pending"],
  ["corruption", "transparency", "accountability", "asset", "assets", "declaration", "bribe"],
  ["exam", "exams", "paper", "leak", "leaks", "result", "results"],
  ["accident", "accidents", "emergency", "trauma", "ambulance"],
  ["garbage", "waste", "trash", "rubbish", "litter"],
  ["budget", "spending", "spend", "funding", "allocation", "gdp"],
  ["bengaluru", "bangalore", "blr", "bbmp", "gba"],
  ["electricity", "power", "outage", "bescom"],
  ["housing", "rent", "affordable"],
];

const SYNONYMS: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    const stems = group.map(stem);
    for (const s of stems) {
      const set = map.get(s) ?? new Set<string>();
      for (const other of stems) if (other !== s) set.add(other);
      map.set(s, set);
    }
  }
  return map;
})();

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * How well one query word matches one field's word: 1 exact, then prefix
 * (only for the word still being typed, compared as written so "case"
 * doesn't run into "cashless"), typo, synonym. 0 = no match.
 */
function termQuality(q: Term, field: Term, typing: boolean): number {
  if (q.stem === field.stem) return 1;
  if (typing && q.raw.length >= 3 && field.raw.startsWith(q.raw)) return 0.85;
  if (q.stem.length >= 5 && field.stem.length >= 5 && withinOneEdit(q.stem, field.stem)) {
    return 0.7;
  }
  if (SYNONYMS.get(q.stem)?.has(field.stem)) return 0.6;
  return 0;
}

// --- Scoring ---------------------------------------------------------------

const FIELD_WEIGHTS = {
  askText: 3,
  tags: 2,
  targetBody: 1.2,
  people: 1,
  detail: 0.6,
} as const;
const MAX_WEIGHT = FIELD_WEIGHTS.askText;

/** Below this an ask is noise (e.g. one word hitting a job title). */
const MIN_RELEVANCE = 0.2;

/**
 * Words of a query that must match for an ask to count. One word on its
 * own is a topic search, so one hit is enough; with two or more words a
 * single shared word is a coincidence ("forest *cover*" vs "Ayushman
 * Bharat *cover*"), so at least two must match — half, for long queries.
 * Anything this misses, the meaning layer still finds.
 */
function requiredHits(queryWords: number) {
  if (queryWords <= 1) return queryWords;
  return Math.max(2, Math.ceil(queryWords / 2));
}
/** At or above this the query is well covered by the ask's own wording. */
const STRONG_RELEVANCE = 0.75;

/** Relevance the meaning layer's verdicts translate to. */
const SEMANTIC_RELEVANCE = { same: 1, related: 0.5 } as const;

interface IndexedAsk {
  fields: { weight: number; terms: Term[] }[];
  /** Every meaningful word of askText as written, for highlighting. */
  askWords: Term[];
}

const indexCache = new WeakMap<Ask, IndexedAsk>();

function indexAsk(ask: Ask): IndexedAsk {
  const cached = indexCache.get(ask);
  if (cached) return cached;
  const people = (ask.responsiblePeople ?? [])
    .map((p) => `${p.name} ${p.designation} ${p.organization ?? ""}`)
    .join(" ");
  const indexed: IndexedAsk = {
    fields: [
      { weight: FIELD_WEIGHTS.askText, terms: terms(ask.askText) },
      { weight: FIELD_WEIGHTS.tags, terms: terms((ask.tags ?? []).join(" ")) },
      { weight: FIELD_WEIGHTS.targetBody, terms: terms(ask.targetBody) },
      { weight: FIELD_WEIGHTS.people, terms: terms(people) },
      {
        weight: FIELD_WEIGHTS.detail,
        terms: terms(`${ask.currentValue} ${ask.targetValue} ${ask.mechanism ?? ""}`),
      },
    ],
    askWords: words(ask.askText)
      .filter((raw) => !STOPWORDS.has(raw) && !DIRECTION_WORDS.has(raw))
      .map((raw) => ({ raw, stem: stem(raw) })),
  };
  indexCache.set(ask, indexed);
  return indexed;
}

function scoreAsk(ask: Ask, query: Term[], typingLast: boolean, phrase: string) {
  const { fields, askWords } = indexAsk(ask);
  let total = 0;
  let hits = 0;
  const highlight = new Set<string>();

  // Numbers don't count either way; nor does a half-typed last word that
  // matches nothing yet ("school fe" still finds the school-fee ask).
  let wordCount = 0;
  query.forEach((q, i) => {
    const typing = typingLast && i === query.length - 1;
    let best = 0;
    for (const field of fields) {
      for (const t of field.terms) {
        const score = field.weight * termQuality(q, t, typing);
        if (score > best) best = score;
      }
    }
    total += best;
    const isNumber = /^\d+$/.test(q.raw);
    if (best > 0 && !isNumber) hits++;
    const fragment = typing && best === 0 && q.raw.length < 4;
    if (!isNumber && !fragment) wordCount++;
    for (const w of askWords) if (termQuality(q, w, typing) > 0) highlight.add(w.raw);
  });

  let relevance = total / (query.length * MAX_WEIGHT);
  // The whole phrase appearing as typed beats the same words scattered.
  if (phrase.includes(" ") && ask.askText.toLowerCase().includes(phrase)) {
    relevance += 0.25;
  }
  if (hits < requiredHits(wordCount)) relevance = 0;
  return { relevance: Math.min(relevance, 1), highlight: [...highlight] };
}

function hasTag(ask: Ask, tags: string[]) {
  return tags.length === 0 || tags.some((tag) => ask.tags?.includes(tag));
}

/**
 * The ranked result list for the search box: keyword matches, merged with
 * the meaning layer's verdicts when they're available. Ties go to the ask
 * with more votes. An empty query returns every ask (tag-filtered) in its
 * existing order.
 */
export function rankAsks(
  asks: Ask[],
  { query, tags }: MatchOptions,
  semantic: SemanticVerdict[] = [],
  {
    judged = false,
  }: {
    /** The meaning layer has answered for this exact query. Weak keyword-only
     *  hits it didn't list are then coincidences ("forest cover" vs
     *  "Ayushman Bharat cover") and are dropped; strong ones always stay. */
    judged?: boolean;
  } = {},
): RankedAsk[] {
  const queryTerms = terms(query);
  // No trailing space → the last word may be half-typed.
  const typingLast = !/\s$/.test(query);
  const tagged = asks.filter((ask) => hasTag(ask, tags));

  if (queryTerms.length === 0) {
    return tagged.map((ask) => ({
      ask,
      relevance: 0,
      strength: "weak",
      sameGoal: false,
      highlight: [],
    }));
  }

  const verdicts = new Map(semantic.map((v) => [v.id, v.relation]));
  const phrase = query.trim().toLowerCase().replace(/\s+/g, " ");
  const ranked: RankedAsk[] = [];

  for (const ask of tagged) {
    const keyword = scoreAsk(ask, queryTerms, typingLast, phrase);
    const relation = verdicts.get(ask.id);
    const semanticScore = relation ? SEMANTIC_RELEVANCE[relation] : 0;
    let keywordScore = keyword.relevance >= MIN_RELEVANCE ? keyword.relevance : 0;
    if (judged && !relation && keywordScore < STRONG_RELEVANCE) keywordScore = 0;
    if (keywordScore === 0 && semanticScore === 0) continue;

    // Found by both layers → a little ahead of either alone.
    const both = keywordScore > 0 && semanticScore > 0 ? 0.1 : 0;
    const relevance = Math.min(Math.max(keywordScore, semanticScore) + both, 1);
    ranked.push({
      ask,
      relevance,
      strength:
        relation === "same" || keywordScore >= STRONG_RELEVANCE ? "strong" : "weak",
      sameGoal: relation === "same",
      highlight: keyword.highlight,
    });
  }

  return ranked.sort(
    (a, b) =>
      Number(b.sameGoal) - Number(a.sameGoal) ||
      b.relevance - a.relevance ||
      b.ask.voteCount - a.ask.voteCount,
  );
}

/** Keyword-only matches, best first. Kept for callers that just need asks. */
export function filterAsks(asks: Ask[], options: MatchOptions): Ask[] {
  return rankAsks(asks, options).map((r) => r.ask);
}

/** Every tag used across the given asks, sorted — the filter chip set. */
export function collectTags(asks: Ask[]): string[] {
  return Array.from(new Set(asks.flatMap((ask) => ask.tags ?? []))).sort();
}

// --- Ask-to-ask similarity (duplicate checks) -------------------------------

/**
 * How much two ask texts say the same thing in the same words, 0–1 (Dice
 * coefficient over stemmed words). Synonyms are deliberately *not* used:
 * this is the cheap, certain half of the duplicate check, and "air" ~
 * "pollution" would make it trigger-happy. Paraphrases are the meaning
 * layer's job.
 */
export function askSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = new Set(tokenize(b));
  if (ta.length === 0 || tb.size === 0) return 0;
  const shared = ta.filter((t) => tb.has(t)).length;
  return (2 * shared) / (ta.length + tb.size);
}

/**
 * At or above this, two texts are near-verbatim the same ask. Only used to
 * block outright — a lower score is passed to the meaning layer instead,
 * since "Double the bus fleet" and "Halve the bus fleet" score 0.8.
 */
export const DUPLICATE_SIMILARITY = 0.9;

/** The existing ask most nearly identical in wording, if any is a duplicate. */
export function findNearIdentical(text: string, asks: Ask[]): Ask | null {
  let best: Ask | null = null;
  let bestScore = 0;
  for (const ask of asks) {
    const score = askSimilarity(text, ask.askText);
    if (score > bestScore) {
      best = ask;
      bestScore = score;
    }
  }
  return bestScore >= DUPLICATE_SIMILARITY ? best : null;
}
