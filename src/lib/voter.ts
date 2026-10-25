import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { VOTE_BUDGET } from "@/lib/vote-session";

/*
  Who is voting, server-side. A person is their Google account (Supabase
  auth user) — the cap is per person, so clearing the browser or switching
  device no longer hands out fresh votes.

  The votes table still keys on session_token, so each signed-in person gets
  a `sessions` row whose id *is* their auth user id. That needs no schema
  change; a dedicated votes.user_id can replace it later.
*/

/** The signed-in person's id, read from the auth cookie — never from the request body. */
export async function getVoterId(): Promise<string | null> {
  const supabase = await createClient();
  // getClaims checks the JWT signature against the project's signing keys
  // locally — as trustworthy as getUser, without a round trip to the Auth
  // server on every vote.
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

export async function ensureVoterSession(admin: SupabaseClient, voterId: string) {
  const { error } = await admin
    .from("sessions")
    .upsert({ id: voterId }, { onConflict: "id", ignoreDuplicates: true });
  if (error) console.error("voter session upsert failed:", error.message);
}

/** Votes this person has spent in the last 365 days. */
export async function votesUsed(admin: SupabaseClient, voterId: string): Promise<number> {
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("session_token", voterId)
    .gte("created_at", since);
  return count ?? 0;
}

export const OUT_OF_VOTES = `You've used all ${VOTE_BUDGET} of your votes`;
export const VOTE_LOCKED = "This vote was submitted and can no longer be changed";
