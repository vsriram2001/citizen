"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { PersonIcon } from "@/components/ask/InfoPopover";
import { InfoIcon } from "@/components/ask/AskInfoButton";
import { DoneBeforeIcon } from "@/components/ask/PrecedentButton";

/*
  The small circles beside every ask (a person, an "i", and footsteps on asks
  done somewhere before) are kept icon-only so a dense list stays quiet, but
  on their own nobody could tell what they were. This is the key to them: the
  same glyphs, drawn the same way as on the card, each with a plain-words label.

  IconKey is the static legend (shown on /design). IconHint is the same key
  above the /search list, shown until someone closes it. Closing is
  remembered in localStorage: a per-browser convenience, and if storage is
  blocked the hint just shows again, which is harmless.
*/

const HINT_KEY = "cp.iconHintDismissed";

function Glyph({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-border bg-card text-text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

const ITEMS = [
  {
    glyph: <PersonIcon className="w-3 h-3" />,
    label: "Who answers for it",
    detail: "the officials who can deliver the ask",
  },
  {
    glyph: <InfoIcon className="w-3 h-3" />,
    label: "The full case",
    detail: "why it matters, the downsides, what others think",
  },
  {
    // Only some asks have it, so the key says so.
    glyph: <DoneBeforeIcon className="w-3 h-3" />,
    glyphClass: "border-support/35",
    label: "Done before",
    detail: "somewhere has already achieved this (only on some asks)",
  },
];

export function IconKey({ className }: { className?: string }) {
  return (
    <dl className={cn("flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2", className)}>
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-start gap-2 min-w-0">
          <Glyph className={item.glyphClass}>{item.glyph}</Glyph>
          <div className="text-[13px] leading-5 min-w-0">
            <dt className="inline font-semibold text-text">{item.label}</dt>
            <dd className="inline text-text-secondary"> — {item.detail}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function IconHint({ className }: { className?: string }) {
  // Starts hidden so server and first client render agree; shown after mount
  // unless this browser closed it before.
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(HINT_KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads storage once after mount
    if (!dismissed) setShow(true);
  }, []);

  if (!show) return null;

  function close() {
    setShow(false);
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {}
  }

  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-card border border-border bg-card px-4 py-3",
        className,
      )}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
          Tap the icons beside each ask
        </p>
        <IconKey />
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Got it, hide this tip"
        className="shrink-0 -mr-1 -mt-0.5 min-h-8 px-2 rounded-sm text-[13px] text-text-secondary hover:text-text active:bg-paper"
      >
        Got it
      </button>
    </div>
  );
}
