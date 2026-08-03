import { cn } from "@/lib/cn";
import {
  PARTY_STATUS_LABEL,
  VERIFICATION_STATUS_LABEL,
  type PartyStatus,
  type VerificationStatus,
} from "@/lib/status";

const PARTY_TONES: Record<PartyStatus, string> = {
  support: "bg-support-bg text-support-fg",
  against: "bg-against-bg text-against-fg",
  defected: "bg-defected-bg text-defected-fg",
  no_response: "bg-noresponse-bg text-noresponse-fg",
};

/*
  Unverified is given a visible outline rather than the quietest possible
  treatment. The spec calls verification honesty a core promise and asks for
  it to be *visibly* labelled — a caveat rendered at the same weight as
  surrounding metadata is technically present and practically invisible.

  This inverts the usual instinct: the honest state catches the eye more than
  the reassuring one.
*/
const VERIFICATION_TONES: Record<VerificationStatus, string> = {
  unverified: "bg-unverified-bg text-text-secondary border border-border",
  verified: "bg-support-bg text-support-fg",
  disputed: "bg-defected-bg text-defected-fg",
};

const BASE = "inline-flex items-center text-xs px-2.5 py-1 rounded-sm";

/**
 * Where a named party stands. Pass `party` to render "Party A: support"
 * rather than a bare status — attribution is the point.
 */
export function PartyBadge({
  status,
  party,
  className,
}: {
  status: PartyStatus;
  party?: string;
  className?: string;
}) {
  const label = PARTY_STATUS_LABEL[status];
  return (
    <span className={cn(BASE, PARTY_TONES[status], className)}>
      {party ? `${party}: ${label.toLowerCase()}` : label}
    </span>
  );
}

/**
 * Whether we've independently checked the numbers. Always rendered, including
 * (especially) when the answer is "we haven't" — that honesty is the feature.
 */
export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  return (
    <span className={cn(BASE, VERIFICATION_TONES[status], className)}>
      {VERIFICATION_STATUS_LABEL[status]}
    </span>
  );
}
