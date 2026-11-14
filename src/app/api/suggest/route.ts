import { NextResponse } from "next/server";
import { knowledgeContext } from "@/lib/knowledge";
import { chatJSON } from "@/lib/llm";
import { askSimilarity, findNearIdentical, rankAsks } from "@/lib/match";
import { findDuplicate } from "@/lib/semantic-match";
import { getSearchableAsks } from "@/lib/submissions";
import {
  PRECEDENT_RULES,
  formatPrecedentContext,
  validPrecedent,
} from "@/lib/precedent";
import { planResearch } from "@/lib/research-plan";
import { normalizeTimeframe } from "@/lib/timeframe";
import { formatSearchContext, webSearchAll } from "@/lib/web-search";
import {
  RESPONSIBLE_PEOPLE_RULES,
  finalizeResponsiblePeople,
  gatherOfficeholderContext,
} from "@/lib/resolve-ask";
import type { Ask, Precedent, ResponsiblePerson } from "@/lib/types";
import { toTopics, topicsForPrompt } from "@/lib/topics";

/*
  Suggest flow, built around two measured facts about these models: they
  write ~100 tokens a second, and before answering anything non-trivial they
  think invisibly for hundreds of tokens (~3s) — and that thinking grows with
  the size of the task. One call writing three full asks with three named
  officials each was ~1,800 tokens ≈ 18s of spinner. So the work is split
  into small calls that run at the same time, and the results are streamed
  to the screen as NDJSON events:

    summary / ask   one call per card, each with a fixed angle, all in
                    parallel — all three done in ~6s instead of ~18s. A
                    card has no people yet; that was most of the length.
    people          who's responsible, per card, from a background call
                    (it needs the officeholder searches, started up front).
    stage           progress before the first card — "reading" what was
                    typed, "researching", then "drafting" — so the wait
                    says what it's doing.
    drop            a card that turned out to repeat an existing ask; the
                    meaning-based duplicate check runs per card in the
                    background rather than holding every card back.
    done            everything finished; carries the existing asks drafts
                    were dropped for repeating.

  The guarantees against duplicates don't depend on holding cards back:
  every call is shown the existing asks, wording is checked before a card
  is sent, the meaning check can retract a card, and picking a card is
  checked again before review and again in /api/submissions.
*/

interface Draft {
  askText: string;
  currentValue: string;
  targetValue: string;
  timeframe: string;
  targetBody: string;
  tags: string[];
  sourceUrl: string | null;
  precedent: Precedent | null;
}

/** One card per facet of the plan (lib/research-plan.ts): different
 *  changes decided up front, so parallel calls can't converge on the same
 *  card. Each copies what has already worked for its own change, because an
 *  ask with a delivered result behind it is the hardest to wave away. (A
 *  "publish the data" card used to be a fixed third angle; it made a third
 *  of all suggestions reporting asks, so now it's a facet only when asked.) */
function angleFor(focus: string): string {
  return `${focus}. Ask for exactly this change — the other cards cover the other parts of what the citizen wants. If the "done elsewhere" results show a place that has already made this change, bring it here: the same change on the same measure, with a target and deadline in line with what that place achieved and how long it took`;
}

