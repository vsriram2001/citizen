import type { Metadata } from "next";
import Link from "next/link";
import { AskDetails } from "@/components/ask/AskDetails";
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
    // One visible screen, as on /share/votes: the ask scrolls if it has to, the
    // buttons stay put. dvh, not vh, so a phone's browser bars can't hide them.
    <div className="h-dvh flex flex-col">
      <SiteHeader />

      <main className="flex-1 min-h-0 mx-auto w-full max-w-md px-4 sm:px-6 pt-4 sm:pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3 sm:gap-4">
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
          <ShareCard ask={ask} />
          <AskDetails ask={ask} />
        </div>

        <div className="grid grid-cols-2 gap-2.5 shrink-0">
          {/* Someone opening a shared link came for this ask — let them back it.
              Search opens prefilled with it, so it ranks first with its Vote button. */}
          <Link
            href={`/search?q=${encodeURIComponent(ask.askText)}`}
            className={buttonClass({ className: "col-span-2 w-full" })}
          >
            Vote for this ask
          </Link>
          <ShareButton
            url={url}
            title={ask.askText}
            text="A specific, quantifiable policy ask on Citizen Poll."
            className="w-full"
          />
          <Link href="/search" className={buttonClass({ variant: "ghost", className: "w-full" })}>
            Browse other asks
          </Link>
        </div>
      </main>
    </div>
  );
}
