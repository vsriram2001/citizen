"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { revealOnFocus } from "@/components/mobile/useMediaQuery";
import { SearchOptions } from "@/components/search/SearchOptions";
import { SearchPlaceholder } from "@/components/search/SearchPlaceholder";
import { VoiceButton } from "@/components/search/VoiceButton";
import { VoiceMode } from "@/components/search/VoiceMode";
import { useVoiceInput } from "@/components/search/useVoiceInput";
import { isOnboarded } from "@/lib/onboarding";
import { rankAsks, type SemanticVerdict } from "@/lib/match";
import { searchSuggestions } from "@/lib/search-suggestions";
import type { Ask } from "@/lib/types";
import { VOTE_BUDGET, saveResume, type Resume } from "@/lib/vote-session";

/** A moment on "searching" even when the answer is cached, so it doesn't flash past. */
const VOICE_RESULTS_BEAT_MS = 600;
/** The meaning check can take 12s. Past this they get what's ready, and its
 *  matches join the list when they land, with suggestions loading beneath. */
const VOICE_RESULTS_LIMIT_MS = 4000;
/** Matches .voice-lift in globals.css. */
const VOICE_LIFT_MS = 520;
/** Stacked mic and X: a narrow column so the text keeps most of each line,
 *  with a tap area reaching 8px past it to stay 40px wide. */
const STACKED_ICON =
  "group-data-[stacked]/box:w-8 group-data-[stacked]/box:after:absolute group-data-[stacked]/box:after:inset-y-0 group-data-[stacked]/box:after:right-0 group-data-[stacked]/box:after:-left-2";
/** Two 40px tap targets, stacked, without the mic's and X's overlapping. */
const STACKED_BOX_MIN_PX = 82;
/** How many of the most-backed asks to offer under the empty box. */
const OPTION_ASKS = 1;
/** How many topics to offer under the empty box. */
const OPTION_TOPICS = 8;
/** Desktop list scrolled this far: the intro steps aside. */
const INTRO_HIDE_AFTER_PX = 24;
/** Hiding the intro makes the list taller; with less overflow than this, that
 *  would undo the scroll and bring the intro straight back. */
