import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HeroImage } from "@/components/HeroImage";
import { TOTAL_VOTES_CAST } from "@/lib/mock-data";

/*
  Home screen — single viewport, no scroll on desktop.

  Deliberately spare: split hero, one line of copy, one CTA, the vote counter.
  Nothing else. The page's whole job is to land the question and move people
  into the vote flow; the asks themselves live on the search screen.

  Mobile scrolls — forcing 100vh on a phone would crush the hero to nothing.
  The layout stacks and the page stays short.
*/

export default function Home() {
  return (
    <div className="flex flex-col lg:h-screen lg:overflow-hidden">
      <header className="border-b border-border shrink-0">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">
            Citizen Poll
          </span>
          <nav className="flex items-center gap-5">
            <Link
              href="/search"
              className="text-[13px] text-text-secondary hover:text-text transition-colors"
            >
              Browse asks
            </Link>
            <Link href="/search">
              <Button size="sm">Cast your vote</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 lg:min-h-0 mx-auto w-full max-w-7xl lg:px-6 lg:py-6">
        <div className="lg:h-full flex lg:items-center lg:gap-10 xl:gap-14">
          {/* Image panel. HEIGHT drives the box (fills the column, capped by
              viewport), and WIDTH follows from aspect-[941/1671] — hero.jpg's
              exact pixel ratio, checked via `sips`. Previously width was
              forced to fill the grid column and height was capped
              independently, so the two didn't agree with the ratio and
              object-cover cropped the sides to compensate. Letting height
              lead means the panel is always exactly the source's shape,
              narrower on tall/narrow viewports, which shows more of a tall
              portrait image instead of slicing it. Update the ratio if
              hero.jpg is replaced. */}
          <div className="relative min-h-[280px] sm:min-h-[340px] lg:h-full lg:max-h-[calc(100vh-8rem)] lg:w-auto lg:aspect-[941/1671] lg:shrink-0 bg-ink lg:rounded-card lg:overflow-hidden border-b lg:border border-border">
            <HeroImage />
          </div>

          {/* Right column — vertically centred against the image panel. */}
          <div className="flex flex-col justify-center gap-4 px-6 py-10 lg:p-0 lg:min-h-0">
            <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
              Three votes a year
            </span>
            <h1 className="text-[38px] sm:text-[44px] xl:text-[52px] leading-[1.03]">
              So — what do you actually want?
            </h1>
            <p className="text-[15px] xl:text-base text-text-secondary leading-relaxed max-w-md">
              Not a vague wish. A number now, a number wanted, a deadline, and
              the body responsible for delivering it.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link href="/search">
                <Button size="lg">Cast your vote</Button>
              </Link>
              <span className="text-sm text-text-secondary tabular-nums">
                {TOTAL_VOTES_CAST.toLocaleString("en-IN")} votes cast
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
