"use client";

import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";

const BARS = 7;

interface VoiceStageProps {
  /** What's been heard so far. */
  transcript: string;
  /** Finished speaking; waiting on results. */
  searching: boolean;
  /** Results are ready: the screen lifts away to reveal them. */
  leaving?: boolean;
  error: string | null;
  onSend: () => void;
  onRetry: () => void;
  onClose: () => void;
}

/** The screen itself, apart from its Sheet so /design can show each state. */
export function VoiceStage({ transcript, searching, leaving = false, error, onSend, onRetry, onClose }: VoiceStageProps) {
  const failed = error !== null;
  const heard = transcript !== "";

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-navy text-paper px-5",
        leaving && "voice-lift",
        "pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="shrink-0 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close voice search"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-sm text-paper/70 hover:text-paper cursor-pointer"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* column-reverse keeps the newest words in view once they outgrow the
          screen; my-auto centres them until then. */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col-reverse">
        <div className="my-auto w-full max-w-2xl mx-auto py-4 text-center">
          {heard ? (
            <p className="font-display font-black tracking-[-0.03em] text-[clamp(30px,8.5vw,52px)] leading-[1.14] text-balance break-words">
              {transcript}
            </p>
          ) : failed ? (
            <p className="text-lg leading-snug text-paper text-balance">{error}</p>
          ) : (
            <>
              <p className="font-display font-black tracking-[-0.03em] text-[clamp(30px,8.5vw,52px)] leading-[1.14] text-balance">
                What should change?
              </p>
              <p className="mt-3 text-[15px] text-paper/70">
                Try &ldquo;cleaner water in Bengaluru&rdquo;
              </p>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-center gap-3 pt-4">
        {!failed && (
          <div
            aria-hidden
            className={cn(
              "voice-bars flex items-center gap-1.5 h-12",
              searching ? "is-searching" : heard && "is-hearing",
            )}
          >
            {Array.from({ length: BARS }, (_, bar) => (
              <span
                key={bar}
                className="block h-full w-1.5 rounded-sm bg-paper"
                style={{ "--bar": bar } as React.CSSProperties}
              />
            ))}
          </div>
        )}
        <p role="status" className="text-[13px] text-paper/70 min-h-5">
          {failed ? "" : searching ? "Searching the asks…" : "Listening…"}
        </p>
        <div className="w-full max-w-sm flex gap-2 min-h-11">
          {failed ? (
            <>
              <StageButton onClick={onClose}>Type instead</StageButton>
              <StageButton primary onClick={onRetry}>
                Try again
              </StageButton>
            </>
          ) : (
            !searching && (
              <>
                <StageButton onClick={onClose}>Cancel</StageButton>
                <StageButton primary disabled={!heard} onClick={onSend}>
                  Send
                </StageButton>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function StageButton({
  primary = false,
  disabled = false,
  onClick,
  children,
}: {
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex-1 min-h-11 rounded-sm text-[15px] border cursor-pointer disabled:opacity-40 disabled:cursor-default",
        primary ? "bg-paper text-navy border-paper font-semibold" : "text-paper border-paper/40",
      )}
    >
      {children}
    </button>
  );
}

/** Full-screen, so speaking feels like its own mode rather than a form field. */
export function VoiceMode(props: VoiceStageProps) {
  return (
    <Sheet size="screen" label="Voice search" onClose={props.onClose} bodyClassName="p-0 sm:pb-0 overflow-hidden">
      <VoiceStage {...props} />
    </Sheet>
  );
}
