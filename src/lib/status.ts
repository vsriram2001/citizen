/*
  The product's status vocabulary, in one place.

  Two independent axes, deliberately not merged:

  - PartyStatus — where a named party stands on an ask. "no_response" is a
    real, displayable state, never a silent default. That's a core promise of
    the product: an unanswered ask must look unanswered, not neutral.
  - VerificationStatus — whether *we* have independently checked the numbers
    in a submission. Everything starts 'unverified' and says so visibly.

  A submission can be verified while every party ignores it, or unverified
  with universal support. Keeping the axes separate keeps that honest.
*/

export type PartyStatus = "support" | "against" | "no_response" | "defected";

export type VerificationStatus = "unverified" | "verified" | "disputed";

export const PARTY_STATUS_LABEL: Record<PartyStatus, string> = {
  support: "Support",
  against: "Against",
  no_response: "No response",
  defected: "Defected",
};

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  unverified: "Unverified",
  verified: "Verified",
  disputed: "Disputed",
};
