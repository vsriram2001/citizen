"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { VOTE_BUDGET } from "@/lib/vote-session";
import type { Ask } from "@/lib/types";

/*
  "What happens to my vote?" is the question people leave with if the home
  page doesn't answer it, so this section walks one vote from the ask to the
  final tally. A rail fills as you scroll and each step switches on when the
  fill reaches it, playing a small demo of that step.

  Honesty over polish: steps that aren't built yet are drawn dashed and say
  "Planned", the same way every ask says "Unverified". The pressure track is
  the promise of the product, so it's shown, but never as if it already runs.

  Reduced motion: every step is on from the start and nothing moves.
*/

/** Backing an ask needs before it's sent to the people responsible.
 *  Provisional: the number isn't settled, and nothing sends yet. */
export { DELIVERY_THRESHOLD } from "@/components/home/threshold";
import { DELIVERY_THRESHOLD, DELIVERY_THRESHOLD_LABEL } from "@/components/home/threshold";

type Track = "vote" | "receipt" | "pressure" | "spread";

const TRACK_LABEL: Record<Track, string> = {
  vote: "Your vote",
  receipt: "Your receipt",
  pressure: "The pressure",
  spread: "The spread",
};

type Step = {
  track: Track;
  icon: keyof typeof ICONS;
  title: string;
  sub: string;
  body: string;
  live: boolean;
  demo: (props: DemoProps) => React.ReactNode;
};

type DemoProps = { on: boolean; example: Ask; leaders: Ask[] };

/** Stagger for the n-th child of a demo, so parts arrive one after another. */
const delay = (n: number) => ({ transitionDelay: `${n * 140}ms` });

/** Fades and lifts into place when the step switches on. */
const RISE =
  "transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none opacity-0 translate-y-1.5 group-data-[on=true]:opacity-100 group-data-[on=true]:translate-y-0";

const DEMO_BOX = "rounded-card border border-border bg-card p-3.5 sm:p-4 text-[13px]";

