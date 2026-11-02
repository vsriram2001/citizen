import { NextResponse } from "next/server";
import { ballotKey, parseBallotId } from "@/lib/ledger";
import { toLedgerBlock } from "@/lib/ledger-read";
import { getApprovedSubmissionsByIds } from "@/lib/submissions";
import { createAdminClient } from "@/lib/supabase/admin";

const NOT_FOUND = { error: "No ballot has this ID" };

// Opens a ballot for anyone holding its ID. POST so a lookup doesn't leave the
// ID in browser history. Read-only; holding an ID never lets anyone change a
// vote. No rate limit needed, since 95 random bits can't be guessed.
export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  const ballotId = typeof id === "string" ? parseBallotId(id) : null;
  if (!ballotId) {
    return NextResponse.json({ error: "That isn't a valid Ballot ID" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("vote_ledger")
    .select("*")
    .eq("ballot_key", await ballotKey(ballotId))
    .order("height");
  if (error) {
    console.error("ballot lookup failed:", error.message);
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }
  if (!rows || rows.length === 0) return NextResponse.json(NOT_FOUND, { status: 404 });

  const { data: votes } = await supabase
    .from("votes")
    .select("submission_id")
    .in("block_height", rows.map((r) => r.height));

  const askIds = (votes ?? []).map((v) => v.submission_id as string);
  const asks = await getApprovedSubmissionsByIds(askIds);
  const askById = new Map(asks.map((ask) => [ask.id, ask]));

  return NextResponse.json({
    ballotId,
    blocks: rows.map(toLedgerBlock),
    votes: askIds.map((askId) => ({
      askId,
      askText: askById.get(askId)?.askText ?? null,
      timeframe: askById.get(askId)?.timeframe ?? null,
    })),
  });
}
