import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { buttonClass } from "@/components/ui/Button";
import { ShareButton } from "@/components/share/ShareButton";
import { getSiteUrl } from "@/lib/site-url";
import { getTotalVotesCast } from "@/lib/submissions";

const TITLE = "So — what do you actually want?";
const DESCRIPTION =
  "Specific, quantifiable policy asks — and who backs them. Three votes a year.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function SharePlatform() {
  const totalVotesCast = await getTotalVotesCast();
  const url = `${getSiteUrl()}/share`;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-md px-5 sm:px-6 py-10 sm:py-14 flex flex-col items-center text-center gap-6">
        <Image
          src="/illustration-share.png"
          alt=""
          width={400}
          height={450}
          className="w-20 h-auto"
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] leading-[1.08]">{TITLE}</h1>
          <p className="text-[15px] text-text-secondary leading-relaxed">
            {DESCRIPTION}
          </p>
          <p className="text-sm text-text-secondary tabular-nums pt-1">
            {totalVotesCast.toLocaleString("en-IN")} votes cast
          </p>
        </div>

        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          <ShareButton
            url={url}
            title={TITLE}
            text={DESCRIPTION}
            className="w-full"
          />
          <Link href="/search" className={buttonClass({ className: "w-full" })}>
            Cast your vote
          </Link>
        </div>
      </main>
    </div>
  );
}
