/*
  The public vote ledger's rules: what a Ballot ID looks like and how every
  hash is computed. Pure, and uses Web Crypto rather than node:crypto, because
  the same code runs in the voter's browser on /verify — a check that only ran
  on our server would prove nothing.

  Changing any string below breaks every block already sealed; a new format
  needs a new version tag, not an edit.

  What the ledger is, plainly: a hash chain. Each block includes the previous
  block's hash, so editing an old block changes every hash after it. It is
  tamper-evident, not decentralised — see docs/features/ballot-id.md.
*/

export type LedgerBlock = {
  height: number;
  prevHash: string;
  hash: string;
  /** Fingerprint of the Ballot ID. Finds a ballot's blocks; can't be turned back into the ID. */
  ballotKey: string;
  /** One commitment per vote. Unreadable without the ID, so the chain alone reveals no choices. */
  leaves: string[];
  sealedAt: string;
};

export const GENESIS_HASH = "0".repeat(64);

// Crockford base32: no I, L, O or U, so an ID survives being read aloud or retyped.
export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const DATA_CHARS = 19;

/** The ID's check character: a weighted sum, so a typo is caught before any lookup. */
function checkChar(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    sum += (i + 1) * ALPHABET.indexOf(body[i]);
  }
  return ALPHABET[sum % 31];
}

/** "CP26" + 19 random characters + a check character, grouped for reading. */
export function formatBallotId(year: number, data: string): string {
  const body = `CP${String(year % 100).padStart(2, "0")}${data}`;
  const full = body + checkChar(body);
  return `${full.slice(0, 4)}-${full.slice(4).match(/.{5}/g)!.join("-")}`;
}

/** Canonical form of whatever someone typed or pasted, or null if it isn't a valid ID. */
export function parseBallotId(input: string): string | null {
  const raw = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  const match = raw.match(new RegExp(`^CP(\\d{2})([${ALPHABET}]{${DATA_CHARS}})([${ALPHABET}])$`));
  if (!match) return null;
  const year = 2000 + Number(match[1]);
  const id = formatBallotId(year, match[2]);
  return id.endsWith(match[3]) ? id : null;
}

/** The year printed in an ID — the year its votes were finished. */
export function ballotYear(id: string): number {
  return 2000 + Number(id.slice(2, 4));
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function ballotKey(id: string): Promise<string> {
  return sha256(`citizen-poll:ballot:v1|${id}`);
}

export function voteLeaf(id: string, askId: string): Promise<string> {
  return sha256(`citizen-poll:leaf:v1|${id}|${askId}`);
}

export function blockHash(block: Omit<LedgerBlock, "hash">): Promise<string> {
  // Sorted, so a block doesn't reveal the order someone voted in.
  const leaves = [...block.leaves].sort().join(",");
  return sha256(
    `citizen-poll:block:v1|${block.height}|${block.prevHash}|${block.ballotKey}|${leaves}|${block.sealedAt}`,
  );
}

/** Height of the first block that doesn't fit the chain, or null if all of them do. */
export async function findBrokenBlock(blocks: LedgerBlock[]): Promise<number | null> {
  let prev = GENESIS_HASH;
  let height = 1;
  for (const block of blocks) {
    if (block.height !== height || block.prevHash !== prev) return block.height;
    if ((await blockHash(block)) !== block.hash) return block.height;
    prev = block.hash;
    height += 1;
  }
  return null;
}
