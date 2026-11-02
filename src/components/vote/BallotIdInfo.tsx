"use client";

import { useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { SaveBallotId } from "@/components/vote/SaveBallotId";

/**
 * The "i" beside a Ballot ID: what the code is, and where to save it. Lives on
 * the page only: the shared image is a picture, so an icon on it could never be
 * tapped.
 */
export function BallotIdInfo({ id, year }: { id: string; year: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="What is a Ballot ID?"
        className="relative shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-border text-text-muted text-xs font-semibold cursor-pointer hover:border-accent hover:text-accent transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent after:absolute after:-inset-[7px]"
      >
        i
      </button>

      {open && (
        <Sheet eyebrow="Ballot ID" title="What is this code?" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3 text-[15px] text-text-secondary leading-relaxed">
            <p>
              It&rsquo;s a unique code for your votes this year, generated just for you. Your vote
              is sealed into a public ledger that holds only a fingerprint of this code, never your
              name or your choices.
            </p>
            <p>
              Anyone who has it can enter it on the Verify page to see these votes and check they
              haven&rsquo;t changed since they were sealed. Nobody can use it to change them.
            </p>
            <p>
              It&rsquo;s printed on your share card, so whoever sees the card can check it. Any
              votes you finish later this year join the same code.
            </p>
            <p>Save it to get back to these votes whenever you like.</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <SaveBallotId id={id} year={year} from="votes" />
              <Link
                href="/verify"
                className="text-[13px] text-accent hover:underline underline-offset-4"
              >
                Check it on the ledger
              </Link>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}
