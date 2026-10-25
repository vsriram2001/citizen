"use client";

import { useEffect, useState } from "react";
import type { Auth } from "@/components/auth/useAuth";
import type { Ask } from "@/lib/types";
import {
  VOTE_BUDGET,
  getVoteRowId,
  recordVote,
  forgetVote,
  replaceVotes,
  takeResume,
} from "@/lib/vote-session";

type SetAsks = React.Dispatch<React.SetStateAction<Ask[]>>;

function bump(setAsks: SetAsks, id: string, delta: number) {
  setAsks((prev) =>
    prev.map((a) =>
      a.id === id ? { ...a, voteCount: Math.max(a.voteCount + delta, 0) } : a,
    ),
  );
}

/**
 * The person's 3-a-year vote budget on the search screen: which asks they
 * have voted for, plus cast / retract.
 *
 * Casting and retracting are real writes (POST/DELETE /api/votes) — every
 * ask's vote_count in Supabase reflects actual votes, via the increment /
 * decrement triggers on the votes table. Votes belong to the signed-in
 * Google account: a signed-out tap opens the sign-in prompt and is finished
 * automatically when the person comes back. At 3/3 a further Vote tap doesn't
 * fail silently: it opens the replace card (`replaceFor`), where an unsubmitted
 * vote can be swapped for the new ask. Finishing the ballot (`submitVotes`)
 * locks every vote cast so far — those can't be retracted or replaced. In `demo` mode (seed data, no
 * Supabase) both stay in memory only and nothing is persisted anywhere.
 */
