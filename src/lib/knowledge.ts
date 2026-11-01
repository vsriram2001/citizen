// Hand-checked facts for the suggest flow. Live search is the general source,
// but it can come back empty or vague, and then the model falls back on its
// memory, which goes stale: a tax can be abolished and it won't know. An entry
// here reaches every card regardless of search, so it has to stay true —
// each one carries its date and source, and is re-checked when the law changes.

interface KnowledgeEntry {
  /** Tested against the citizen's query. */
  match: RegExp;
  topic: string;
  asOf: string;
  sourceUrl: string;
  facts: string[];
}

const KNOWLEDGE: KnowledgeEntry[] = [
  {
    match: /\b(cigarettes?|smoking|smokers?|tobacco)\b/i,
    topic: "Cigarette tax",
    asOf: "Nov 2026",
    // Press reports of the Finance Ministry notification, not the notification
    // itself. Outlets differ on the lowest slab, so only the range is kept.
    sourceUrl:
      "https://thefederal.com/category/business/india-imposes-new-excise-duty-cigarettes-feb-1-tobacco-shares-fall-223496",
    facts: [
      "Since 1 Feb 2026 cigarettes carry 40% GST plus a central excise duty of ₹2.05–8.50 per stick (₹2,050–8,500 per 1,000 sticks, depending on length).",
      "The GST compensation cess on tobacco ended on 1 Feb 2026. Never describe it as a current levy.",
      "Total tax was about 53% of the retail price before that change, against the WHO's recommended 75%. Estimates since then disagree, so don't state a current total share.",
    ],
  },
];

/** The facts relevant to a query, formatted for a prompt; "" when none apply. */
export function knowledgeContext(query: string): string {
  const entries = KNOWLEDGE.filter((entry) => entry.match.test(query));
  if (entries.length === 0) return "";
  return `\n\nVerified facts (these outrank the search results and your memory; use their exact figures, and their source as sourceUrl when they support currentValue):\n${entries
    .map(
      (e) =>
        `${e.topic}, as of ${e.asOf} (${e.sourceUrl}):\n${e.facts.map((f) => `- ${f}`).join("\n")}`,
    )
    .join("\n\n")}`;
}
