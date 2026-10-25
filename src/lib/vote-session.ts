/*
  Local mirror of the signed-in person's votes: a map of
  askId -> real votes.id, so an un-vote knows exactly which row to delete
  server-side. "Who is voting" is their Google account (see lib/voter.ts);
  this record is rebuilt from GET /api/votes on every sign-in, so the server
  is the source of truth and this is only a cache. Every vote (new-ask
  founding votes and votes on existing asks alike) goes through the API —
  see src/app/api/votes/route.ts.

  VOTE_BUDGET is enforced both here (for instant UI feedback) and
  server-side in the API route (the actual guarantee).
*/

export const VOTE_BUDGET = 3;

const SESSION_KEY = "citizen:session-id";
const VOTES_KEY = "citizen:votes"; // { [askId]: voteRowId }

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function setSessionId(id: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, id);
  } catch {
    // Storage unavailable — session just won't persist across reloads.
  }
}

function readVotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeVotes(votes: Record<string, string>) {
  try {
    window.localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  } catch {
    // Storage unavailable — vote record just won't persist.
  }
}

/** Replaces the local record wholesale — used to mirror the signed-in person's server votes. */
export function replaceVotes(votes: Record<string, string>) {
  writeVotes(votes);
}

// What the person was doing when we sent them to Google, so it can be
// finished on return: a vote tap, or the idea they'd typed to add as an ask.
// sessionStorage — it only needs to survive the redirect, not the tab.
const RESUME_KEY = "citizen:resume";
export type Resume = { askId?: string; query?: string };

export function saveResume(resume: Resume) {
  try {
    window.sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume));
  } catch {
    // Storage unavailable — they just re-tap after signing in.
  }
}

export function takeResume(): Resume | null {
  try {
    const raw = window.sessionStorage.getItem(RESUME_KEY);
    window.sessionStorage.removeItem(RESUME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getVotedAskIds(): string[] {
  return Object.keys(readVotes());
}

export function getVoteRowId(askId: string): string | undefined {
  return readVotes()[askId];
}

export function recordVote(askId: string, voteRowId: string) {
  const votes = readVotes();
  votes[askId] = voteRowId;
  writeVotes(votes);
}

export function forgetVote(askId: string) {
  const votes = readVotes();
  delete votes[askId];
  writeVotes(votes);
}