export function useVotes({
  demo,
  setAsks,
  auth,
  onResumeQuery,
  gate,
}: {
  demo: boolean;
  setAsks: SetAsks;
  auth: Auth;
  /** The idea the person had typed when they were sent off to sign in. */
  onResumeQuery?: (query: string) => void;
  /** Return true to stop the vote (e.g. the person was sent to onboarding first). */
  gate?: (resume: { askId: string }) => boolean;
}) {
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  // Votes locked by "Finish & share" — can't be retracted or replaced.
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  // The ask the person tried to vote for while out of votes (opens the replace card).
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  // Why the last vote action didn't go through — shown briefly, never silent.
  const [voteError, setVoteError] = useState<string | null>(null);
  // Bumped to re-read the server's votes when this browser turns out to be stale.
  const [syncKey, setSyncKey] = useState(0);
  const [voteInFlight, setVoteInFlight] = useState<string | null>(null); // askId being cast/retracted

  const { ready, userId, prompt } = auth;

  useEffect(() => {
    if (!voteError) return;
    const t = setTimeout(() => setVoteError(null), 6000);
    return () => clearTimeout(t);
  }, [voteError]);

  // Starts empty on both server and first client render, then mirrors the
  // server's record of this person's votes once we know who they are (so a
  // second device or a cleared browser shows the same ballot). A vote tap
  // that sent them to Google is finished here, once their votes are loaded.
  useEffect(() => {
    if (demo || !ready) return;
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- signed out: nothing is voted
      setVotedIds(new Set());
      setSubmittedIds(new Set());
      // Back from onboarding with a vote tap pending: carry on to sign-in.
      const resume = takeResume();
      if (resume) prompt(resume);
      return;
    }
    let cancelled = false;
    (async () => {
      let voted: Record<string, string> = {};
      const submitted = new Set<string>();
      try {
        const res = await fetch("/api/votes");
        const data = await res.json();
        for (const v of data.votes ?? []) {
          voted[v.submissionId] = v.voteId;
          if (v.submitted) submitted.add(v.submissionId);
        }
      } catch {
        voted = {};
      }
      if (cancelled) return;
      replaceVotes(voted);
      setVotedIds(new Set(Object.keys(voted)));
      setSubmittedIds(submitted);

      const resume = takeResume();
      if (resume?.query) onResumeQuery?.(resume.query);
      if (resume?.askId && !voted[resume.askId] && Object.keys(voted).length < VOTE_BUDGET) {
        await sendVote(resume.askId);
      }
    })();
    return () => {
      cancelled = true;
    };
    // sendVote/onResumeQuery are stable enough here; re-running on them would refetch every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, ready, userId, syncKey]);

  const budgetLeft = VOTE_BUDGET - votedIds.size;

  function markVoted(id: string) {
    setVotedIds((prev) => new Set(prev).add(id));
  }

  function unmark(id: string) {
    setVotedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function sendVote(id: string): Promise<boolean> {
    setVoteInFlight(id);
    // Optimistic: the tap shows as voted at once, and is undone if the
    // server says no — waiting on the round trip made the button feel dead.
    markVoted(id);
    bump(setAsks, id, 1);
    const undo = () => {
      unmark(id);
      bump(setAsks, id, -1);
    };
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: id }),
      });
      if (res.status === 401) {
        // Session expired since the page loaded — ask them to sign in again.
        undo();
        prompt({ askId: id });
        return false;
      }
      if (res.status === 403) {
        // The server counts more votes than this browser knows about (another
        // device, another tab) — say so and catch up.
        undo();
        const data = await res.json().catch(() => ({}));
        setVoteError(data.error ?? "You've used all your votes.");
        setSyncKey((k) => k + 1);
        return false;
      }
      if (!res.ok) throw new Error("vote failed");
      const data = await res.json();
      recordVote(id, data.voteId);
      return true;
    } catch {
      // Back to unvoted — safe to retry.
      undo();
      setVoteError("Couldn't record your vote. Check your connection and try again.");
      return false;
    } finally {
      setVoteInFlight(null);
    }
  }

  async function castVote(id: string) {
    if (budgetLeft <= 0) {
      // Out of votes: offer the swap instead of a dead button.
      if (!votedIds.has(id)) setReplaceFor(id);
      return;
    }
    if (gate?.({ askId: id })) return;
    if (demo) {
      markVoted(id);
      bump(setAsks, id, 1);
      return;
    }
    if (!userId) {
      prompt({ askId: id });
      return;
    }
    await sendVote(id);
  }

  async function retractVote(id: string): Promise<boolean> {
    if (submittedIds.has(id)) return false; // final once submitted
    if (demo) {
      unmark(id);
      bump(setAsks, id, -1);
      return true;
    }
    const voteId = getVoteRowId(id);
    if (!voteId) return false;
    setVoteInFlight(id);
    // Optimistic, like sendVote: unvoted at once, restored if it fails.
    unmark(id);
    bump(setAsks, id, -1);
    try {
      const res = await fetch("/api/votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteId, submissionId: id }),
      });
      if (res.status === 403) {
        // Submitted on another device since this page loaded.
        markVoted(id);
        bump(setAsks, id, 1);
        const data = await res.json().catch(() => ({}));
        setVoteError(data.error ?? "This vote can no longer be changed.");
        setSyncKey((k) => k + 1);
        return false;
      }
      if (!res.ok) throw new Error("retract failed");
      const data = await res.json();
      forgetVote(id);
      if (data.deleted) {
        // Vote count hit 0 — the ask had no other support, so it's gone
        // server-side too; drop it from the visible list to match.
        setAsks((prev) => prev.filter((a) => a.id !== id));
      }
      return true;
    } catch {
      // Back to voted — safe to retry.
      markVoted(id);
      bump(setAsks, id, 1);
      setVoteError("Couldn't remove your vote. Check your connection and try again.");
      return false;
    } finally {
      setVoteInFlight(null);
    }
  }

  /** Swaps one of the person's unsubmitted votes for the ask they just tapped. */
  async function replaceVote(oldId: string) {
    const newId = replaceFor;
    if (!newId || submittedIds.has(oldId)) return;
    // Close the card straight away; both halves are optimistic, and a failed
    // retract restores the old vote, so the screen never shows a half-swap.
    setReplaceFor(null);
    if (!(await retractVote(oldId))) return;
    if (demo) {
      markVoted(newId);
      bump(setAsks, newId, 1);
      return;
    }
    // Straight to the API: castVote would still see the stale "no votes left".
    await sendVote(newId);
  }

  /** "Finish & share": locks every vote cast so far. Resolves false if it didn't stick. */
  async function submitVotes(): Promise<boolean> {
    if (!demo) {
      try {
        const res = await fetch("/api/votes", { method: "PUT" });
        if (!res.ok) throw new Error("submit failed");
      } catch {
        setVoteError("Couldn't submit your votes. Check your connection and try again.");
        return false;
      }
    }
    setSubmittedIds(new Set(votedIds));
    return true;
  }

  return {
    votedIds,
    submittedIds,
    voteInFlight,
    budgetLeft,
    replaceFor,
    voteError,
    dismissVoteError: () => setVoteError(null),
    closeReplace: () => setReplaceFor(null),
    castVote,
    retractVote,
    replaceVote,
    submitVotes,
    markVoted,
  };
}
