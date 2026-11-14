import { isPlaceName } from "@/lib/places";

/*
  The fixed set of topics every ask is filed under. One list, read by the
  /start pills, the topic tabs, the filter panel, the card and the AI that
  drafts asks, so the same thing is never called two names.

  Built from a civics taxonomy of 29 themes (the GS1–GS4 split), merged to
  13 by these rules:
    1. 10–14 topics: one phone screen of pills, scannable without scrolling.
    2. Said the way a person would say it, three words at most.
    3. Every theme lands in exactly one topic, so every ask has a home.
    4. No topic over ~25% of asks or under ~3%; split or merge when the mix
       shifts (revisit as the ask count grows).
    5. File an ask by what it would change, not how. "Publish monthly water
       test results" is Water, not Transparency: openness, budgets and
       regulation are the means of most asks. Those tags are "means", and only
       decide the topic when nothing else does.
    6. One main topic, at most two.
    7. No places (States/Cities filters cover them), no party language.

  Tags in the database stay as they were written; asks are mapped onto these
  topics as they're read (lib/submissions.ts), so nothing is rewritten.
*/

export const TOPICS = [
  {
    name: "Prices & Money",
    covers: "inflation, fuel and LPG prices, GST and taxes, essential-goods prices, loans, banking, insurance, consumer protection, unfair pricing, e-commerce fraud",
  },
  {
    name: "Jobs & Business",
    covers: "unemployment, minimum wage, gig-worker rights, skilling, job security, MSMEs, startups, ease of doing business, shop licences",
  },
  {
    name: "Health",
    covers: "hospital access, medicine prices, health insurance, mental health, emergency care, nutrition, food safety, drug abuse",
  },
  {
    name: "Education",
    covers: "school quality, fees, higher-education access, exam fairness, paper leaks",
  },
  {
    name: "Farming & Food",
    covers: "farmer income, MSP, irrigation, crop insurance, food processing, PDS rations",
  },
  {
    name: "Transport & Roads",
    covers: "roads, potholes, rail, metro, buses, public transport, traffic, road safety, ports",
  },
  {
    name: "Water, Power & Waste",
    covers: "drinking water, sewage, toilets, solid waste, power cuts, electricity tariffs, rooftop solar, cooking fuel",
  },
  {
    name: "Environment & Climate",
    covers: "air quality, pollution, forests, lakes, climate resilience, floods, heat waves, disaster relief, stray animals, human-wildlife conflict",
  },
  {
    name: "Cities & Housing",
    covers: "affordable housing, slums, rent, urban planning, municipalities and panchayats, ward planning, land records, parks, libraries, sports facilities, heritage",
  },
  {
    name: "Safety & Justice",
    covers: "crime, cybercrime, police reform, court delays, legal aid, prisons, law reform, drugs trade",
  },
  {
    name: "Rights & Welfare",
    covers: "women's safety, maternity benefits, childcare, child protection, senior citizens, disability, pensions, caste and minority welfare, tribal rights, migrant workers, reservation",
  },
  {
    name: "Governance & Transparency",
    covers: "RTI, corruption, grievance redressal, e-governance, citizen charters, time-bound services, political funding, civil services, regulators, elections",
  },
  {
    name: "Digital & Tech",
    covers: "internet access, data privacy, cyber fraud, digital payments, AI and jobs",
  },
] as const;

export type Topic = (typeof TOPICS)[number]["name"];

export const TOPIC_NAMES: Topic[] = TOPICS.map((t) => t.name);

export function isTopic(value: string): value is Topic {
  return (TOPIC_NAMES as string[]).includes(value);
}

/** At most this many topics per ask (rule 6). */
export const MAX_TOPICS = 2;

