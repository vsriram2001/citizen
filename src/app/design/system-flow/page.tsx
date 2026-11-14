import { SiteHeader } from "@/components/nav/SiteHeader";
import { SystemFlow } from "@/components/home/SystemFlow";
import { FlowLegend, FlowMap, LoopWheel, VoteStream } from "@/components/home/SystemFlowVariants";
import { SEED_ASKS } from "@/lib/mock/asks";

/*
  Side-by-side options for the home page's "what happens to your vote"
  section. A review page, not part of the product: once one is picked it moves
  into SystemFlow and this page goes.
*/

const CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6";

function Option({ letter, name, note, children }: { letter: string; name: string; note: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border">
      <div className={`${CONTAINER} py-12 sm:py-16 flex flex-col gap-8`}>
        <div className="flex flex-col gap-2 max-w-2xl">
          <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Option {letter}</span>
          <h2 className="text-[30px] sm:text-[40px] leading-[1.08]">{name}</h2>
          <p className="text-[15px] text-text-secondary leading-relaxed">{note}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function SystemFlowOptions() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">
        <div className={`${CONTAINER} pt-10 pb-6 flex flex-col gap-3`}>
          <h1 className="text-[36px] sm:text-[48px] leading-[1.05]">What happens to your vote: options</h1>
          <p className="text-[15px] text-text-secondary max-w-2xl">
            Four ways to draw the same loop. Dashed means planned, solid means live. Moving dots are votes.
          </p>
          <FlowLegend />
        </div>

        <Option
          letter="A"
          name="Flow map"
          note="Your slide, animated. One trunk splits three ways at the seal; votes run along every arrow in order and each stop pulses as one arrives. Shows the whole system at once. Phones swipe it sideways."
        >
          <FlowMap />
        </Option>

        <Option
          letter="B"
          name="Loop wheel"
          note="The steps as a circle, because new voters start it again. A ring travels from stop to stop and explains each one. Compact and fits a phone; tap any stop to jump."
        >
          <LoopWheel />
        </Option>

        <Option
          letter="C"
          name="Vote stream"
          note="Most literal: dots leave voters, pour into asks, and the ask that crosses 100 flows on to officials, their answers, the deadline check and the tally. Top to bottom, so it reads the same on a phone. Numbers are made up."
        >
          <VoteStream />
        </Option>

        <Option letter="D" name="Current: scroll timeline" note="What's on the home page now, for comparison.">
          <SystemFlow example={SEED_ASKS[6]} leaders={SEED_ASKS.slice(0, 3)} />
        </Option>
      </main>
    </div>
  );
}
