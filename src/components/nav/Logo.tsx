import { cn } from "@/lib/cn";

/**
 * The Citizen Poll mark: a raised finger with the voter's ink line across the
 * nail. The bottom is left open on purpose: closed, it reads as a box. Drawn
 * here rather than served as an image so it stays sharp at header size, and the
 * outline follows the text colour.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="415 265 424 688" fill="none" aria-hidden="true" className={cn("h-6 w-auto", className)}>
      <path d="M439 953V477a188 188 0 0 1 376 0v476" stroke="currentColor" strokeWidth="47" />
      <path
        d="M447 640c30 36 80 54 133 54h94c53 0 103-18 133-54"
        stroke="currentColor"
        strokeWidth="36"
      />
      <rect x="584" y="577" width="86" height="210" rx="43" className="fill-brand" />
    </svg>
  );
}