const STEPS: Step[] = [
  {
    track: "vote",
    icon: "ask",
    title: "Pick an ask, or write one",
    sub: "Measurable, owned",
    body: "Back an ask that's already here, or add your own. Either way it has to say where things are now, where they should be, by when, and who can deliver it.",
    live: true,
    demo: ({ example }) => (
      <div className={DEMO_BOX}>
        <p className={cn(RISE, "text-text font-semibold leading-snug")} style={delay(0)}>
          {example.askText}
        </p>
        <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
          {[
            ["Now", example.currentValue],
            ["Target", example.targetValue],
            ["By", example.timeframe],
            ["Who", example.targetBody],
          ].map(([k, v], i) => (
            <div key={k} className="contents">
              <dt className={cn(RISE, "text-text-muted")} style={delay(i + 1)}>
                {k}
              </dt>
              <dd className={cn(RISE, "text-text-secondary min-w-0")} style={delay(i + 1)}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    ),
  },
  {
    track: "vote",
    icon: "ballot",
    title: `Cast ${VOTE_BUDGET} votes`,
    sub: `${VOTE_BUDGET} a year, locked`,
    body: "You get three a year. You can't back everything, so what you back says something. Once you finish, they're spent until next year.",
    live: true,
    demo: () => (
      <div className={cn(DEMO_BOX, "flex items-center gap-3")}>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: VOTE_BUDGET }, (_, i) => (
            <span
              key={i}
              className="relative size-7 rounded-sm border border-border bg-paper overflow-hidden"
            >
              <span
                className="absolute inset-0 bg-accent origin-bottom scale-y-0 transition-transform duration-300 ease-out motion-reduce:transition-none group-data-[on=true]:scale-y-100"
                style={{ transitionDelay: `${200 + i * 260}ms` }}
              />
            </span>
          ))}
        </div>
        <span className={cn(RISE, "text-text-secondary")} style={delay(7)}>
          3 of 3 cast · locked for the year
        </span>
      </div>
    ),
  },
  {
    track: "receipt",
    icon: "ticket",
    title: "Sealed, with a Ballot ID",
    sub: "Yearly receipt · public ledger",
    body: "Your votes are sealed into a public ledger and you get a Ballot ID. Paste it on the verify page any time to check your votes are still there, unchanged. The ID doesn't say who you are.",
    live: true,
    demo: ({ on }) => (
      <div className={cn(DEMO_BOX, "flex flex-col gap-2")}>
        <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Ballot ID · example</span>
        <Typed on={on} text="CP26-7KQ4M-R2XWD-H8" />
        <span className={cn(RISE, "flex items-center gap-1.5 text-support-fg")} style={delay(8)}>
          <Icon name="check" className="size-4" />
          Intact on the ledger
        </span>
      </div>
    ),
  },
  {
    track: "pressure",
    icon: "bars",
    title: "Public totals",
    sub: "Ranks priorities",
    body: "Totals are public and live. Because votes are scarce, the ranking shows what people want most, not just what they'd tick if it were free.",
    live: true,
    demo: ({ leaders }) => {
      const top = Math.max(...leaders.map((a) => a.voteCount), 1);
      return (
        <ol className={cn(DEMO_BOX, "flex flex-col gap-2.5")}>
          {leaders.map((a, i) => (
            <li key={a.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-text-secondary truncate">{a.askText}</span>
                <span className="text-text tabular-nums shrink-0">{a.voteCount.toLocaleString("en-IN")}</span>
              </div>
              <span className="h-1.5 rounded-sm bg-paper overflow-hidden">
                <span
                  className="block h-full bg-accent origin-left scale-x-0 transition-transform duration-700 ease-out motion-reduce:transition-none group-data-[on=true]:scale-x-100"
                  style={{ width: `${(a.voteCount / top) * 100}%`, ...delay(i + 1) }}
                />
              </span>
            </li>
          ))}
        </ol>
      );
    },
  },
  {
    track: "pressure",
    icon: "send",
    title: `At ${DELIVERY_THRESHOLD_LABEL} votes, it's sent`,
    sub: "To the people named on it",
    body: `When an ask crosses ${DELIVERY_THRESHOLD_LABEL} votes, we send it, with its count and where its voters are, to the officials it names. Local first: a city problem goes to the city.`,
    live: false,
    demo: ({ on, example }) => <ThresholdDemo on={on} ask={example} />,
  },
  {
    track: "pressure",
    icon: "building",
    title: "They respond, or don't",
    sub: "Endorse, decline, silence",
    body: "Whatever they say goes on the ask for everyone to see. Saying nothing is an answer too, and it's recorded as one.",
    live: false,
    demo: () => (
      <ul className={cn(DEMO_BOX, "flex flex-col gap-2")}>
        {[
          ["Endorsed", "Commits to the target and date", "bg-support-bg text-support-fg"],
          ["Declined", "Says no, with a reason", "bg-against-bg text-against-fg"],
          ["No response", "Recorded if they stay silent", "bg-noresponse-bg text-noresponse-fg"],
        ].map(([label, note, tone], i) => (
          <li key={label} className={cn(RISE, "flex items-center gap-3")} style={delay(i)}>
            <span className={cn("text-xs px-2.5 py-1 rounded-sm w-28 shrink-0 text-center", tone)}>{label}</span>
            <span className="text-text-secondary min-w-0">{note}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    track: "pressure",
    icon: "inspect",
    title: "Delivery check",
    sub: "Against official data",
    body: "On the deadline, we check the target against official figures, not press releases. Every ask was written with a number, so this is a yes or a no.",
    live: false,
    demo: ({ example }) => (
      <div className={cn(DEMO_BOX, "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5")}>
        <span className={cn(RISE, "text-text-muted")} style={delay(0)}>Promised</span>
        <span className={cn(RISE, "text-text")} style={delay(0)}>
          {example.targetValue} by {example.timeframe}
        </span>
        <span className={cn(RISE, "text-text-muted")} style={delay(2)}>Official data</span>
        <span className={cn(RISE, "text-text-secondary")} style={delay(2)}>
          Checked on the deadline
        </span>
        <span className={cn(RISE, "text-text-muted")} style={delay(4)}>Result</span>
        <span className={cn(RISE, "flex flex-wrap items-center gap-1.5")} style={delay(4)}>
          <span className="text-xs px-2 py-0.5 rounded-sm bg-support-bg text-support-fg">Delivered</span>
          <span className="text-text-muted">or</span>
          <span className="text-xs px-2 py-0.5 rounded-sm bg-against-bg text-against-fg">Missed</span>
        </span>
      </div>
    ),
  },
  {
    track: "pressure",
    icon: "scales",
    title: "The public tally",
    sub: "Promised vs done",
    body: "Every ask ends up in one public count: delivered, missed, still running. That record is what you take into the next election.",
    live: false,
    demo: () => <TallyDemo />,
  },
  {
    track: "spread",
    icon: "phone",
    title: "Share, and the loop restarts",
    sub: "Person to person",
    body: "Your three make a card you can post. Every person who votes because of it pushes an ask closer to the threshold, and the loop starts again.",
    live: true,
    demo: () => (
      <div className={cn(DEMO_BOX, "flex items-center gap-3")}>
        <div className="flex -space-x-2" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="size-8 rounded-full border-2 border-card bg-accent/15 text-accent grid place-items-center transition-[opacity,scale] duration-300 motion-reduce:transition-none opacity-0 scale-50 group-data-[on=true]:opacity-100 group-data-[on=true]:scale-100"
              style={{ transitionDelay: `${i * 160}ms` }}
            >
              <Icon name="person" className="size-4" />
            </span>
          ))}
        </div>
        <span className={cn(RISE, "text-text-secondary")} style={delay(6)}>
          + new voters
        </span>
      </div>
    ),
  },
];

/* ─── Section ───────────────────────────────────────────────────────────── */

export function SystemFlow({ example, leaders }: { example: Ask; leaders: Ask[] }) {
  const railRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const [reached, setReached] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    const fill = fillRef.current;
    if (!rail || !fill) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fill.style.transform = "scaleY(1)";
      const all = requestAnimationFrame(() => setReached(STEPS.length));
      return () => cancelAnimationFrame(all);
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      // The fill's leading edge sits a bit above the middle of the screen, so
      // a step switches on while it's still comfortably in view.
      const edge = window.innerHeight * 0.6;
      const box = rail.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (edge - box.top) / box.height));
      fill.style.transform = `scaleY(${progress})`;
      if (markRef.current) {
        markRef.current.style.transform = `translate(-50%, ${progress * (box.height - 40)}px)`;
        markRef.current.style.opacity = progress > 0 && progress < 1 ? "1" : "0";
      }
      const nodes = rail.querySelectorAll<HTMLElement>("[data-node]");
      let n = 0;
      nodes.forEach((node) => {
        if (node.getBoundingClientRect().top + 20 <= edge) n++;
      });
      setReached(n);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div className="flex flex-col gap-8 sm:gap-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="flex flex-col gap-3 max-w-2xl">
          <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">What happens to your vote</span>
          <h2 className="text-[30px] sm:text-[40px] leading-[1.08]">It doesn&rsquo;t vanish into a count.</h2>
          <p className="text-[15px] text-text-secondary leading-relaxed">
            A vote here is the start of a paper trail: you get a receipt, the ask
            goes to the people who can deliver it, and the result is checked in
            public. Scroll to follow one.
          </p>
        </div>
        <Legend />
      </div>

      <ol ref={railRef} className="relative flex flex-col">
        {/* The rail: a quiet track with the scroll-driven fill over it. */}
        <span aria-hidden className="absolute left-5 sm:left-6 top-5 bottom-5 w-px -translate-x-1/2 bg-border" />
        <span
          ref={fillRef}
          aria-hidden
          className="absolute left-5 sm:left-6 top-5 bottom-5 w-0.5 -translate-x-1/2 bg-accent origin-top"
          style={{ transform: "scaleY(0)" }}
        />
        {/* Your vote, travelling down the rail with the scroll. */}
        <span
          ref={markRef}
          aria-hidden
          className="absolute left-5 sm:left-6 top-5 z-[2] size-3 -mt-1.5 rounded-full bg-accent ring-4 ring-accent/20 opacity-0 transition-opacity duration-300 motion-reduce:hidden"
        />

        {STEPS.map((step, i) => {
          const on = i < reached;
          const newTrack = i === 0 || STEPS[i - 1].track !== step.track;
          return (
            <li key={step.title} data-on={on} className="group relative flex flex-col">
              {newTrack && (
                <span className="pl-14 sm:pl-[4.5rem] pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {TRACK_LABEL[step.track]}
                </span>
              )}
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] sm:grid-cols-[3rem_minmax(0,1fr)] gap-x-4 sm:gap-x-6 pb-10 sm:pb-14">
                <Node step={step} on={on} />
                <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-x-10 gap-y-3 pt-1.5 sm:pt-2.5">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3
                        className={cn(
                          "font-sans font-semibold tracking-normal text-[19px] sm:text-[21px] leading-snug transition-colors duration-300",
                          on ? "text-text" : "text-text-muted",
                        )}
                      >
                        {step.title}
                      </h3>
                      {!step.live && (
                        <span className="text-[11px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm border border-dashed border-muted text-text-muted">
                          Planned
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] text-text-muted">{step.sub}</span>
                    <p className="text-[15px] text-text-secondary leading-relaxed max-w-md mt-1">{step.body}</p>
                  </div>
                  <div className={cn("min-w-0 max-w-md lg:max-w-none", !step.live && "opacity-90")}>
                    {step.demo({ on, example, leaders })}
                  </div>
                </div>
              </div>
            </li>
          );
        })}

        {/* The loop: new voters arrive back at the first step. */}
        <li className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] sm:grid-cols-[3rem_minmax(0,1fr)] gap-x-4 sm:gap-x-6">
          <span className="grid place-items-center">
            <span className="size-3 rounded-full bg-accent" />
          </span>
          <a
            href="#ballot"
            className="w-fit text-sm text-text-secondary hover:text-text transition-colors underline underline-offset-4"
          >
            Back to step one: pick an ask
          </a>
        </li>
      </ol>
    </div>
  );
}

