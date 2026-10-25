"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AskCard } from "@/components/ask/AskCard";
import { AskList } from "@/components/ask/AskList";
import { ShowTopicContext } from "@/components/ask/ShowTopicContext";
import { FilterSidebar, SearchFilters } from "@/components/search/SearchFilters";
import { useAskFilters } from "@/components/search/useAskFilters";
import { useSemanticMatches } from "@/components/search/useSemanticMatches";
import { SignInModal } from "@/components/auth/SignInModal";
import { useAuth } from "@/components/auth/useAuth";
import { AddAskPanel } from "@/components/submit/AddAskPanel";
import { BallotAnimation } from "@/components/vote/BallotAnimation";
import { ReplaceVoteModal } from "@/components/vote/ReplaceVoteModal";
import { ReviewVotesModal } from "@/components/vote/ReviewVotesModal";
import { VotesSubmittedNotice } from "@/components/vote/VotesSubmittedNotice";
import { VoteTray } from "@/components/vote/VoteTray";
import { useVotes } from "@/components/vote/useVotes";
import { cn } from "@/lib/cn";
import { isOnboarded } from "@/lib/onboarding";
import { rankAsks, type SemanticVerdict } from "@/lib/match";
import type { Ask } from "@/lib/types";
import { VOTE_BUDGET, saveResume, type Resume } from "@/lib/vote-session";

