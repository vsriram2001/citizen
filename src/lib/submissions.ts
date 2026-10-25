import { SEED_ASKS } from "@/lib/mock/asks";
import { createClient } from "@/lib/supabase/server";
import type { Ask } from "@/lib/types";

interface SubmissionRow {
  id: string;
  ask_text: string;
  current_value: string | null;
  target_value: string | null;
  timeframe: string | null;
  target_body: string | null;
  mechanism: string | null;
  tags: string[] | null;
  verification_status: Ask["verificationStatus"];
  vote_count: number;
  party_responses: {
    party_name: string;
    status: Ask["partyResponses"][number]["status"];
    source_url: string | null;
  }[];
  responsible_people: {
    name: string;
    designation: string;
    organization: string | null;
    twitter_handle: string | null;
  }[];
}

/**
 * Approved submissions, ranked by vote_count — the "Popular" list.
 * Public read (RLS already restricts this to moderation_status =
 * 'approved'), so the anon client is enough; no service role needed here.
 */
export async function getApprovedSubmissions(): Promise<Ask[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
      id,
      ask_text,
      current_value,
      target_value,
      timeframe,
      target_body,
      mechanism,
      tags,
      verification_status,
      vote_count,
      party_responses ( party_name, status, source_url ),
      responsible_people ( name, designation, organization, twitter_handle )
    `,
    )
    .eq("moderation_status", "approved")
    .order("vote_count", { ascending: false })
    .order("created_at", { referencedTable: "responsible_people" })
    .returns<SubmissionRow[]>();

  if (error) {
    console.error("getApprovedSubmissions failed:", error.message);
    return [];
  }

  return (data ?? []).map(mapSubmissionRow);
}

/**
 * What /search shows: approved submissions, or — when Supabase returns
 * nothing (empty table or unreachable) — the seed asks in demo mode. The
 * matching and duplicate-check routes use this too, so they always judge
 * against the same list the person is looking at.
 */
export async function getSearchableAsks(): Promise<{ asks: Ask[]; demo: boolean }> {
  const live = await getApprovedSubmissions();
  const demo = live.length === 0;
  return { asks: demo ? SEED_ASKS : live, demo };
}

/** Real total of votes cast — sum of vote_count over the asks people can see. */
export async function getTotalVotesCast(): Promise<number> {
  const { asks } = await getSearchableAsks();
  return asks.reduce((sum, ask) => sum + ask.voteCount, 0);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A single approved submission by id — used by /share/[askId] and its OG
 * image. Same RLS-backed public read as the list query, just filtered down.
 */
export async function getApprovedSubmission(id: string): Promise<Ask | null> {
  // A mistyped share link is a 404, not a Postgres "invalid uuid" error in the logs.
  if (!UUID.test(id)) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
      id,
      ask_text,
      current_value,
      target_value,
      timeframe,
      target_body,
      mechanism,
      tags,
      verification_status,
      vote_count,
      party_responses ( party_name, status, source_url ),
      responsible_people ( name, designation, organization, twitter_handle )
    `,
    )
    .eq("moderation_status", "approved")
    .eq("id", id)
    .order("created_at", { referencedTable: "responsible_people" })
    .maybeSingle<SubmissionRow>();

  if (error) {
    console.error("getApprovedSubmission failed:", error.message);
    return null;
  }

  return data ? mapSubmissionRow(data) : null;
}

/**
 * A specific set of approved submissions, in the given id order — used by
 * the "my votes" share card, which renders exactly the asks a browser's
 * local vote record (lib/vote-session.ts) says it voted on.
 */
export async function getApprovedSubmissionsByIds(ids: string[]): Promise<Ask[]> {
  if (ids.length === 0) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("submissions")
    .select(
      `
      id,
      ask_text,
      current_value,
      target_value,
      timeframe,
      target_body,
      mechanism,
      tags,
      verification_status,
      vote_count,
      party_responses ( party_name, status, source_url ),
      responsible_people ( name, designation, organization, twitter_handle )
    `,
    )
    .eq("moderation_status", "approved")
    .in("id", ids)
    .order("created_at", { referencedTable: "responsible_people" })
    .returns<SubmissionRow[]>();

  if (error) {
    console.error("getApprovedSubmissionsByIds failed:", error.message);
    return [];
  }

  const asks = (data ?? []).map(mapSubmissionRow);
  const byId = new Map(asks.map((ask) => [ask.id, ask]));
  return ids.map((id) => byId.get(id)).filter((ask): ask is Ask => ask !== undefined);
}

function mapSubmissionRow(row: SubmissionRow): Ask {
  return {
    id: row.id,
    askText: row.ask_text,
    currentValue: row.current_value ?? "",
    targetValue: row.target_value ?? "",
    timeframe: row.timeframe ?? "",
    targetBody: row.target_body ?? "",
    mechanism: row.mechanism ?? undefined,
    tags: row.tags ?? [],
    verificationStatus: row.verification_status,
    voteCount: row.vote_count,
    partyResponses: row.party_responses.map((pr) => ({
      party: pr.party_name,
      status: pr.status,
      sourceUrl: pr.source_url ?? undefined,
    })),
    responsiblePeople:
      row.responsible_people.length > 0
        ? row.responsible_people.map((p) => ({
            name: p.name,
            designation: p.designation,
            organization: p.organization ?? undefined,
            twitterHandle: p.twitter_handle ?? undefined,
          }))
        : undefined,
  };
}
