import type { LedgerBlock } from "@/lib/ledger";

export const LEDGER_PAGE_SIZE = 500;

type LedgerRow = {
  height: number;
  prev_hash: string;
  hash: string;
  ballot_key: string;
  leaves: string[];
  sealed_at: string;
};

/** A vote_ledger row as hashed: Postgres rewrites timestamps, so sealedAt goes back to its sealed form. */
export function toLedgerBlock(row: LedgerRow): LedgerBlock {
  return {
    height: Number(row.height),
    prevHash: row.prev_hash,
    hash: row.hash,
    ballotKey: row.ballot_key,
    leaves: row.leaves,
    sealedAt: new Date(row.sealed_at).toISOString(),
  };
}
