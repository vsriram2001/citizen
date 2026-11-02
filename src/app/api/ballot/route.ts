import { NextResponse } from "next/server";
import { issueBallots } from "@/lib/ballot";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVoterId } from "@/lib/voter";

// The caller's own Ballot IDs. A POST because it seals any finished votes that
// aren't on the ledger yet. Who they are comes from the cookie, as in api/votes.
export async function POST() {
  const voterId = await getVoterId();
  if (!voterId) return NextResponse.json({ ballots: [] });
  return NextResponse.json({ ballots: await issueBallots(createAdminClient(), voterId) });
}
