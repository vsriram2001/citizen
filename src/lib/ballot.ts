import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALPHABET,
  DATA_CHARS,
  GENESIS_HASH,
  ballotKey,
  blockHash,
  formatBallotId,
  voteLeaf,
  type LedgerBlock,
} from "@/lib/ledger";

/*
  Ballot IDs and sealing finished votes onto the ledger (lib/ledger.ts has the
  hash rules). Server-only: this is the one place that touches BALLOT_ID_SECRET.

  An ID is HMAC-SHA256(secret, voter + year), so a person has exactly one per
  year, it never needs storing, and nobody without the secret can get from an
  ID back to a voter or from a voter to an ID.

  Sealing runs after a ballot is finished, never inside the vote itself: a
  ledger outage must not be able to cost anyone a vote. Votes that missed it
  (or were finished before the ledger existed) are picked up on the next visit
  to "My votes".
*/

export type Ballot = { id: string; year: number; votes: number };

const SEAL_ATTEMPTS = 5;

export function deriveBallotId(secret: string, voterId: string, year: number): string {
  const mac = createHmac("sha256", secret).update(`${voterId}|${year}`).digest();
  // 19 base32 characters = 95 bits, far beyond guessing one by brute force.
  let bits = BigInt(`0x${mac.subarray(0, 12).toString("hex")}`);
  let data = "";
  for (let i = 0; i < DATA_CHARS; i++) {
    data += ALPHABET[Number(bits & BigInt(31))];
    bits >>= BigInt(5);
  }
  return formatBallotId(year, data);
}

/** Adds one block, retrying when another ballot takes the next height first. */
async function sealVotes(
  admin: SupabaseClient,
  id: string,
  votes: { id: string; submission_id: string }[],
) {
  const [key, leaves] = await Promise.all([
    ballotKey(id),
    Promise.all(votes.map((v) => voteLeaf(id, v.submission_id))),
  ]);

  for (let attempt = 0; attempt < SEAL_ATTEMPTS; attempt++) {
    const { data: head, error: headError } = await admin
      .from("vote_ledger")
      .select("height, hash")
      .order("height", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (headError) throw new Error(headError.message);

    const block: Omit<LedgerBlock, "hash"> = {
      height: (head?.height ?? 0) + 1,
      prevHash: head?.hash ?? GENESIS_HASH,
      ballotKey: key,
      leaves: [...leaves].sort(),
      sealedAt: new Date().toISOString(),
    };
    const { error } = await admin.rpc("append_ballot_block", {
      p_height: block.height,
      p_prev_hash: block.prevHash,
      p_hash: await blockHash(block),
      p_ballot_key: block.ballotKey,
      p_leaves: block.leaves,
      p_sealed_at: block.sealedAt,
      p_vote_ids: votes.map((v) => v.id),
    });
    if (!error) return;
    // A second tab sealed these first; nothing left to do.
    if (error.message.includes("votes_already_sealed")) return;
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("ledger busy");
}

/**
 * This person's Ballot IDs, newest first, sealing any finished votes that
 * aren't on the ledger yet. Empty when the feature isn't set up — no secret, or
 * the migration not applied — so "My votes" just carries on without it.
 */
export async function issueBallots(admin: SupabaseClient, voterId: string): Promise<Ballot[]> {
  const secret = process.env.BALLOT_ID_SECRET;
  if (!secret) return [];

  const { data, error } = await admin
    .from("votes")
    .select("id, submission_id, submitted_at, block_height")
    .eq("session_token", voterId)
    .not("submitted_at", "is", null);
  if (error) {
    console.error("ballot votes read failed:", error.message);
    return [];
  }

  const byYear = new Map<number, typeof data>();
  for (const vote of data) {
    const year = new Date(vote.submitted_at).getUTCFullYear();
    byYear.set(year, [...(byYear.get(year) ?? []), vote]);
  }

  const ballots: Ballot[] = [];
  for (const [year, votes] of byYear) {
    const id = deriveBallotId(secret, voterId, year);
    const pending = votes.filter((v) => v.block_height == null);
    try {
      if (pending.length > 0) await sealVotes(admin, id, pending);
    } catch (err) {
      console.error("ballot seal failed:", err);
      if (pending.length === votes.length) continue; // Nothing on the ledger to look up yet.
    }
    ballots.push({ id, year, votes: votes.length });
  }
  return ballots.sort((a, b) => b.year - a.year);
}
