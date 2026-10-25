"use client";

import { useEffect, useState } from "react";
import { AskCard } from "@/components/ask/AskCard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SuggestThinking } from "@/components/submit/SuggestThinking";
import {
  ReviewSubmissionModal,
  type ReviewDraft,
  type ReviewResult,
} from "@/components/submit/ReviewSubmissionModal";
import { useSuggestions } from "@/components/submit/useSuggestions";
import { findNearIdentical, type SemanticVerdict } from "@/lib/match";
import type { Ask, AskSuggestion } from "@/lib/types";
import { recordVote } from "@/lib/vote-session";

function suggestionToAsk(s: AskSuggestion, i: number): Ask {
  return {
    id: `suggestion-${i}`,
    askText: s.askText,
    currentValue: s.currentValue,
    targetValue: s.targetValue,
    timeframe: s.timeframe,
    targetBody: s.targetBody,
    responsiblePeople: s.responsiblePeople ?? undefined,
    tags: s.tags,
    verificationStatus: "unverified",
    voteCount: 0,
    partyResponses: [],
  };
}

/** A draft on its way through review: what the person sees and edits, plus
 *  the fields that ride along unchanged (accountable body, tags). */
type Draft = ReviewDraft & { targetBody: string; tags: string[] };

/** Everything written for a new ask — the full measurable shape, so an
 *  AI-drafted ask never loses its current → target on the way in. */
type Payload = Draft;

function newAsk(id: string, p: Payload): Ask {
  return {
    id,
    askText: p.askText,
    currentValue: p.currentValue,
    targetValue: p.targetValue,
    timeframe: p.timeframe,
    targetBody: p.targetBody,
    responsiblePeople: p.responsiblePeople,
    tags: p.tags,
    verificationStatus: "unverified",
    voteCount: 1,
    partyResponses: [],
  };
}

/**
 * Tiers 2 and 3 of the search flow, shown when nothing on the platform
 * matches the query well: (2) AI-suggested asks shaped to the schema, (3) an
 * escape hatch to add exactly what was typed. Both go through a duplicate
 * check, the review screen (current → target, deadline, responsible people)
 * and a "this dilutes focus" confirmation before the write, which also
 * casts the person's first vote. In `demo` mode the new ask is created in
 * memory only.
 *
 * Duplicates are checked three times, cheapest first: /api/suggest drops
 * drafts that repeat an existing ask; picking a draft or "add as typed"
 * checks again (wording here, meaning via /api/match) before the review
 * screen; /api/submissions refuses one as the final guarantee. Each time
 * the person is pointed at the existing ask to vote on instead.
 */