const CARD_PROMPT = `You write ONE concrete, verifiable policy "ask" for a civic accountability platform in India, from a citizen's plain-text complaint. Your angle: {ANGLE}.

Output ONE JSON object and nothing else (no fence, no prose) with these fields:
- askText: an imperative headline, 8-14 words, that stands on its own when shared without the card around it: the action, what it acts on, and HOW MUCH it changes, as the size of the change — computed exactly from currentValue and targetValue (e.g. "Raise public education spending by 3.1 percentage points of GDP", "Expand India's forest cover by 0.8 percentage points of land area", "Add 50 km to Bengaluru's metro network"). Never the absolute current or target figure and never the deadline or a report name — those are shown on their own lines, and repeating them is noise. If the ask isn't a numeric change (publishing, creating, mandating), the headline just has to say plainly what is being asked (e.g. "Publish annual district-level forest cover data").
- currentValue: where things stand now, a number or fact, 12 words at most (e.g. "2.9% of GDP").
- targetValue: the desired state, 12 words at most (e.g. "6% of GDP").
- timeframe: an absolute deadline "Mon YYYY" (e.g. "Mar 2030"), never a relative phrase. If only a year is known, use "Jan YYYY" or "Dec YYYY".
- targetBody: the government body accountable (e.g. "Ministry of Education").
- tags: 1-2 topics, main one first, each copied exactly from this fixed list (pick by what the ask would change, not how: a "publish the data" ask about water is Water, not Governance):
${topicsForPrompt()}
- sourceUrl: the URL from the search results that best supports currentValue/targetBody, or null.
- precedent: {place, summary, sourceUrl} for a place that has already achieved what THIS card asks for, or null. ${PRECEDENT_RULES}

Rules:
- Ground currentValue and targetBody in the verified facts and live search results below — not your memory, which goes stale. If they don't support a confident figure, describe where things stand in words (e.g. "Manual tests at most RTOs; no camera record") rather than inventing a number.
- Ask for the change the citizen wants, never a report about it, unless your angle is transparency. A missing figure is not a reason to turn the ask into "publish data" or "track X": ask for the real outcome with a target anyone can check without a statistic — "at every RTO", "all new licences", "within 30 days".
- currentValue and targetValue must state the actual figure or fact, never point at it: "Existing rates", "current levels" and "25% higher than today" tell the reader nothing. If a rate is known, write it out, and compute the target from it. A percentage rise on a figure you don't have is not a usable ask: pick a measure you do have a figure for.
- Name a specific tax, scheme or law only if the facts or search results below show it exists today; those from memory may have been abolished.
- Be practical, not literal: if the citizen's own figure or deadline isn't realistic given where things stand, set a target and deadline a government could actually be held to.
- Where there is a precedent, set targetValue and timeframe from what that place actually reached and how long it took — a result someone has already delivered is the strongest case that this one can be.
- If the citizen names no place, the ask is India-wide — don't narrow it to one city or state just because a search result is about one.
- Never repeat an ask already on the platform (listed below), or reword one, even with a different figure or deadline. If this angle is already covered by one of them, or doesn't apply to what the citizen wrote, output only {"skip": true}.
- Do NOT name officials — that is handled separately.`;

const SUMMARY_PROMPT = `A citizen typed a policy request, and we're drafting three asks for them, each a different change. In one or two short sentences, 30 words at most, tell them how you read what they typed and how the asks between them tackle it. No figures, no restating their query, no marketing tone, no list. E.g. "We read this as touts helping people skip the driving test, so the asks go after the test itself, how licences are issued, and checks on the road." Output ONLY {"summary": "..."}.`;

const PEOPLE_PROMPT = `Name who is accountable for one policy ask. Output ONLY {"responsiblePeople":[{"name":"...","designation":"...","organization":"..."}]} — no prose, no markdown fence.

${RESPONSIBLE_PEOPLE_RULES}`;

