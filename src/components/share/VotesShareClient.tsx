"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/useAuth";
import { useIsTouch } from "@/components/mobile/useMediaQuery";
import { Logo } from "@/components/nav/Logo";
import { ShareButton } from "@/components/share/ShareButton";
import {
  getLoadedBallots,
  inVotedOrder,
  loadBallots,
  votesImageUrl,
} from "@/components/share/votesSharePrep";
import { BallotIdCard } from "@/components/vote/BallotIdCard";
import type { Ballot } from "@/lib/ballot";
import type { Ask } from "@/lib/types";
import { getVotedAskIds } from "@/lib/vote-session";
import { getSiteUrl } from "@/lib/site-url";

/**
 * "My votes" share surface — a ballot-slip card, all voted asks, styled
 * after a real ballot stub (perforated edge, numbered entries) so it reads
 * as an official record rather than a generic stat card. Two distinct
 * actions, deliberately not merged into one "Share" button: sharing the
 * card image is the viral path (self-contained, renders everywhere);
 * "Share website" sends the site's root URL with invite text, not this
 * page's own URL — a recipient can't vote from someone else's vote record,
 * so the link needs to land them somewhere they actually can.
 */
export function VotesShareClient({ asks }: { asks: Ask[] }) {
  const auth = useAuth();
  const isTouch = useIsTouch();
  // Arriving from the ballot animation, the ID and the card image were
  // prepared while it played (votesSharePrep), so the first render has them.
  const [ballots, setBallots] = useState<Ballot[]>(() => getLoadedBallots() ?? []);
  const latestBallot = ballots.at(0);
  const [votedAsks, setVotedAsks] = useState<Ask[]>(() => {
    const votedIds = new Set(getVotedAskIds());
    return inVotedOrder(asks.filter((ask) => votedIds.has(ask.id)));
  });

  // The signed-in person's votes on the server are the truth — this also
  // fills the page on a device that has never voted from.
  useEffect(() => {
    if (!auth.userId) return;
    fetch("/api/votes")
      .then((res) => res.json())
      .then((data: { votes?: { submissionId: string }[] }) => {
        // Signed in, so even an empty list is the truth (e.g. all retracted).
        const ids = new Set((data.votes ?? []).map((v) => v.submissionId));
        setVotedAsks(inVotedOrder(asks.filter((ask) => ids.has(ask.id))));
      })
      .catch(() => {
        // Offline — keep the local record.
      });
  }, [asks, auth.userId]);

  // Also seals any finished votes onto the ledger; empty until votes are
  // finished. Reuses the request the vote screen started, if there is one.
  useEffect(() => {
    if (!auth.userId) return;
    let live = true;
    loadBallots().then((b) => live && setBallots(b));
    return () => {
      live = false;
    };
  }, [auth.userId]);

  const imageUrl = useMemo(
    () => votesImageUrl(votedAsks.map((a) => a.id), latestBallot?.id),
    [votedAsks, latestBallot],
  );

  // Signed out: the local record may belong to whoever used this browser last,
  // so don't show it — votes belong to a Google account.
  if (auth.ready && !auth.userId) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-14">
        <h1 className="text-[28px] leading-[1.08]">Sign in to see your votes</h1>
        <p className="text-[15px] text-text-secondary max-w-sm">
          Your votes are kept with your Google account, so they show up on any device.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button onClick={() => auth.signInWithGoogle()}>Continue with Google</Button>
          <Link href="/search" className={buttonClass({ variant: "secondary" })}>
            Browse asks
          </Link>
        </div>
      </div>
    );
  }

  if (votedAsks.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-14">
        <h1 className="text-[28px] leading-[1.08]">No votes yet</h1>
        <p className="text-[15px] text-text-secondary max-w-sm">
          Vote on an ask and it&apos;ll show up here, ready to share.
        </p>
        <Link href="/search" className={buttonClass()}>
          Browse asks
        </Link>
      </div>
    );
  }

  const siteUrl = getSiteUrl();
  const inviteText = `I just backed ${votedAsks.length} ${votedAsks.length === 1 ? "ask" : "asks"} on Citizen Poll — specific, quantifiable policy asks and who backs them. Cast your own votes:`;

  return (
    // m-auto centres the pair on tall screens; on short ones the margins collapse
    // and the card gives up height, so the buttons below it never leave the screen.
    <div className="m-auto flex flex-col gap-3 sm:gap-4 w-full max-w-md min-h-0">
      {/* On-page card — same content as the generated share image so what you
          see is what gets shared, no surprises. */}
      {/* The outline is an inset ring, not a border, so the ticket notches
          (TearLine) can sit over it and cut the edge. */}
      <div className="flex flex-col min-h-0 bg-card shadow-[inset_0_0_0_1px_var(--color-border)] rounded-card overflow-hidden">
        {/* Perforated tear-off edge, matching the ballot-stub concept. */}
        <div
          className="h-2.5 shrink-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--color-ink) 0 7px, var(--color-paper) 7px 14px)",
          }}
        />

        {/* Scrolls only if the record outgrows the screen (very long asks, a
            small phone): better a scrolling card than unreachable buttons.
            relative: keeps SaveBallotId's sr-only fields inside this scroller,
            or they stretch the page below it. */}
        <div className="relative min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 pb-4">
          <div className="flex flex-col items-center text-center gap-1 py-4">
            {/* The inked finger the ballot animation ends on. First thing to go
                on short screens: it's decoration, the votes aren't. */}
            <Logo className="h-10 shrink-0 text-ink mb-2 [@media(max-height:760px)]:hidden" />
            {/* Not "official": these are citizens' asks, not an election. */}
            <span className="block text-[11px] uppercase tracking-[0.16em] text-text-muted">
              Citizen Poll · My ballot {latestBallot?.year ?? new Date().getFullYear()}
            </span>
            <h1 className="text-[24px] leading-[1.14] tracking-[-0.015em]">
              Here&apos;s what I voted for
            </h1>
          </div>

          <TearLine />

          <div className="flex flex-col">
            {votedAsks.map((ask, i) => (
              <div
                key={ask.id}
                className="flex gap-3 py-3 [@media(max-height:600px)]:py-2 border-t border-border first:border-t-0"
              >
                <span className="font-display font-black text-xl text-text-muted w-6 shrink-0 text-center">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-text leading-snug">
                    {ask.askText}
                  </p>
                  <p className="text-[12px] text-text-muted mt-0.5 tabular-nums">
                    Deadline {ask.timeframe}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <TearLine />

          {ballots.map((ballot) => (
            <div key={ballot.id} className="-mt-2">
              <BallotIdCard id={ballot.id} year={ballot.year} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2.5 shrink-0">
        {/* Share sheet only exists in a useful form on phones, where it's the
            main action; on desktop copying is. Side by side to leave the card
            the height. */}
        {isTouch && (
          <ShareButton
            url={imageUrl}
            title="Here's what I voted for"
            text={`${inviteText}\n${siteUrl}`}
            variant="primary"
            label="Share card"
            downloadName="citizen-poll-my-votes.png"
            className="flex-1 min-w-0 justify-center"
          />
        )}
        <ShareButton
          url={imageUrl}
          variant={isTouch ? "secondary" : "primary"}
          label="Copy card"
          forceCopy
          caption={`${inviteText}\n${siteUrl}`}
          downloadName="citizen-poll-my-votes.png"
          className="flex-1 min-w-0 justify-center"
        />
      </div>
    </div>
  );
}

/**
 * A ticket's tear line: dashes across, and a half-circle notch cut into each
 * edge. The notches are page-coloured discs centred on the card's edge; the
 * card clips their outer half, and their own outline covers the card's inset
 * ring there, so the edge reads as cut, not bumped.
 */
function TearLine() {
  return (
    <div aria-hidden="true" className="relative -mx-4 sm:-mx-6 h-6 shrink-0">
      <span className="absolute inset-x-5 sm:inset-x-7 top-1/2 border-t-2 border-dashed border-border" />
      <span className="absolute -left-3 top-0 size-6 rounded-full bg-paper border border-border" />
      <span className="absolute -right-3 top-0 size-6 rounded-full bg-paper border border-border" />
    </div>
  );
}