// Tag words → topic. A "means" entry (rule 5) only counts when no subject
// entry matched. First match wins, so narrower words sit above broader ones
// ("Road Safety" is Transport before "safety" makes it Safety & Justice;
// "Electricity" is Power before "city" makes it Cities).
const RULES: { re: RegExp; topic: Topic; means?: true }[] = [
  { re: /road|transport|metro|\bbus(es)?\b|\brail|traffic|mobility|\bports?\b/i, topic: "Transport & Roads" },
  { re: /cyber|digital|internet|data privacy|privacy|\bai\b|technology/i, topic: "Digital & Tech" },
  { re: /inflation|pric|\btax|\bbank|loan|insurance|\bgst\b|fuel|\blpg\b/i, topic: "Prices & Money" },
  { re: /agri|farm|crop|\bmsp\b|irrigation|\bpds\b|\brations?\b/i, topic: "Farming & Food" },
  { re: /health|hospital|diabet|disease|doctor|medic|nutrition|food safety|drug|mental/i, topic: "Health" },
  { re: /educat|school|exam|college|universit|student/i, topic: "Education" },
  { re: /electric|power|energy|solar|water|sanitation|sewage|toilet|waste|garbage/i, topic: "Water, Power & Waste" },
  { re: /environment|climate|forest|\bair\b|pollution|lake|river|disaster|flood|\bheat|wildlife|animal/i, topic: "Environment & Climate" },
  { re: /women|gender|child|elder|senior|disab|pension|welfare|reservation|caste|minorit|tribal|migrant|civil rights|human rights/i, topic: "Rights & Welfare" },
  { re: /justice|\blaws?\b|court|polic(e|ing)|crime|criminal|prison|legal/i, topic: "Safety & Justice" },
  { re: /hous|urban|city|cities|municipal|panchayat|\bwards?\b|\bland|public space|\bparks?\b|\bsports?\b|heritage|librar/i, topic: "Cities & Housing" },
  { re: /job|employ|labou?r|wage|skill|msme|business|industr|startup|\bgig\b/i, topic: "Jobs & Business" },
  { re: /corruption|\brti\b|election|civil service/i, topic: "Governance & Transparency" },
  // Means, not ends (rule 5).
  { re: /transparen|accountab|governance|regulat|public.?service|constitution|data|budget|spending/i, topic: "Governance & Transparency", means: true },
  { re: /econom|financ/i, topic: "Prices & Money", means: true },
  // Consumer protection is how an ask is framed (calorie labels are a Health
  // ask, surge-fare caps already say "pricing").
  { re: /consumer/i, topic: "Prices & Money", means: true },
  // Mostly roads and bridges in practice; the taxonomy pairs it with transport.
  { re: /infra|construction/i, topic: "Transport & Roads", means: true },
  { re: /safety|security/i, topic: "Safety & Justice", means: true },
];

function ruleFor(tag: string) {
  if (isTopic(tag)) return { topic: tag, means: undefined };
  return RULES.find((r) => r.re.test(tag));
}

/**
 * An ask's free-text tags → its topics (at most two, main one first), with
 * any place tags kept after them for search. When the tags name only a
 * means or nothing at all, the ask's own text decides.
 */
export function toTopics(tags: string[], fallbackText = ""): string[] {
  const subject: Topic[] = [];
  const means: Topic[] = [];
  const places: string[] = [];
  for (const tag of tags) {
    if (isPlaceName(tag)) {
      if (!places.includes(tag)) places.push(tag);
      continue;
    }
    const rule = ruleFor(tag.trim());
    if (!rule) continue;
    const into = rule.means ? means : subject;
    if (!into.includes(rule.topic)) into.push(rule.topic);
  }
  // Only means-tags ("Governance", "Transparency")? The ask's own words
  // usually name the subject ("…municipal corporation services" is Cities),
  // so read those before settling for the means.
  let topics: Topic[] = subject;
  if (topics.length === 0 && fallbackText) {
    const rule = RULES.find((r) => !r.means && r.re.test(fallbackText));
    if (rule) topics = [rule.topic];
  }
  if (topics.length === 0) topics = means;
  return [...topics.slice(0, MAX_TOPICS), ...places];
}

/** The topic list for an AI prompt: name and what it covers, one per line. */
export function topicsForPrompt(): string {
  return TOPICS.map((t) => `- ${t.name}: ${t.covers}`).join("\n");
}
