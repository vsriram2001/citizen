import type { Ballot } from "@/lib/ballot";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Gets the "My votes" share page ready while the ballot animation plays, so
 * the card, its Ballot ID and its share buttons are all there the moment the
 * page opens, instead of arriving one after another.
 *
 * Without this, each waited on the last: the page opened, then sealed the
 * ballot (the ID), and the new ID changed the card image's URL, so the image
 * (a cold serverless render) only started after that. The animation is ~10s;
 * all of it fits behind it.
 *
 * State lives in this module, which survives the client-side navigation from
 * /search to /share/votes. A full page load starts empty and falls back to
 * fetching as before.
 */

/** The card image for these asks, in this order, with this Ballot ID. */
export function votesImageUrl(ids: string[], ballotId?: string): string {
  const ballot = ballotId ? `&ballot=${encodeURIComponent(ballotId)}` : "";
  return `${getSiteUrl()}/share/votes/image?ids=${encodeURIComponent(ids.join(","))}${ballot}`;
}

// ─── Ballot IDs ────────────────────────────────────────────────────────────

const BALLOT_REUSE_MS = 60_000;
let ballotsRequest: { at: number; promise: Promise<Ballot[]> } | null = null;
let loadedBallots: Ballot[] | null = null;

/**
 * The caller's Ballot IDs. The route also seals finished votes onto the
 * ledger, so there is only ever one request in flight: the share page reuses
 * the one the vote screen started rather than sealing the same votes twice
 * at once.
 */
export function loadBallots({ fresh = false } = {}): Promise<Ballot[]> {
  if (!fresh && ballotsRequest && Date.now() - ballotsRequest.at < BALLOT_REUSE_MS) {
    return ballotsRequest.promise;
  }
  const promise = fetch("/api/ballot", { method: "POST" })
    .then((res) => res.json())
    .then((data: { ballots?: Ballot[] }) => {
      loadedBallots = data.ballots ?? [];
      return loadedBallots;
    })
    // The ID is an extra; the page works without it.
    .catch(() => [] as Ballot[]);
  ballotsRequest = { at: Date.now(), promise };
  return promise;
}

/** Ballot IDs already loaded, for a first render that doesn't wait. */
export function getLoadedBallots(): Ballot[] | null {
  return loadedBallots;
}

// ─── The card image ────────────────────────────────────────────────────────

const images = new Map<string, Promise<Blob>>();
const loadedImages = new Map<string, Blob>();

/** The card image, fetched once per URL and shared by every button. */
export function loadCardImage(url: string): Promise<Blob> {
  let promise = images.get(url);
  if (!promise) {
    promise = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Card image: ${r.status}`);
      return r.blob();
    });
    promise.then(
      (blob) => loadedImages.set(url, blob),
      () => images.delete(url), // a failed render can be retried
    );
    images.set(url, promise);
  }
  return promise;
}

/** The card image if it has already arrived. */
export function getLoadedCardImage(url: string): Blob | undefined {
  return loadedImages.get(url);
}

// ─── Starting it all ───────────────────────────────────────────────────────

let votedOrder: string[] | null = null;

/**
 * Call once the votes are submitted, with the asks in the order the ballot
 * animation lists them. Seals the ballot and renders the card image now.
 */
export function prepareVotesShare(askIds: string[]) {
  votedOrder = askIds;
  loadBallots({ fresh: true }).then((ballots) => {
    loadCardImage(votesImageUrl(askIds, ballots.at(0)?.id)).catch(() => {});
  });
}

/**
 * Puts the asks in the order the animation showed them, when they're the same
 * asks, so the page matches what was just seen and the image prepared for
 * that order is the one the page asks for.
 */
export function inVotedOrder<T extends { id: string }>(asks: T[]): T[] {
  if (!votedOrder || votedOrder.length !== asks.length) return asks;
  const rank = new Map(votedOrder.map((id, i) => [id, i]));
  if (!asks.every((a) => rank.has(a.id))) return asks;
  return [...asks].sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
}
