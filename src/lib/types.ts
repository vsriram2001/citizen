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
}