/*
  Client half of the search/vote screen — a thin composition layer. Each
  concern lives in its own module so features can change independently:

    matching            lib/match.ts
    filters / sort      lib/filters.ts, components/search/SearchFilters.tsx + FilterPanel.tsx
    ranked list + card  components/ask/AskList.tsx, AskCard.tsx
    voting              components/vote/useVotes.ts
    suggest / add ask   components/submit/AddAskPanel.tsx

  Three-tier match flow: (1) match against existing asks — by keyword
  instantly, and by meaning once typing pauses — (2) when nothing matches
  well, AI-suggested asks shaped to the schema, (3) add exactly what was
  typed. Tiers 2 and 3 live in AddAskPanel.
*/
export function SearchClient({
  initialAsks,
  demo = false,
  initialQuery = "",
}: {
  initialAsks: Ask[];
  /** Prefilled search (from ?q=). */
  initialQuery?: string;
  /** Preview mode on seed data: votes and submissions live in memory only. */
  demo?: boolean;
}) {
  const router = useRouter();
  // Local copy so a newly-submitted ask (live immediately — no moderation
  // queue) can be added to the list without a full page reload.
  const [asks, setAsks] = useState(initialAsks);
  const [query, setQuery] = useState(initialQuery);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  // "None of these" — opens the add panel despite a strong match, for this query only.
  const [addAnywayFor, setAddAnywayFor] = useState<string | null>(null);
  // Existing asks /api/suggest found the person's idea already covers.
  const [covered, setCovered] = useState<{ query: string; ids: string[] }>({
    query: "",
    ids: [],
  });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [showBallotAnimation, setShowBallotAnimation] = useState(false);

  // Nav bar (h-14), search, heading and chips stay pinned while only the asks scroll. Their
  // height changes (chips wrap, filters toggle), so the desktop sidebar
  // reads it from a CSS variable to sit just below instead of underneath.
  const controlsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [controlsH, setControlsH] = useState(0);
  useEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setControlsH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const auth = useAuth();
  // Onboarding gates the first vote (never browsing): a new person is sent
  // to /onboarding and the vote tap is remembered so it finishes on return.
  function sendToOnboardingFirst(resume: Resume) {
    if (isOnboarded()) return false;
    saveResume(resume);
    router.push("/onboarding?next=/search");
    return true;
  }
  const {
    votedIds,
    submittedIds,
    voteInFlight,
    budgetLeft,
    replaceFor,
    voteError,
    dismissVoteError,
    closeReplace,
    castVote,
    retractVote,
    replaceVote,
    submitVotes,
    markVoted,
  } = useVotes({ demo, setAsks, auth, onResumeQuery: setQuery, gate: sendToOnboardingFirst });

  // Every vote spent and submitted: the ballot is final, so the screen stops
  // inviting votes (and new asks, which carry a founding vote).
  const allSubmitted = submittedIds.size >= VOTE_BUDGET;

  // Query first (lib/match.ts: keyword + meaning, best first), then
  // filters + sort on what's left — so the panel's counts follow what's
  // typed. Topics live in the filter panel now, hence no tags here.
  const trimmedQuery = query.trim();
  const semantic = useSemanticMatches(trimmedQuery);
  const ranked = useMemo(() => {
    const verdicts: SemanticVerdict[] = [...semantic.matches];
    if (covered.query === trimmedQuery) {
      for (const id of covered.ids) {
        if (!verdicts.some((v) => v.id === id)) verdicts.push({ id, relation: "related" });
      }
    }
    return rankAsks(asks, { query, tags: [] }, verdicts, { judged: semantic.judged });
  }, [asks, query, trimmedQuery, semantic.matches, semantic.judged, covered]);
  const queryMatches = useMemo(() => ranked.map((r) => r.ask), [ranked]);
  const highlights = useMemo(
    () => new Map(ranked.map((r) => [r.ask.id, r.highlight])),
    [ranked],
  );
  const filterState = useAskFilters(queryMatches);
  const filteredAsks = filterState.results;

  // A topic chip tapped in an ask's info sheet: narrow the list to that
  // topic (never toggles it off) and go back to the top to show the result.
  const listRef = useRef<HTMLDivElement>(null);
  const { filters: activeFilters, toggle: toggleFilter } = filterState;
  const showTopic = useCallback(
    (topic: string) => {
      if (!activeFilters.topics.includes(topic)) toggleFilter("topics", topic);
      window.scrollTo({ top: 0, behavior: "smooth" });
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [activeFilters.topics, toggleFilter],
  );

  function handleAdded(ask: Ask) {
    setAsks((prev) => [ask, ...prev]);
    markVoted(ask.id);
    setJustAdded(ask.askText);
    setQuery("");
  }

  // Offer to add an ask when the query itself found nothing strong — not
  // when the filters happen to hide every match. A strong match keeps it
  // behind "none of these".
  const hasStrongMatch = ranked.some((r) => r.strength === "strong");
  const queryReady = trimmedQuery.length >= 3;
  // The panel starts as soon as typing pauses, alongside the meaning check
  // instead of after it (that was ~2s of waiting for nothing). If the check
  // then finds the same ask, hasStrongMatch flips and the panel goes away.
  const showAddPanel =
    !allSubmitted && queryReady && semantic.started && (!hasStrongMatch || addAnywayFor === trimmedQuery);
  const showAddAnywayLink =
    !allSubmitted && queryReady && semantic.settled && hasStrongMatch && addAnywayFor !== trimmedQuery;
  const filteredOut = queryMatches.length > 0 && filteredAsks.length === 0;

  return (
    <>
      {/* Pinned under the header while the list scrolls. On phones it bleeds
          to the screen edges (negative margin = main's gutter) so cards
          don't show through beside it. */}
      <div
        ref={controlsRef}
        className="sticky top-14 lg:static z-30 bg-paper flex flex-col gap-2.5 sm:gap-3 pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
        <div className="flex flex-col gap-2">
          {/* The search box says what this screen is; on a phone the
              heading only costs a line of list. */}
          <h1 className="max-sm:sr-only font-display text-[22px] font-black text-headline tracking-[-0.02em]">
            Search
          </h1>
          <div className="relative">
            <input
              ref={searchRef}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search asks"
              placeholder="Search for an ask — or a topic you care about"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // The "Added …" notice belongs to the moment of adding; the
                // next thing typed is a new search.
                setJustAdded(null);
              }}
              // Results already update as you type, so the keyboard's
              // Search key just puts the keyboard away to show them.
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className={cn(
                "w-full bg-card text-text placeholder:text-text-muted",
                "border border-border rounded-sm pl-4 pr-11 py-3 text-[15px]",
                "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
                // Our own clear button below, not WebKit's tiny one.
                "[&::-webkit-search-cancel-button]:appearance-none",
              )}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-text-muted hover:text-text active:text-text cursor-pointer"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <SearchFilters state={filterState} total={queryMatches.length} searching={queryReady} />
      </div>

      <div
        className="grid lg:grid-cols-[1fr_360px] gap-8 items-start"
        style={{ "--controls-h": `${controlsH}px` } as React.CSSProperties}
      >
        {/* On lg the page itself is locked to the viewport, so this column is
            the only thing that scrolls and its scrollbar sits beside the cards. */}
        <div
          ref={listRef}
          className={cn(
            "flex flex-col gap-6 min-w-0 lg:max-h-[calc(100dvh-5.5rem-var(--controls-h))] lg:overflow-y-auto lg:pr-3",
            // Room for the vote tray so it never sits on top of the last card.
            votedIds.size > 0 && "pb-[calc(6rem+env(safe-area-inset-bottom))]",
          )}
          // Starting to scroll the results means you're done typing: put the
          // keyboard away so the list gets the whole screen (as native apps do).
          onTouchMove={() => {
            if (document.activeElement === searchRef.current) searchRef.current?.blur();
          }}
        >
          {allSubmitted && <VotesSubmittedNotice />}

          {filteredAsks.length > 0 && (
            <ShowTopicContext.Provider value={showTopic}>
            <AskList
              key={`${trimmedQuery}|${JSON.stringify(filterState.filters)}`}
              asks={filteredAsks}
              renderCard={(ask, rank, barPct) => (
                <AskCard
                  key={ask.id}
                  ask={ask}
                  compact
                  rank={rank}
                  barPct={barPct}
                  voted={votedIds.has(ask.id)}
                  // At 3/3 the button stays live: tapping it opens the replace card —
                  // unless every vote is submitted, when there is nothing to swap.
                  disabled={voteInFlight === ask.id || (allSubmitted && !votedIds.has(ask.id))}
                  onVote={() => castVote(ask.id)}
                  onUnvote={submittedIds.has(ask.id) ? undefined : () => retractVote(ask.id)}
                  highlight={highlights.get(ask.id)}
                />
              )}
            />
            </ShowTopicContext.Provider>
          )}

          {justAdded && (
            <div className="text-center py-4 text-sm text-text-secondary bg-card border border-border rounded-card">
              Added &ldquo;{justAdded}&rdquo; — it&rsquo;s live now, and your vote is counted.
            </div>
          )}

          {queryReady && !semantic.settled && (
            <p className="text-center text-xs text-text-muted">
              Looking for asks that mean the same thing…
            </p>
          )}

          {showAddAnywayLink && (
            <button
              type="button"
              onClick={() => setAddAnywayFor(trimmedQuery)}
              className="self-center text-[13px] text-text-secondary hover:text-text transition-colors underline decoration-transparent hover:decoration-current underline-offset-4 cursor-pointer"
            >
              None of these? Suggest a new ask
            </button>
          )}

          {showAddPanel && (
            <AddAskPanel
              key={trimmedQuery}
              query={trimmedQuery}
              demo={demo}
              budgetLeft={budgetLeft}
              existingAsks={asks}
              votedIds={votedIds}
              onAdded={handleAdded}
              onVoteExisting={castVote}
              onCovered={(ids) => setCovered({ query: trimmedQuery, ids })}
              onAuthRequired={() => auth.prompt({ query: trimmedQuery })}
              onBeforeSubmit={() => sendToOnboardingFirst({ query: trimmedQuery })}
            />
          )}

          {filteredOut && (
            <div className="text-center py-16 flex flex-col items-center gap-3">
              <p className="text-sm text-text-secondary">No asks match these filters.</p>
              <button
                type="button"
                onClick={filterState.clearAll}
                className="text-[13px] text-accent hover:underline underline-offset-4 cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}

          {queryMatches.length === 0 && !queryReady && (
            <div className="text-center py-16 text-text-secondary text-sm">
              Search for an ask, or type a topic you care about.
            </div>
          )}
        </div>

        <div className="hidden lg:block min-w-0">
          <FilterSidebar state={filterState} />
        </div>
      </div>

      {auth.promptOpen && (
        <SignInModal onSignIn={auth.signInWithGoogle} onClose={auth.closePrompt} />
      )}

      {voteError && (
        // Above the tray (or at the bottom when there is none), clear of the cards' buttons.
        <div
          role="alert"
          className={cn(
            "fixed inset-x-0 z-50 px-4 pointer-events-none",
            votedIds.size > 0 ? "bottom-24" : "bottom-4",
          )}
        >
          <div className="pointer-events-auto mx-auto max-w-xl flex items-start gap-3 bg-ink text-paper rounded-card px-4 py-3 shadow-lg">
            <p className="flex-1 text-[13px] leading-relaxed">{voteError}</p>
            <button
              type="button"
              onClick={dismissVoteError}
              aria-label="Dismiss"
              className="shrink-0 -m-1 p-1 text-paper/70 hover:text-paper cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {votedIds.size > 0 && !showBallotAnimation && (
        <VoteTray
          used={votedIds.size}
          submitted={[...votedIds].every((id) => submittedIds.has(id))}
          onReview={() => setReviewOpen(true)} />
      )}

      {reviewOpen && !showBallotAnimation && (
        <ReviewVotesModal
          asks={asks.filter((a) => votedIds.has(a.id))}
          busyId={voteInFlight}
          submittedIds={submittedIds}
          onRemove={retractVote}
          onClose={() => setReviewOpen(false)}
          onFinish={async () => {
            // Submitting locks the votes; only play the ballot if that stuck.
            if (!(await submitVotes())) return;
            setReviewOpen(false);
            setShowBallotAnimation(true);
          }}
        />
      )}

      {replaceFor && !showBallotAnimation && (() => {
        const wanted = asks.find((a) => a.id === replaceFor);
        if (!wanted) return null;
        return (
          <ReplaceVoteModal
            wanted={wanted}
            current={asks.filter((a) => votedIds.has(a.id))}
            submittedIds={submittedIds}
            busy={voteInFlight !== null}
            onReplace={replaceVote}
            onClose={closeReplace}
          />
        );
      })()}

      {showBallotAnimation && (
        <BallotAnimation
          asks={asks.filter((a) => votedIds.has(a.id))}
          onComplete={() => router.push("/share/votes")}
        />
      )}
    </>
  );
}