/* ─── Parts ─────────────────────────────────────────────────────────────── */

function Legend() {
  return (
    <div className="flex gap-5 text-[13px] text-text-secondary shrink-0">
      <span className="flex items-center gap-2">
        <span className="size-3.5 rounded-full bg-accent" /> Live
      </span>
      <span className="flex items-center gap-2">
        <span className="size-3.5 rounded-full border border-dashed border-muted" /> Planned
      </span>
    </div>
  );
}

function Node({ step, on }: { step: Step; on: boolean }) {
  return (
    <span
      data-node
      className={cn(
        "relative z-[1] size-10 sm:size-12 rounded-full grid place-items-center transition-[background-color,color,border-color,scale] duration-300 motion-reduce:transition-none",
        step.live
          ? on
            ? "bg-accent text-paper scale-100"
            : "bg-paper text-text-muted border border-border scale-90"
          : on
            ? "bg-paper text-accent border-[1.5px] border-dashed border-accent scale-100"
            : "bg-paper text-text-muted border border-dashed border-muted scale-90",
      )}
    >
      <Icon name={step.icon} className="size-5 sm:size-[22px]" />
    </span>
  );
}

/** A Ballot ID that types itself out, one character at a time. */
function Typed({ on, text }: { on: boolean; text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!on) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    const id = setInterval(() => {
      i = still ? text.length : i + 1;
      setShown(i);
      if (i >= text.length) clearInterval(id);
    }, 45);
    // Switching off rewinds it, so it types again next time it's reached.
    return () => {
      clearInterval(id);
      setShown(0);
    };
  }, [on, text]);

  return (
    <span className="font-mono text-[15px] sm:text-base text-text tracking-wide break-all" aria-label={text}>
      {text.slice(0, shown)}
      <span className={cn("inline-block w-[0.55em] -mb-0.5 h-[1.05em] bg-accent/70 align-baseline", shown >= text.length && "opacity-0")} />
      {/* Keeps the line from changing height as it types. */}
      <span className="invisible">{text.slice(shown)}</span>
    </span>
  );
}

