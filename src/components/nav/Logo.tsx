import { cn } from "@/lib/cn";

/**
 * The Citizen Poll mark: a raised fingertip with its nail, and the voter's
 * ink line drawn the way the polling officer draws it, from the nail down
 * across its base onto the skin. The bottom is left open on purpose: closed,
 * it reads as a box. Drawn here rather than served as an image so it stays
 * sharp at header size, and the outline follows the text colour.
 * Source drawing: docs/assets/logo-nail-ink-over.svg.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="54.5 37 234.5 299" fill="none" aria-hidden="true" className={cn("h-6 w-auto", className)}>
      <path
        d="M68.5 336V180C68.5 116 114 51 171.75 51C229.5 51 275 116 275 180V336"
        stroke="currentColor"
        strokeWidth="28"
      />
      {/* The nail: its sides start inside the outline, so they grow out of it. */}
      <path
        d="M132 66C112 88 105.5 104 105.5 124V202C105.5 233 135.2 257 171.75 257C208.3 257 238 233 238 202V124C238 104 231.5 88 211.5 66"
        stroke="currentColor"
        strokeWidth="17.5"
      />
      {/* Over the nail's base, not under it: one unbroken mark. */}
      <path d="M171.75 202.5V278.75" strokeWidth="35" strokeLinecap="round" className="stroke-brand" />
    </svg>
  );
}
