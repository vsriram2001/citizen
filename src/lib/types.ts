import type { PartyStatus, VerificationStatus } from "@/lib/status";

/*
  Shared domain types. Server code (API routes, lib/), client components
  and scripts all import from here, so no backend file has to reach into a
  UI component for its types.
*/

export interface PartyResponse {
  party: string;
  status: PartyStatus;
  sourceUrl?: string;
}

/** A named officeholder accountable for an ask. Real names — verify against
 *  current officeholders before relying on this in production; these
 *  reshuffle. */
export interface ResponsiblePerson {
  name: string;
  designation: string;
  organization?: string;
  twitterHandle?: string;
}

export interface Ask {
  id: string;
  askText: string;
  currentValue: string;
  targetValue: string;
  timeframe: string;
  targetBody: string;
  /** Who currently holds the office(s) accountable for targetBody — plural
   *  because multi-body targets name several people at once (max 3). */
  responsiblePeople?: ResponsiblePerson[];
  mechanism?: string;
  tags?: string[];
  /** Somewhere that has already done this (lib/precedent.ts); absent when none was found. */
  precedent?: Precedent;
  verificationStatus: VerificationStatus;
  voteCount: number;
  partyResponses: PartyResponse[];
}

/** The "Info" section of an ask — an AI-drafted, unverified brief. Loaded on
 *  demand (/api/brief), never part of the list payload. */
export interface AskBrief {
  /** Two or three plain sentences: what is being asked and why it matters. */
  overview: string;
  /** The ask as a short open letter to the accountable body, 2-4 paragraphs. */
  plea: string;
  /** The strongest arguments for the ask, each self-contained. */
  reasoning: string[];
  /** Costs, trade-offs and honest counter-arguments. May be empty only when
   *  the ask genuinely has none worth naming. */
  downsides: string[];
  sources: { title: string; url: string }[];
  /** ISO timestamp of the last (re)generation. */
  updatedAt: string;
}

/** An AI-drafted ask from /api/suggest — not yet on the platform. */
export interface AskSuggestion {
  askText: string;
  currentValue: string;
  targetValue: string;
  timeframe: string;
  targetBody: string;
  responsiblePeople: ResponsiblePerson[] | null;
  tags: string[];
  sourceUrl: string | null;
  /** Somewhere that has already done this, from a web search (lib/precedent.ts).
   *  Absent when none was found — never filled in from memory. */
  precedent?: Precedent | null;
}

/** Proof an ask is achievable: a place that has already done it, with the
 *  measured result and the page that says so. Only ever shown with its source. */
export interface Precedent {
  /** City, state or country, e.g. "Indore, Madhya Pradesh" or "Seoul, South Korea". */
  place: string;
  /** What they did and the measured result, with years — 25 words at most. */
  summary: string;
  sourceUrl: string;
}