/** Counts a number up from 0 when `on` turns true. */
function useCountUp(on: boolean, to: number, ms = 1200) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const span = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      start ||= now;
      const t = span ? Math.min(1, (now - start) / span) : 1;
      setN(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setN(0);
    };
  }, [on, to, ms]);
  return n;
}

/**
 * The example ask's real count against the threshold, then who it would go
 * to. Offices, not names: officeholders reshuffle, the office doesn't.
 */
function ThresholdDemo({ on, ask }: { on: boolean; ask: Ask }) {
  const target = Math.min(ask.voteCount, DELIVERY_THRESHOLD);
  const n = useCountUp(on, target);
  const reached = ask.voteCount >= DELIVERY_THRESHOLD;
  const offices = ask.responsiblePeople?.map((p) => p.designation) ?? [ask.targetBody];

  return (
    <div className={cn(DEMO_BOX, "flex flex-col gap-2.5")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-text-secondary truncate">{ask.askText}</span>
        <span className="tabular-nums text-text shrink-0">
          {n.toLocaleString("en-IN")} / {DELIVERY_THRESHOLD.toLocaleString("en-IN")}
        </span>
      </div>
      <span className="relative h-1.5 rounded-sm bg-paper overflow-hidden">
        <span
          className="absolute inset-y-0 left-0 bg-accent"
          style={{ width: `${(n / DELIVERY_THRESHOLD) * 100}%` }}
        />
      </span>
      <span className={cn(RISE, "text-text-muted")} style={delay(4)}>
        {reached ? "Sent to" : `${(DELIVERY_THRESHOLD - ask.voteCount).toLocaleString("en-IN")} more and it goes to`}
      </span>
      <ul className="flex flex-col gap-1">
        {offices.slice(0, 3).map((o, i) => (
          <li key={o} className={cn(RISE, "flex items-start gap-2 text-text")} style={delay(5 + i)}>
            <Icon name="send" className="size-3.5 mt-[3px] text-accent shrink-0" />
            <span className="min-w-0">{o}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Delivered / missed / running, as one bar. Made-up shares, labelled so:
 *  nothing has been through a deadline yet. */
function TallyDemo() {
  const parts = [
    { label: "Delivered", pct: 34, bar: "bg-support", text: "text-support-fg" },
    { label: "Missed", pct: 22, bar: "bg-against", text: "text-against-fg" },
    { label: "Still running", pct: 44, bar: "bg-noresponse", text: "text-text-secondary" },
  ];
  return (
    <div className={cn(DEMO_BOX, "flex flex-col gap-2.5")}>
      <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted">Illustration · no deadlines yet</span>
      <div className="flex h-3 rounded-sm overflow-hidden bg-paper">
        {parts.map((p, i) => (
          <span
            key={p.label}
            className={cn(p.bar, "h-full origin-left scale-x-0 transition-transform duration-500 ease-out motion-reduce:transition-none group-data-[on=true]:scale-x-100")}
            style={{ width: `${p.pct}%`, transitionDelay: `${i * 450}ms` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {parts.map((p, i) => (
          <span key={p.label} className={cn(RISE, "flex items-center gap-1.5")} style={delay(i * 3 + 1)}>
            <span className={cn("size-2 rounded-full", p.bar)} />
            <span className={p.text}>{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────────────────────────── */

const ICONS = {
  ask: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M14 3l5 5M14 3v5h5M9 9h2M9 13h4M9 17h1M19 13l-5 5-.5 2.5L16 20l5-5a1.4 1.4 0 0 0-2-2z",
  ballot: "M9 9.5l2 2 4-4M8 4h8v9H8zM4 13h16v7H4z",
  ticket: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6zM15 5v2M15 11v2M15 17v2M7 10h5M7 14h3",
  bars: "M4 20h16M7 20v-6M12 20V6M17 20v-10",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  building: "M3 21h18M5 21v-9M9.5 21v-9M14.5 21v-9M19 21v-9M2 9l10-6 10 6z",
  inspect: "M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l4 4v4M8 8h4M8 12h3M17.5 19.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 22l-2.4-2.4",
  scales: "M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0zM12 3a1 1 0 1 0 0 0",
  phone: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2M9 6h6v6H9z",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  check: "M5 12l5 5L20 7",
} as const;

function Icon({ name, className }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
