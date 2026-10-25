import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { ShareButton } from "@/components/share/ShareButton";
import { ShareCard } from "@/components/share/ShareCard";
import { getApprovedSubmission } from "@/lib/submissions";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ askId: string }>;
}): Promise<Metadata> {
  const { askId } = await params;
  const ask = await getApprovedSubmission(askId);
  if (!ask) return {};

  const title = ask.askText;
  const description = `${ask.voteCount.toLocaleString("en-IN")} ${ask.voteCount === 1 ? "vote" : "votes"} · Deadline ${ask.timeframe}`;

  return {
    title,
    description,
    openGraph: { title, description, url: `${getSiteUrl()}/share/${askId}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ShareAsk({
  params,
}: {
  params: Promise<{ askId: string }>;
}) {
  const { askId } = await params;
  const ask = await getApprovedSubmission(askId);
  if (!ask) notFound();

  const url = `${getSiteUrl()}/share/${askId}`;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-md px-4 sm:px-6 py-6 sm:py-14 flex flex-col gap-6">
        <ShareCard ask={ask} />

        <div className="flex flex-col gap-2.5">
          {/* Someone opening a shared link came for this ask — let them back it.
              Search opens prefilled with it, so it ranks first with its Vote button. */}
          <Link
            href={`/search?q=${encodeURIComponent(ask.askText)}`}
            className={buttonClass({ className: "w-full" })}
          >
            Vote for this ask
          </Link>
          <ShareButton
            url={url}
            title={ask.askText}
            text="A specific, quantifiable policy ask on Citizen Poll."
          />
          <Link href="/search" className={buttonClass({ variant: "ghost", className: "w-full" })}>
            Browse other asks
          </Link>
        </div>
      </main>
    </div>
  );
}
