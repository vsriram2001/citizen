import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { buttonClass } from "@/components/ui/Button";
import { HeroImage } from "@/components/home/HeroImage";
import { getTotalVotesCast } from "@/lib/submissions";

/*
  Home screen — single viewport, no scroll on desktop.

  Deliberately spare: split hero, one line of copy, one CTA, the vote counter.
  Nothing else. The page's whole job is to land the question and move people
  into the vote flow; the asks themselves live on the search screen.

  Mobile scrolls — forcing 100vh on a phone would crush the hero to nothing.
  The layout stacks (photo band, then copy) and the page stays short: the
  photo is capped at ~40% of the screen so the CTA lands above the fold.
*/

export default async function Home() {
  const totalVotesCast = await getTotalVotesCast();

  return (
    <div className="flex flex-col lg:h-screen lg:overflow-hidden">
      <SiteHeader />

      <main className="flex-1 lg:min-h-0 mx-auto w-full max-w-7xl lg:px-6 lg:py-6">
        <div className="lg:h-full flex flex-col lg:flex-row lg:items-center lg:gap-10 xl:gap-14">
          {/* Image panel. HEIGHT drives the box (fills the column, capped by
              viewport), and WIDTH follows from aspect-[941/1106] — hero.jpg's
              exact pixel ratio, checked via `sips`. Letting height lead means
              the panel is always exactly the source's shape rather than
              stretching to a grid column's width and cropping to compensate.
              Update the ratio if hero.jpg is replaced. */}
          <div className="relative h-[clamp(220px,40svh,420px)] lg:h-full lg:max-h-[calc(100vh-8rem)] lg:w-auto lg:aspect-[941/1106] lg:shrink-0 bg-ink lg:rounded-card lg:overflow-hidden border-b lg:border border-border">
            <HeroImage />
          </div>

          {/* Right column — vertically centred against the image panel. */}
          <div className="flex flex-col justify-center gap-4 px-5 sm:px-6 pt-7 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:py-10 lg:p-0 lg:min-h-0">
            <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
              Three votes a year
            </span>
            <h1 className="text-[42px] sm:text-[58px] xl:text-[68px] leading-[1.03]">
              So — what do you actually want?
            </h1>
            <p className="text-[15px] xl:text-base text-text-secondary leading-relaxed max-w-md">
              Not a vague wish. A number now, a number wanted, a deadline, and
              the body responsible for delivering it.
            </p>
            <div className="flex flex-col items-stretch sm:items-start gap-2.5 pt-1">
              {/* Full width on phones: the one thing to tap, under the thumb. */}
              <Link href="/onboarding" className={buttonClass({ size: "xl", className: "w-full sm:w-auto" })}>
                Cast your vote
              </Link>
              <span className="text-sm text-text-secondary tabular-nums">
                {totalVotesCast.toLocaleString("en-IN")} votes cast
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-8 mt-2 border-t border-border max-w-md">
              <div className="flex items-start gap-2.5 sm:gap-3 pt-4 sm:pt-6">
                <Image
                  src="/illustration-vote.png"
                  alt=""
                  width={560}
                  height={630}
                  className="w-10 sm:w-14 h-auto shrink-0 opacity-90"
                />
                <div>
                  <h3 className="font-sans text-[13px] font-semibold text-text tracking-[-0.01em]">
                    Vote
                  </h3>
                  <p className="text-[12.5px] text-text-secondary leading-snug mt-0.5">
                    Submit a specific ask, or back one already on the
                    board.
                  </p>
                </div>
              </div>
              <Link href="/share" className="flex items-start gap-2.5 sm:gap-3 pt-4 sm:pt-6 group">
                <Image
                  src="/illustration-share.png"
                  alt=""
                  width={400}
                  height={450}
                  className="w-10 sm:w-14 h-auto shrink-0 opacity-90"
                />
                <div>
                  <h3 className="font-sans text-[13px] font-semibold text-text tracking-[-0.01em] group-hover:underline">
                    Share
                  </h3>
                  <p className="text-[12.5px] text-text-secondary leading-snug mt-0.5">
                    Share your votes, or the platform itself.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
