import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/llm";
import { askSimilarity, findNearIdentical, rankAsks } from "@/lib/match";
import { findDuplicate } from "@/lib/semantic-match";
import { getSearchableAsks } from "@/lib/submissions";
import { normalizeTimeframe } from "@/lib/timeframe";
import { formatSearchContext, webSearch } from "@/lib/web-search";
import {
  RESPONSIBLE_PEOPLE_RULES,
  finalizeResponsiblePeople,
  gatherOfficeholderContext,
} from "@/lib/resolve-ask";
import type { Ask, ResponsiblePerson } from "@/lib/types";

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
}

/** Fixed roles so parallel calls can't converge on the same card — "distinct
 *  angles" decided up front instead of by one model seeing all three. */
const ANGLES = [
  "the citizen's own request, made realistic: the most direct measurable ask that matches what they typed",
  "the funding, staffing or policy lever that would actually make that happen — the enabler, not the outcome",
  "transparency: regular public reporting or tracking so progress toward this goal can be checked by anyone",
];

const CARD_PROMPT = `You write ONE concrete, verifiable policy "ask" for a civic accountability platform in India, from a citizen's plain-text complaint. Your angle: {ANGLE}.

Output ONE JSON object and nothing else (no fence, no prose) with these fields:
- askText: an imperative headline, 8-14 words, that stands on its own when shared without the card around it: the action, what it acts on, and HOW MUCH it changes, as the size of the change — computed exactly from currentValue and targetValue (e.g. "Raise public education spending by 3.1 percentage points of GDP", "Expand India's forest cover by 0.8 percentage points of land area", "Add 50 km to Bengaluru's metro network"). Never the absolute current or target figure and never the deadline or a report name — those are shown on their own lines, and repeating them is noise. If the ask isn't a numeric change (publishing, creating, mandating), the headline just has to say plainly what is being asked (e.g. "Publish annual district-level forest cover data").
- currentValue: where things stand now, a number or fact, 12 words at most (e.g. "2.9% of GDP").
- targetValue: the desired state, 12 words at most (e.g. "6% of GDP").
- timeframe: an absolute deadline "Mon YYYY" (e.g. "Mar 2030"), never a relative phrase. If only a year is known, use "Jan YYYY" or "Dec YYYY".
- targetBody: the government body accountable (e.g. "Ministry of Education").
- tags: 1-3 short topic tags in Title Case, reusing common ones where they fit (e.g. ["Education", "Budget"]).
- sourceUrl: the URL from the search results that best supports currentValue/targetBody, or null.

Rules:
- Ground currentValue and targetBody in the live search results below — not your memory, which goes stale. If they don't support a confident figure, use a short qualitative currentValue (e.g. "No centralized public tracking") rather than inventing a number.
- Be practical, not literal: if the citizen's own figure or deadline isn't realistic given where things stand, set a target and deadline a government could actually be held to.
- If the citizen names no place, the ask is India-wide — don't narrow it to one city or state just because a search result is about one.
- Never repeat an ask already on the platform (listed below), or reword one, even with a different figure or deadline. If this angle is already covered by one of them, or doesn't apply to what the citizen wrote, output only {"skip": true}.
- Do NOT name officials — that is handled separately.`;

const SUMMARY_PROMPT = `A citizen typed a policy request and we drafted one ask for them. In one or two short sentences, 30 words at most, tell them how you read what they typed and, if the ask's target or deadline differs from what they asked for, why. No figures already shown on the ask, no restating their query, no marketing tone, nothing about other suggestions. E.g. "A 10-point jump isn't achievable by 2030 at today's pace, so the target is 24%." Output ONLY {"summary": "..."}.`;

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

  const [{ asks }, statusResults] = await Promise.all([
    getSearchableAsks(),
    webSearch(`${query} India government policy current status 2026`),
  ]);
  // The cards are written without waiting on the meaning-based match (the
  // search box is still running it, ~2s): for a small catalogue every ask
  // goes into the prompt, otherwise the keyword-closest ones. Paraphrases
  // that slip through are caught by the per-card duplicate check.
  const existing = relevantExisting(query, asks);
  const existingContext =
    existing.length > 0
      ? `\n\nAsks already on the platform on this topic (do not duplicate these):\n${existing
          .map((a) => `- ${a.askText}${a.currentValue && a.targetValue ? ` (${a.currentValue} → ${a.targetValue})` : ""}`)
          .join("\n")}`
      : "";
  const statusContext =
    statusResults.length > 0
      ? `\n\nLive web search results (use these for current facts, not your own memory):\n${formatSearchContext(statusResults)}`
      : "\n\nNo web search results were available — use qualitative currentValue language rather than guessing specific figures.";

  const kept: { index: number; askText: string; outcome: string[] }[] = [];
  const coveredBy = new Set<string>();
  const background: Promise<unknown>[] = [];
  let summaryStarted = false;

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
      tags: Array.isArray(draft.tags) ? draft.tags.slice(0, 3) : [],
      sourceUrl: draft.sourceUrl ?? null,
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

    // The note for the whole set, written once from the first card to land
    // and in the background — inside a card's own call it made that card the
    // slowest of the three.
    if (!summaryStarted) {
      summaryStarted = true;
      background.push(
        chatJSON<{ summary?: string }>({
          system: SUMMARY_PROMPT,
          user: `Citizen typed: "${query}"\nDrafted ask: "${ask.askText}" — now ${ask.currentValue}; target ${ask.targetValue} by ${ask.timeframe}.${statusContext}`,
          maxTokens: 1500,
          signal,
        })
          .then((r) => {
            if (typeof r.summary === "string" && r.summary.trim()) {
              send({ t: "summary", summary: firstSentences(r.summary.trim(), 2) });
            }
          })
          .catch((err) => console.error("summary failed:", err)),
      );
    }

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

  const user = `Citizen's query: "${query}"${existingContext}${statusContext}`;
  let failures = 0;
  await Promise.all(
    ANGLES.map(async (angle, index) => {
      try {
        const out = await chatJSON<Record<string, unknown>>({
          system: CARD_PROMPT.replace("{ANGLE}", angle),
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
  if (failures === ANGLES.length) throw new Error("every card call failed");

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
