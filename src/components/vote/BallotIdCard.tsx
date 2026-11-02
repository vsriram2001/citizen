"use client";

import { useState } from "react";
import { BallotIdInfo } from "@/components/vote/BallotIdInfo";
import { SaveBallotId } from "@/components/vote/SaveBallotId";

/**
 * The Ballot ID on the "My votes" card. The shared image prints the ID too; the
 * info and save buttons are page-only, since a picture can't be tapped. Save,
 * not copy: a copied code gets lost, one in the person's vault doesn't.
 */
export function BallotIdCard({ id, year }: { id: string; year: number }) {
  return (
    <div className="flex flex-col items-center gap-1 pt-6 text-center">
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-text-muted">
        Ballot ID
        <BallotIdInfo id={id} year={year} />
      </span>
      {/* Wraps: SaveBallotId's form is display:contents, so its button sits
          beside the ID and any message drops onto a full-width line below. */}
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 max-w-full">
        <p className="min-w-0 font-mono text-[13px] sm:text-[15px] font-semibold text-text break-all select-all">
          {id}
        </p>
        <SaveBallotId id={id} year={year} from="votes" compact />
      </div>
    </div>
  );
}

export function CopyBallotId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the ID is selectable on screen.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy Ballot ID"}
      className="relative shrink-0 flex items-center justify-center w-6 h-6 rounded-sm text-text-muted cursor-pointer hover:text-accent transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent after:absolute after:-inset-[7px]"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
      <path
        d="M4 10.5l4 4 8-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
