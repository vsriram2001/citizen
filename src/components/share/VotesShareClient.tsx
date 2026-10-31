"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/useAuth";
import { useIsTouch } from "@/components/mobile/useMediaQuery";
import { ShareButton } from "@/components/share/ShareButton";
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
  const [votedAsks, setVotedAsks] = useState<Ask[]>(() => {
    const votedIds = new Set(getVotedAskIds());
    return asks.filter((ask) => votedIds.has(ask.id));
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
        setVotedAsks(asks.filter((ask) => ids.has(ask.id)));
      })
      .catch(() => {
        // Offline — keep the local record.
      });
  }, [asks, auth.userId]);

  const imageUrl = useMemo(() => {
    const ids = votedAsks.map((a) => a.id).join(",");
    return `${getSiteUrl()}/share/votes/image?ids=${encodeURIComponent(ids)}`;
  }, [votedAsks]);

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
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      {/* On-page card — mirrors the generated share image 1:1 so what you
          see is what gets shared, no surprises. */}
      <div className="bg-card border border-border rounded-card overflow-hidden">
        {/* Perforated tear-off edge, matching the ballot-stub concept. */}
        <div
          className="h-3.5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--color-ink) 0 7px, var(--color-paper) 7px 14px)",
          }}
        />

        <div className="px-5 sm:px-8 pb-8 pt-2">
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <Image
              src="/illustration-vote.png"
              alt=""
              width={560}
              height={630}
              className="w-11 h-auto shrink-0 opacity-90 mb-1"
            />
            <span className="block text-xs uppercase tracking-[0.16em] text-text-muted">
              Citizen Poll · Official Record
            </span>
            <h1 className="text-[26px] sm:text-[28px] leading-[1.14] tracking-[-0.015em]">
              Here&apos;s what I voted for
            </h1>
          </div>

          <div className="flex flex-col">
            {votedAsks.map((ask, i) => (
              <div
                key={ask.id}
                className="flex gap-4 py-5 border-t border-border last:border-b"
              >
                <span className="font-display font-black text-2xl text-text-muted w-7 shrink-0 text-center mt-px">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[17px] font-semibold text-text leading-snug">
                    {ask.askText}
                  </p>
                  <p className="text-[13px] text-text-muted mt-1.5 tabular-nums">
                    Deadline {ask.timeframe}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* Share sheet only exists in a useful form on phones, where it's the
            main action; on desktop copying is. */}
        {isTouch && (
          <ShareButton
            url={imageUrl}
            title="Here's what I voted for"
            text={`${inviteText}\n${siteUrl}`}
            variant="primary"
            label="Share card"
            downloadName="citizen-poll-my-votes.png"
            className="w-full justify-center"
          />
        )}
        <ShareButton
          url={imageUrl}
          variant={isTouch ? "secondary" : "primary"}
          label="Copy card"
          forceCopy
          caption={`${inviteText}\n${siteUrl}`}
          downloadName="citizen-poll-my-votes.png"
          className="w-full justify-center"
        />
      </div>
    </div>
  );
}
