import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { buttonClass } from "@/components/ui/Button";
import { VerificationBadge } from "@/components/ui/Badge";
import { INTRO_SEEN_COOKIE } from "@/components/home/introCookie";
import { MobileIntro } from "@/components/home/MobileIntro";
import { SampleBallot } from "@/components/home/SampleBallot";
import { WishToAsk } from "@/components/home/WishToAsk";
import { getSearchableAsks } from "@/lib/submissions";
import { SEED_ASKS } from "@/lib/mock/asks";

/*
  Home screen. A first-time visitor has to be able to say what this site is
  after one screen, and the earlier single-viewport version didn't manage
  that: people landed on a question and a button, and were lost.

  So the page shows rather than tells: a wish turning into an ask, then a
  practice ballot on the real vote components, then the rules behind it. The
  wish examples are hand-paired with seed asks because they need a matching
  vague phrasing; the ballot uses whatever people are really voting on.

  Phones get a first-visit opener (MobileIntro), and a hero reordered around
  what a narrow screen can hold: headline, one line, the example, with the CTA
  pinned to the bottom until the hero scrolls away. Desktop keeps its two
  columns. ?intro=1 replays the opener, for checking it.
*/

const WISHES = [
  { wish: "Fix the roads", askId: "pothole-sla" },
  { wish: "Better schools", askId: "fee-cap" },
  { wish: "Cleaner lakes", askId: "lake-sewage" },
  { wish: "Healthcare I can afford", askId: "health-spend" },
];

const EXAMPLES = WISHES.flatMap(({ wish, askId }) => {
  const ask = SEED_ASKS.find((a) => a.id === askId);
  return ask ? [{ wish, ask }] : [];
});

const RULES = [
  {
    title: "Specific.",
    body: "Every ask says where things are now, where they should be, and by when. No wishes.",
  },
  {
    title: "Scarce.",
    body: "Three votes a year. You can't back everything, so what you back says something.",
  },
  {
    title: "Accountable.",
    body: "Each ask names who can deliver it, local first, so you know who to hold to it.",
  },
];

const PROMISES = [
  {
    title: "Unverified until checked",
    body: "Every number carries this label until someone independently checks it. We'd rather say so than look authoritative.",
    badge: true,
  },
  {
    title: "No party without a source",
    body: "We never attach a party name to a position unless we can link to where they said it.",
  },
  {
    title: "One person, one set of votes",
    body: "A Google sign-in keeps it to one person, so nobody can stuff the box.",
  },
];

const LABEL = "text-[11px] uppercase tracking-[0.16em] text-text-muted";
const CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6";
const H2 = "text-[30px] sm:text-[40px] leading-[1.08]";
const TEXT_LINK =
  "text-sm text-text-secondary hover:text-text transition-colors underline underline-offset-4";

