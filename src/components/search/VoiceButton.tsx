import { cn } from "@/lib/cn";

/** Mic beside the search box. Opens voice mode (VoiceMode.tsx). */
export function VoiceButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Search by voice"
      className={cn(
        "h-full w-11 flex items-center justify-center cursor-pointer text-text-muted hover:text-text active:text-text",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden>
        <rect x="7" y="2.5" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M4.5 9.5a5.5 5.5 0 0011 0M10 15v2.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