export function AddAskPanel({
  query,
  demo,
  budgetLeft,
  existingAsks,
  votedIds,
  onAdded,
  onVoteExisting,
  onCovered,
  onAuthRequired,
  onBeforeSubmit,
}: {
  query: string;
  demo: boolean;
  budgetLeft: number;
  /** Every ask on screen, for the duplicate check. */
  existingAsks: Ask[];
  votedIds: Set<string>;
  /** Called with the newly created ask (already carrying the person's vote). */
  onAdded: (ask: Ask) => void;
  /** Casts the person's vote on an existing ask their idea duplicated. */
  onVoteExisting: (id: string) => void;
  /** Existing asks that AI drafts were dropped for repeating — worth
   *  showing in the results, since they're about what was typed. */
  onCovered?: (ids: string[]) => void;
  /** The server says the person isn't signed in — open the Google prompt. */
  onAuthRequired?: () => void;
  /** Return true to stop the submit (e.g. sent to onboarding first). */
  onBeforeSubmit?: () => boolean;
}) {
  const { summary, suggestions, coveredBy, loading, streaming, error, peopleFor } =
    useSuggestions(query, true);
  const [flowError, setFlowError] = useState(false);
  const [schemaChoices, setSchemaChoices] = useState<AskSuggestion[] | null>(null); // freeform path: "doesn't fit schema"
  const [working, setWorking] = useState(false); // duplicate check / filling in fields before review
  const [duplicateOf, setDuplicateOf] = useState<Ask | null>(null);
  const [pendingReview, setPendingReview] = useState<Draft | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<Payload | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const coveredKey = coveredBy.join(",");
  useEffect(() => {
    if (coveredKey) onCovered?.(coveredKey.split(","));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the set changes
  }, [coveredKey]);

  /** The existing ask `askText` would repeat, or null. A failed meaning
   *  check passes — the server's guard on submission still applies. */
  async function existingDuplicate(askText: string): Promise<Ask | null> {
    const identical = findNearIdentical(askText, existingAsks);
    if (identical) return identical;
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: askText }),
      });
      if (!res.ok) return null;
      const { matches } = (await res.json()) as { matches?: SemanticVerdict[] };
      const same = matches?.find((m) => m.relation === "same");
      return same ? (existingAsks.find((a) => a.id === same.id) ?? null) : null;
    } catch {
      return null;
    }
  }

  // Tier 3: "add exactly what you typed" first offers the schema-fitting
  // suggestions we already fetched.
  function handleFreeformClick() {
    if (suggestions.length > 0) setSchemaChoices(suggestions);
    else resolveFreeformThenReview(query);
  }

  // Freeform has no current → target, deadline or people yet (it's raw
  // text) — fill those in via AI+search before the review screen, same
  // guarantee tier 2 gets for free. Duplicate check first: no point
  // resolving an ask that already exists.
  async function resolveFreeformThenReview(askText: string) {
    setWorking(true);
    try {
      const duplicate = await existingDuplicate(askText);
      if (duplicate) {
        setDuplicateOf(duplicate);
        return;
      }
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ askText }),
      });
      if (!res.ok) throw new Error("resolve failed");
      const data = await res.json();
      setPendingReview({
        askText,
        currentValue: data.currentValue ?? "",
        targetValue: data.targetValue ?? "",
        timeframe: data.timeframe,
        targetBody: data.targetBody ?? "",
        tags: data.tags ?? [],
        responsiblePeople: data.responsiblePeople,
      });
    } catch {
      setFlowError(true);
    } finally {
      setWorking(false);
    }
  }

  // Tier 2: a suggested card opens the review screen with the AI's draft.
  async function handleSuggestionClick(s: AskSuggestion & { index?: number }) {
    setWorking(true);
    try {
      const duplicate = await existingDuplicate(s.askText);
      if (duplicate) {
        setDuplicateOf(duplicate);
        return;
      }
      // Who's responsible is looked up after the card appears (it's the slow
      // part), so it may still be on its way: wait for it, and only if it
      // never lands ask /api/resolve — every ask needs someone accountable.
      let people = s.responsiblePeople;
      if (!people && s.index !== undefined) people = await peopleFor(s.index);
      if (!people || people.length === 0) {
        const res = await fetch("/api/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ askText: s.askText }),
        });
        if (!res.ok) throw new Error("resolve failed");
        people = (await res.json()).responsiblePeople ?? [];
      }
      setPendingReview({
        askText: s.askText,
        currentValue: s.currentValue ?? "",
        targetValue: s.targetValue ?? "",
        timeframe: s.timeframe,
        targetBody: s.targetBody ?? "",
        tags: s.tags ?? [],
        responsiblePeople: people ?? [],
      });
    } catch {
      setFlowError(true);
    } finally {
      setWorking(false);
    }
  }

  function handleReviewConfirm(final: ReviewResult) {
    if (!pendingReview) return;
    setPendingConfirm({ ...pendingReview, ...final });
    setPendingReview(null);
  }

  function voteForDuplicate() {
    if (duplicateOf && !votedIds.has(duplicateOf.id) && budgetLeft > 0) {
      onVoteExisting(duplicateOf.id);
    }
    setDuplicateOf(null);
  }

  async function submit(payload: Payload) {
    if (budgetLeft <= 0) {
      setFlowError(true);
      return;
    }
    if (onBeforeSubmit?.()) return;
    if (demo) {
      onAdded(newAsk(`demo-${Date.now()}`, payload));
      setPendingConfirm(null);
      setSchemaChoices(null);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        onAuthRequired?.();
        return;
      }
      if (res.status === 409) {
        // The server's duplicate guard caught one the earlier checks missed.
        const { duplicateOf: dup } = await res.json();
        const existing = existingAsks.find((a) => a.id === dup?.id);
        if (existing) setDuplicateOf(existing);
        else setFlowError(true);
        return;
      }
      if (!res.ok) throw new Error("submit failed");
      const data = await res.json();
      if (data.voteId) recordVote(data.id, data.voteId);
      onAdded(newAsk(data.id, payload));
    } catch {
      setFlowError(true);
    } finally {
      setSubmitting(false);
      setPendingConfirm(null);
      setSchemaChoices(null);
    }
  }

  const alreadyVoted = duplicateOf ? votedIds.has(duplicateOf.id) : false;

  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="text-[13px] uppercase tracking-[0.08em] text-text-muted">
          New — Suggested
        </h2>

        {loading && <SuggestThinking />}

        {/* One short note for the whole set — how the query was read and
            why these targets — so the cards themselves stay terse. */}
        {!loading && !error && summary && (
          <p className="text-sm text-text-secondary leading-relaxed">
            {summary}
          </p>
        )}

        {!loading && (error || flowError) && (
          <div className="text-center py-8 text-text-secondary text-sm">
            {flowError
              ? "Couldn’t add that right now."
              : "Couldn’t generate suggestions right now."}
          </div>
        )}

        {!loading && !streaming && !error && suggestions.length === 0 && !summary && (
          <div className="text-center py-4 text-text-secondary text-sm">
            {coveredBy.length > 0
              ? "What we’d suggest is already on the platform — it’s in the list above."
              : "No new suggestions for this."}
          </div>
        )}

        {!loading &&
          suggestions.map((s, i) => (
            <div key={s.index} className="relative">
              <span className="absolute -top-2 left-4 z-10 text-[10px] uppercase tracking-[0.08em] bg-paper px-1.5 text-text-muted">
                Suggested — not yet added
              </span>
              <AskCard
                ask={suggestionToAsk(s, i)}
                compact
                showInfo={false}
                voteLabel="1st vote"
                disabled={working}
                onVote={() => handleSuggestionClick(s)}
              />
              {s.sourceUrl && (
                <a
                  href={s.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-text-muted hover:text-text-secondary transition-colors pl-4 mt-1 inline-block"
                >
                  Source ↗
                </a>
              )}
            </div>
          ))}

        {/* Cards land one by one; say so while the rest are still coming. */}
        {!loading && streaming && suggestions.length > 0 && (
          <p className="text-center text-xs text-text-muted">Finding more…</p>
        )}

        {!loading && (
          <button
            type="button"
            onClick={handleFreeformClick}
            disabled={working}
            className="text-left text-sm text-text-secondary hover:text-text px-4 py-3 border border-dashed border-border rounded-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            Can&rsquo;t find it? Add &ldquo;{query}&rdquo; exactly as typed.
          </button>
        )}
      </div>

      {schemaChoices && (
        <ConfirmModal
          title="That doesn't quite fit our format"
          body="Here's how we'd phrase it so it fits the platform's format. You can pick one of these, or still add exactly what you typed."
          confirmLabel="Add as typed anyway"
          cancelLabel="Nevermind"
          onCancel={() => setSchemaChoices(null)}
          onConfirm={() => {
            setSchemaChoices(null);
            resolveFreeformThenReview(query);
          }}
        >
          <div className="flex flex-col gap-2">
            {schemaChoices.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSchemaChoices(null);
                  handleSuggestionClick(s);
                }}
                className="text-left text-sm px-3 py-2 rounded-sm border border-border hover:border-muted bg-paper transition-colors cursor-pointer"
              >
                {s.askText}
              </button>
            ))}
          </div>
        </ConfirmModal>
      )}

      {working && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="bg-card border border-border rounded-card shadow-lg px-6 py-5">
            <SuggestThinking />
          </div>
        </div>
      )}

      {duplicateOf && (
        <ConfirmModal
          title="This is already on the platform"
          body={
            alreadyVoted
              ? "You’ve already voted for it — your vote is counted there."
              : "One ask with all the votes carries more weight than two splitting them. Add your vote to this one instead."
          }
          confirmLabel={
            alreadyVoted || budgetLeft <= 0 ? "OK" : "Vote for this instead"
          }
          cancelLabel="Back"
          onCancel={() => setDuplicateOf(null)}
          onConfirm={voteForDuplicate}
        >
          <AskCard ask={duplicateOf} compact />
        </ConfirmModal>
      )}

      {pendingReview && (
        <ReviewSubmissionModal
          draft={pendingReview}
          submitting={false}
          onCancel={() => setPendingReview(null)}
          onConfirm={handleReviewConfirm}
        />
      )}

      {pendingConfirm && (
        <ConfirmModal
          title="Consider voting on an existing ask instead"
          body="Adding new asks spreads votes thinner across the platform, which can slow down what's already close to a tipping point. If this genuinely isn't covered yet, go ahead — it's worth adding."
          confirmLabel={submitting ? "Adding…" : "Add it anyway"}
          cancelLabel="Back"
          onCancel={() => setPendingConfirm(null)}
          onConfirm={() => submit(pendingConfirm)}
        />
      )}
    </>
  );
}