/** The headline's three demands, underlined the way search marks a match. */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <span className="underline decoration-accent/60 decoration-[3px] underline-offset-[5px]">
      {children}
    </span>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ intro?: string }>;
}) {
  const { asks } = await getSearchableAsks();
  const introAsk = EXAMPLES[0]?.ask;
  const showIntro =
    introAsk !== undefined &&
    ((await searchParams).intro !== undefined || !(await cookies()).has(INTRO_SEEN_COOKIE));
  const totalVotesCast = asks.reduce((sum, a) => sum + a.voteCount, 0);
  const topAsks = asks
    .filter((a) => a.currentValue && a.targetValue)
    .toSorted((a, b) => b.voteCount - a.voteCount)
    .slice(0, 6);

  return (
    <div className="flex flex-col min-h-screen">
      {showIntro && <MobileIntro ask={introAsk} />}
      <SiteHeader />

      <main className="flex-1">
        {/* What it is */}
        <section
          className={`${CONTAINER} flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:items-center pt-8 sm:pt-16 sm:pb-20`}
        >
          {/* contents: below lg the copy and the example are one column, so the
              example can sit between the copy and the buttons on a phone. */}
          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <span className={LABEL}>Three votes a year</span>
            <h1 className="text-[clamp(40px,12.4vw,50px)] sm:text-[58px] xl:text-[68px] leading-[1.05]">
              A wish is free. An ask has a <Key>number</Key>, a <Key>date</Key> and a{" "}
              <Key>name</Key>.
            </h1>
            <p className="sm:hidden text-base text-text-secondary leading-relaxed">
              Tell the government what to change, in terms that can be checked.
              Three votes a year.
            </p>
            <p className="hidden sm:block text-base xl:text-lg text-text-secondary leading-relaxed max-w-xl">
              Citizen Poll is where people in India tell the government what to
              change, in terms that can be checked. You get three votes a year to
              back the asks that matter most, and every ask shows who is
              responsible for delivering it.
            </p>
            {/* Phones: pinned under the thumb for as long as the hero is on
                screen, then it scrolls away with it. */}
            <div className="hide-on-keyboard order-3 lg:order-none sticky bottom-0 z-10 -mx-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-paper border-t border-border flex flex-col min-[360px]:flex-row items-stretch gap-2 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:border-t-0 sm:gap-3 sm:pt-1">
              <Link
                href="/onboarding"
                className={buttonClass({ size: "xl", className: "flex-1 px-3 tracking-[0.06em] sm:flex-none sm:px-14 sm:tracking-[0.09em]" })}
              >
                Cast your vote
              </Link>
              <Link
                href="/search"
                className={buttonClass({ variant: "secondary", size: "lg", className: "px-4 sm:px-6" })}
              >
                Browse asks
              </Link>
            </div>
            <span className="order-2 sm:order-3 lg:order-none text-sm text-text-secondary tabular-nums">
              {totalVotesCast.toLocaleString("en-IN")} votes cast
            </span>
          </div>

          <div className="order-1 sm:order-4 lg:order-none min-w-0 sm:mt-5 lg:mt-0">
            <WishToAsk examples={EXAMPLES} />
          </div>
        </section>

        {/* Try it */}
        <section id="ballot" className="border-t border-border scroll-mt-4">
          <div className={`${CONTAINER} py-12 sm:py-20`}>
            <SampleBallot asks={topAsks}>
              <div className="flex flex-col gap-3">
                <span className={LABEL}>Practice ballot. Nothing is saved.</span>
                <h2 className={H2}>You only get three.</h2>
                <p className="text-[15px] text-text-secondary leading-relaxed max-w-md">
                  These are the asks people are backing most. Spend your votes
                  and watch what appears, then try to back a fourth.
                </p>
                <Link href="/search" className={`${TEXT_LINK} w-fit`}>
                  Browse every ask
                </Link>
              </div>
            </SampleBallot>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border bg-card">
          <div className={`${CONTAINER} py-12 sm:py-20`}>
            <span className={LABEL}>How it works</span>
            <h2 className={`${H2} mt-2`}>Three rules do all the work.</h2>
            <div className="mt-8 sm:mt-10 grid md:grid-cols-3 gap-7 md:gap-10">
              {RULES.map((rule) => (
                <div key={rule.title} className="flex flex-col gap-2 border-t border-border pt-4">
                  <h3 className="text-[26px] sm:text-[30px] leading-tight">{rule.title}</h3>
                  <p className="text-[15px] text-text-secondary leading-relaxed max-w-sm">
                    {rule.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What we promise */}
        <section className={`${CONTAINER} py-12 sm:py-20`}>
          <span className={LABEL}>What we promise</span>
          <h2 className={`${H2} mt-2`}>Rules we hold ourselves to.</h2>
          <dl className="mt-8 sm:mt-10 border-t border-border">
            {PROMISES.map((promise) => (
              <div
                key={promise.title}
                className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-10 gap-y-1 py-4 sm:py-5 border-b border-border"
              >
                <dt className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-text">
                  {promise.title}
                  {promise.badge && <VerificationBadge status="unverified" />}
                </dt>
                <dd className="text-[15px] text-text-secondary leading-relaxed max-w-2xl">
                  {promise.body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-border">
          <div
            className={`${CONTAINER} flex flex-col items-center text-center gap-5 pt-12 sm:pt-16 pb-[max(3rem,env(safe-area-inset-bottom))] sm:pb-20`}
          >
            <Image
              src="/illustration-vote.png"
              alt=""
              width={560}
              height={630}
              className="w-24 sm:w-32 h-auto mix-blend-multiply opacity-90"
            />
            <h2 className="text-[40px] sm:text-[58px] leading-[1.05]">Spend your three.</h2>
            <p className="text-[15px] sm:text-base text-text-secondary leading-relaxed max-w-md">
              Pick what you want changed, and see who is responsible for changing it.
            </p>
            <Link href="/onboarding" className={buttonClass({ size: "xl", className: "w-full sm:w-auto" })}>
              Cast your vote
            </Link>
            <Link href="/share" className={TEXT_LINK}>
              Or share Citizen Poll
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
