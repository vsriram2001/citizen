"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { AskCard } from "@/components/ask/AskCard";
import { VoteMeter } from "@/components/vote/VoteMeter";
import { answerableTo } from "@/components/home/answerableTo";
import { VOTE_BUDGET } from "@/lib/vote-session";
import type { Ask } from "@/lib/types";

/**
 * A practice run of the real vote screen, on the same AskCard and VoteMeter,
 * so feeling the three-vote limit needs no sign-in. Local state only: it never
 * touches useVotes, and a refresh clears it.
 *
 * Opens with one vote already placed so "who answers for this" is visible
 * before anyone taps. `children` is the section heading, which shares the
 * sticky left column with the meter on desktop.
 */
export function SampleBallot({ asks, children }: { asks: Ask[]; children: React.ReactNode }) {
  const [picked, setPicked] = useState<string[]>(() => (asks[1] ? [asks[1].id] : []));
  const [message, setMessage] = useState("Vote on an ask to see who answers for it.");

  const remaining = VOTE_BUDGET - picked.length;
  const leader = Math.max(...asks.map((a) => a.voteCount), 1);

  function vote(id: string) {
    const left = remaining - 1;
    setPicked([...picked, id]);
    setMessage(
      left === 0
        ? "That's all three. To back another ask, take one of these back."
        : `Now you can see who answers for it. ${left} left.`,
    );
  }

  function unvote(id: string) {
    setPicked(picked.filter((p) => p !== id));
    setMessage("Vote taken back. Spend it on something else.");
  }

  const meter = (
    <div className="flex flex-col gap-2">
      <VoteMeter used={picked.length} total={VOTE_BUDGET} />
      <p role="status" className="text-[13px] text-text-secondary leading-snug min-h-[2.5em]">
        {message}
      </p>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-14">
      <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        {children}
        <div className="hidden lg:block">{meter}</div>
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        {/* Phones: stays in view while you work down the list. */}
        <div className="lg:hidden sticky top-0 z-10 bg-paper py-3 -my-1">{meter}</div>
        <ol className="flex flex-col gap-2.5">
          {asks.map((ask, i) => {
            const voted = picked.includes(ask.id);
            return (
              <li key={ask.id}>
                <AskCard
                  compact
                  ask={voted ? { ...ask, voteCount: ask.voteCount + 1 } : ask}
                  rank={i + 1}
                  voted={voted}
                  disabled={remaining === 0}
                  onVote={() => vote(ask.id)}
                  onUnvote={() => unvote(ask.id)}
                  barPct={(ask.voteCount / leader) * 100}
                  showInfo={false}
                  showShare={false}
                />
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none",
                    voted ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <p className="overflow-hidden min-h-0 px-4 text-[13px] text-text-secondary leading-snug">
                    <span className="block pt-2">
                      Answerable to{" "}
                      <span className="font-semibold text-text">{answerableTo(ask)}</span>
                    </span>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