const INTRO_HIDE_MIN_OVERFLOW_PX = 200;

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
  const introRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLTextAreaElement>(null);
  const [controlsH, setControlsH] = useState(0);
  const [listScrolled, setListScrolled] = useState(false);
  const [boxFocused, setBoxFocused] = useState(false);
  // "Clear suggestions" — the empty box stops offering them for this visit.
  const [optionsCleared, setOptionsCleared] = useState(false);
  useEffect(() => {
    const intro = introRef.current;
    const controls = controlsRef.current;
    if (!intro || !controls) return;
    const ro = new ResizeObserver(() => setControlsH(intro.offsetHeight + controls.offsetHeight));
    ro.observe(intro);
    ro.observe(controls);
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

  const [voiceMode, setVoiceMode] = useState<"speaking" | "searching" | "leaving" | null>(null);
  // Results reached by voice land card by card; typing shouldn't animate.
  const [voiceArrival, setVoiceArrival] = useState(false);
  const voice = useVoiceInput((text) => {
    setQuery(text);
    setJustAdded(null);
    setVoiceMode("searching");
  });

  // The box grows with what's in it, so a spoken sentence can be read and
  // edited in full. CSS caps it at four lines, past which it scrolls. As
  // soon as the text no longer fits beside both icons, the X moves under the
  // mic and hands its column to the text. That's always measured with the
  // icons side by side, or the extra room could flip the X back and forth.
  useLayoutEffect(() => {
    const el = searchRef.current;
    const box = boxRef.current;
    if (!el || !box) return;
    el.style.height = "auto";
    const oneLine = el.offsetHeight;
    const frame = el.offsetHeight - el.clientHeight;
    el.style.paddingRight = "";
    const stacked = voice.supported && !!query && el.scrollHeight + frame > oneLine;
    box.toggleAttribute("data-stacked", stacked);
    if (stacked) el.style.paddingRight = "2rem";
    // Empty stays one line.
    if (query) {
      el.style.height = `${Math.max(el.scrollHeight + frame, stacked ? STACKED_BOX_MIN_PX : 0)}px`;
    }
  }, [query, voice.supported]);

  // Query first (lib/match.ts: keyword + meaning, best first), then
  // filters + sort on what's left — so the panel's counts follow what's
  // typed. Topics live in the filter panel now, hence no tags here.
  const trimmedQuery = query.trim();
  const semantic = useSemanticMatches(trimmedQuery);

  // Voice mode lifts once the results are ready, so they're there to land on.
  useEffect(() => {
    if (voiceMode !== "searching") return;
    const timer = setTimeout(
      () => {
        setVoiceMode("leaving");
        setVoiceArrival(true);
      },
      semantic.settled ? VOICE_RESULTS_BEAT_MS : VOICE_RESULTS_LIMIT_MS,
    );
    return () => clearTimeout(timer);
  }, [voiceMode, semantic.settled]);

  useEffect(() => {
    if (voiceMode !== "leaving") return;
    const timer = setTimeout(() => setVoiceMode(null), VOICE_LIFT_MS);
    return () => clearTimeout(timer);
  }, [voiceMode]);

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

  const { optionsFor } = filterState;
  const optionTopics = useMemo(
    () =>
      [...optionsFor("topics")]
        .sort((a, b) => b.count - a.count)
        .slice(0, OPTION_TOPICS)
        .map((o) => o.value),
    [optionsFor],
  );
  const suggestions = useMemo(
    () =>
      query.trim()
        ? searchSuggestions(asks, query)
        : asks.slice(0, OPTION_ASKS).map((ask) => ask.askText),
    [asks, query],
  );
  const showOptions = boxFocused && (query ? suggestions.length > 0 : !optionsCleared);

  // iOS keeps a field focused when you tap somewhere that isn't one, so
  // tapping away has to close the options itself.
  useEffect(() => {
    if (!showOptions) return;
    function handleOutside(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) searchRef.current?.blur();
    }
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [showOptions]);

  function pickOption(text: string) {
    setQuery(text);
    setBoxFocused(false);
    setVoiceArrival(false);
    setJustAdded(null);
    // Back to the results, as with the keyboard's Search key.
    searchRef.current?.blur();
  }

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
      {/* Outside the pinned block, so on a phone it scrolls away and only the
          box stays. People didn't see that this box also creates asks, so it
          says so. Desktop's page doesn't scroll: the list hides it instead. */}
      <div ref={introRef} className={cn("flex flex-col gap-0.5 lg:pb-2", listScrolled && "lg:hidden")}>
        <h1 className="font-display text-[22px] font-black text-headline tracking-[-0.02em]">
          What do you want?
        </h1>
        <p className="text-[13px] leading-snug text-text-secondary">
          Type a topic or your idea. We&rsquo;ll show asks like it, or help you add a new one
          with a clear target.
        </p>
      </div>

      {/* Pinned under the header while the list scrolls. On phones it bleeds
          to the screen edges (negative margin = main's gutter) so cards
          don't show through beside it. */}
      <div
        ref={controlsRef}
        className="sticky top-14 lg:static z-30 bg-paper flex flex-col gap-2.5 sm:gap-3 pt-2 lg:pt-0 pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
          <div
            ref={boxRef}
            className="relative group/box"
            onFocus={() => setBoxFocused(true)}
            onBlur={(e) => {
              if (e.currentTarget.contains(e.relatedTarget)) return;
              setBoxFocused(false);
            }}
          >
            <textarea
              ref={searchRef}
              rows={1}
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search asks by topic or idea, or add a new one"
              value={query}
              onChange={(e) => {
                // One search, however it was pasted in.
                setQuery(e.target.value.replace(/\s*\n\s*/g, " "));
                setVoiceArrival(false);
                // The "Added …" notice belongs to the moment of adding; the
                // next thing typed is a new search.
                setJustAdded(null);
              }}
              // Results already update as you type, so the keyboard's
              // Search key just puts the keyboard away to show them.
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== "Escape") return;
                e.preventDefault();
                e.currentTarget.blur();
              }}
              // Phones: lift the box so its options open above the keyboard.
              onFocus={revealOnFocus("start")}
              className={cn(
                "scroll-mt-16 block w-full bg-card text-text resize-none",
                "border border-border rounded-sm pl-4 py-3 text-[15px] leading-6 max-h-[7.75rem] overflow-y-auto",
                voice.supported ? "pr-[5.5rem]" : "pr-11",
                "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
              )}
            />
            {!query && (
              <div className="absolute left-[17px] right-14 top-[13px] pointer-events-none">
                <SearchPlaceholder />
              </div>
            )}
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setVoiceArrival(false);
                  searchRef.current?.focus();
                }}
                className={cn(
                  // The first line's height: in a taller box these stay by the top line.
                  "absolute top-0 h-[50px] w-11 flex items-center justify-center text-text-muted hover:text-text active:text-text cursor-pointer",
                  voice.supported ? "right-11" : "right-0",
                  "group-data-[stacked]/box:right-0 group-data-[stacked]/box:top-[41px] group-data-[stacked]/box:h-10",
                  STACKED_ICON,
                )}
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {voice.supported && (
              <VoiceButton
                onClick={() => {
                  setBoxFocused(false);
                  setVoiceArrival(false);
                  setVoiceMode("speaking");
                  voice.start();
                }}
                className={cn(
                  "absolute right-0 top-0 h-[50px] group-data-[stacked]/box:top-px group-data-[stacked]/box:h-10",
                  STACKED_ICON,
                )}
              />
            )}
            {showOptions && (
              <SearchOptions
                suggestions={suggestions}
                suggestionsHeading={query ? undefined : "Try searching"}
                topics={query ? [] : optionTopics}
                onPick={pickOption}
                onClear={query ? undefined : () => setOptionsCleared(true)}
                className="absolute inset-x-0 top-full mt-1 z-10 max-h-[min(24rem,calc(var(--vv-height,100dvh)-8rem))]"
              />
            )}
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
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop === 0) setListScrolled(false);
            else if (
              el.scrollTop > INTRO_HIDE_AFTER_PX &&
              el.scrollHeight - el.clientHeight > INTRO_HIDE_MIN_OVERFLOW_PX
            ) {
              setListScrolled(true);
            }
          }}
          // Starting to scroll the results means you're done typing: put the
          // keyboard away so the list gets the whole screen (as native apps do).
          onTouchMove={() => {
            if (document.activeElement === searchRef.current) searchRef.current?.blur();
          }}
        >
          {allSubmitted && <VotesSubmittedNotice />}

          {(filteredAsks.length > 0 || (queryReady && !semantic.settled)) && (
            <div className={cn("flex flex-col gap-3", voiceArrival && "voice-arrive")}>
            {queryReady && (
              <h2 className="text-[13px] uppercase tracking-[0.08em] text-text-muted">
                Already asked
              </h2>
            )}
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
            {queryReady && !semantic.settled && (
              <p className="text-center text-xs text-text-muted">
                Looking for asks that mean the same thing…
              </p>
            )}
            </div>
          )}

          {justAdded && (
            <div className="text-center py-4 text-sm text-text-secondary bg-card border border-border rounded-card">
              Added &ldquo;{justAdded}&rdquo; — it&rsquo;s live now, and your vote is counted.
            </div>
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
            <div className={cn(voiceArrival && "voice-arrive-after")}>
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
            </div>
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
              Type a topic or your idea above.
            </div>
          )}
        </div>

        <div className="hidden lg:block min-w-0">
          <FilterSidebar state={filterState} />
        </div>
      </div>

      {voiceMode && (
        <VoiceMode
          transcript={voice.transcript}
          searching={voiceMode !== "speaking"}
          leaving={voiceMode === "leaving"}
          error={voice.error}
          onSend={voice.stop}
          onRetry={voice.start}
          onClose={() => {
            voice.cancel();
            setVoiceMode(null);
          }}
        />
      )}

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