export async function POST(req: Request) {
  const { query } = await req.json();

  if (typeof query !== "string" || query.trim().length < 3) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const trimmedQuery = query.trim();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          // The person navigated away; nothing left to tell.
        }
      };
      try {
        await run(trimmedQuery, send, req.signal);
      } catch (err) {
        if (!req.signal.aborted) console.error("suggest route failed:", err);
        send({ t: "error" });
      }
      try {
        controller.close();
      } catch {
        // Already closed by an abort.
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

async function run(
  query: string,
  send: (event: object) => void,
  signal: AbortSignal,
) {
  // Slowest and least urgent, so it starts first and runs behind everything
  // else: only the people step needs it. Never reject — people just stay empty.
  const officeholders = gatherOfficeholderContext(query).catch((err) => {
    console.error("officeholder context failed:", err);
    return null;
  });

  // Understand first, then research, then write. People type the way they
  // talk, and searching on their exact words found nothing usable — so one
  // call reads what they meant and writes the searches, then all of them run
  // at once, and only then are the cards drafted: with where India stands
  // and where this has already worked both in hand, so the precedent shapes
  // the targets instead of arriving after them.
  send({ t: "stage", stage: "reading" });
  const [plan, { asks }] = await Promise.all([planResearch(query, signal), getSearchableAsks()]);
  send({ t: "stage", stage: "researching" });

  // The note for the whole set, from the plan — it says how the three
  // changes tackle what was typed, so it needn't wait for any card (written
  // from the first card, it described that one card as if it were all).
  const background: Promise<unknown>[] = [
    chatJSON<{ summary?: string }>({
      system: SUMMARY_PROMPT,
      user: `Citizen typed: "${query}"\nRead as: ${plan.topic}\nThe three asks: ${plan.facets.map((f) => f.focus).join("; ")}`,
      maxTokens: 1500,
      signal,
    })
      .then((r) => {
        if (typeof r.summary === "string" && r.summary.trim()) {
          send({ t: "summary", summary: firstSentences(r.summary.trim(), 2) });
        }
      })
      .catch((err) => {
        if (!signal.aborted) console.error("summary failed:", err);
      }),
  ];
  const [statusResults, precedentResults] = await Promise.all([
    webSearchAll(plan.statusQueries, 4),
    webSearchAll(
      plan.facets.map((f) => f.precedentQuery).filter(Boolean),
      4,
    ),
  ]);
  send({ t: "stage", stage: "drafting" });
  console.log(
    `[suggest] read as "${plan.topic}"; facets: ${plan.facets.map((f) => f.focus).join(" | ")}; ${statusResults.length} status / ${precedentResults.length} precedent results`,
  );
  const readAs = `${query} ${plan.topic}`;

  // The cards are written without waiting on the meaning-based match (the
  // search box is still running it, ~2s): for a small catalogue every ask
  // goes into the prompt, otherwise the keyword-closest ones. Paraphrases
  // that slip through are caught by the per-card duplicate check.
  const existing = relevantExisting(readAs, asks);
  const existingContext =
    existing.length > 0
      ? `\n\nAsks already on the platform on this topic (do not duplicate these):\n${existing
          .map((a) => `- ${a.askText}${a.currentValue && a.targetValue ? ` (${a.currentValue} → ${a.targetValue})` : ""}`)
          .join("\n")}`
      : "";
  const statusContext =
    statusResults.length > 0
      ? `\n\nLive web search results (use these for current facts, not your own memory):\n${formatSearchContext(statusResults)}`
      : "\n\nNo web search results were available — apart from any verified facts above, describe where things stand in words rather than guessing specific figures.";
  const groundingContext = `${knowledgeContext(readAs)}${statusContext}`;

  const kept: { index: number; askText: string; outcome: string[] }[] = [];
  const coveredBy = new Set<string>();

  function accept(index: number, draft: Draft) {
    if (typeof draft.askText !== "string" || !draft.askText.trim()) return;
    // A reword of a card already sent in this batch, or near-verbatim an
    // existing ask: skip without the LLM.
    // The angles already keep the cards apart, so this only catches a true
    // copy — on a narrow topic every headline shares most of its words.
    const reworded = kept.find((k) => askSimilarity(k.askText, draft.askText) >= 0.85);
    if (reworded) {
      console.log(`[suggest] card ${index} dropped: reword of card ${reworded.index}: "${draft.askText}"`);
      return;
    }
    const identical = findNearIdentical(draft.askText, asks);
    if (identical) {
      console.log(`[suggest] card ${index} dropped: near-identical to "${identical.askText}": "${draft.askText}"`);
      coveredBy.add(identical.id);
      return;
    }

    const ask: Draft = {
      ...draft,
      timeframe: normalizeTimeframe(String(draft.timeframe ?? "")),
      // Snapped to the fixed topic list even if the model strays from it.
      tags: toTopics(Array.isArray(draft.tags) ? draft.tags : [], String(draft.askText ?? "")),
      sourceUrl: draft.sourceUrl ?? null,
      precedent: validPrecedent(draft.precedent, precedentResults),
    };
    // Two cards chasing the same numeric outcome ("add 3,000 buses" and
    // "fund 3,000 more buses") read as one ask twice. Keep the direct one —
    // the lower angle — and drop the other; the funding/tracking angles are
    // only worth a card when they ask for something of their own.
    const outcome = figuresIn(ask.targetValue);
    const sameOutcome = kept.find(
      (k) => outcome.length > 0 && k.outcome.join() === outcome.join(),
    );
    if (sameOutcome) {
      if (sameOutcome.index < index) {
        console.log(`[suggest] card ${index} dropped: same outcome as card ${sameOutcome.index}`);
        return;
      }
      // This one is the more direct card but arrived second: retract the other.
      kept.splice(kept.indexOf(sameOutcome), 1);
      send({ t: "drop", index: sameOutcome.index });
    }
    kept.push({ index, askText: ask.askText, outcome });
    send({ t: "ask", index, ask });

    background.push(
      // Who's responsible — joins when the officeholder lookup is ready.
      (async () => {
        let people: ResponsiblePerson[] = [];
        try {
          const office = await officeholders;
          if (office) {
            const picked = await chatJSON<{ responsiblePeople?: ResponsiblePerson[] }>({
              system: PEOPLE_PROMPT,
              user: `Ask: "${ask.askText}" (${ask.currentValue} → ${ask.targetValue}; ${ask.targetBody})${office.context}`,
              maxTokens: 1500,
            });
            people = finalizeResponsiblePeople(
              picked.responsiblePeople,
              office.jurisdiction.national,
            );
          }
        } catch (err) {
          console.error("responsible people failed:", err);
        }
        send({ t: "people", index, people });
      })(),
      // The meaning-based duplicate check, per card, without holding any
      // card back; a hit retracts the card.
      findDuplicate(ask.askText, asks).then((duplicate) => {
        if (!duplicate) return;
        coveredBy.add(duplicate.id);
        send({ t: "drop", index, duplicateId: duplicate.id });
      }),
    );
  }

  // The precedent results go to the cards only: the summary note is about
  // how the query was read, and shouldn't quote another city's figures.
  const user = `Citizen's query: "${query}"\nRead as: ${plan.topic}${existingContext}${groundingContext}${formatPrecedentContext(precedentResults)}`;
  let failures = 0;
  await Promise.all(
    plan.facets.map(async ({ focus }, index) => {
      try {
        const out = await chatJSON<Record<string, unknown>>({
          system: CARD_PROMPT.replace("{ANGLE}", angleFor(focus)),
          user,
          maxTokens: 2000,
          signal,
        });
        if (out.skip === true) {
          console.log(`[suggest] card ${index} skipped by the model for "${query}"`);
          return;
        }
        accept(index, out as unknown as Draft);
      } catch (err) {
        failures++;
        if (!signal.aborted) console.error(`suggest card ${index} failed:`, err);
      }
    }),
  );
  if (failures === plan.facets.length) throw new Error("every card call failed");

  await Promise.allSettled(background);
  send({ t: "done", coveredBy: [...coveredBy] });
}

/** The numbers in a target ("10,000 buses" → ["10000"]), commas removed, in order. */
function figuresIn(text: string): string[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
}

/** Existing asks every card call is told not to repeat: all of them while
 *  the catalogue is small, otherwise the keyword-closest, capped. */
function relevantExisting(query: string, asks: Ask[]): Ask[] {
  if (asks.length <= 40) return asks;
  return rankAsks(asks, { query, tags: [] })
    .slice(0, 30)
    .map((r) => r.ask);
}

/** The note under "New — Suggested" must stay a glance, not a paragraph —
 *  keep at most `n` sentences even if the model runs long. */
function firstSentences(text: string, n: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!sentences || sentences.length <= n) return text;
  return sentences.slice(0, n).join("").trim();
}
