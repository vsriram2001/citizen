"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { DELIVERY_THRESHOLD, DELIVERY_THRESHOLD_LABEL, shortVotes } from "@/components/home/threshold";

/*
  Three candidate replacements for the home page's linear SystemFlow, shown
  side by side on /design/system-flow so the owner can pick one. Each tells
  the same story (ask, three votes, sealed, then receipt / pressure / spread)
  as a diagram rather than a list. The home page runs VoteStream ("what
  happens to my vote") and LoopWheel ("how the whole thing keeps going")
  together for now; FlowMap is only on the options page.

  All three keep the same honesty rule: planned parts are dashed. Moving
  tokens are hidden under reduced motion, leaving a still diagram.
*/

/* ─── Shared ────────────────────────────────────────────────────────────── */

const PATHS = {
  ask: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M14 3l5 5M14 3v5h5M9 9h2M9 13h4M9 17h1M19 13l-5 5-.5 2.5L16 20l5-5a1.4 1.4 0 0 0-2-2z",
  ballot: "M9 9.5l2 2 4-4M8 4h8v9H8zM4 13h16v7H4z",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4M12 15v2",
  ticket: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6zM15 5v2M15 11v2M15 17v2M7 10h5M7 14h3",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5",
  bars: "M4 20h16M7 20v-6M12 20V6M17 20v-10",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",
  building: "M3 21h18M5 21v-9M9.5 21v-9M14.5 21v-9M19 21v-9M2 9l10-6 10 6z",
  inspect: "M13 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l4 4v4M8 8h4M8 12h3M17.5 19.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 22l-2.4-2.4",
  scales: "M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z",
  phone: "M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2",
  chat: "M3 5h12v8H8l-3 3v-3H3zM15 9h6v8h-2v3l-3-3h-5v-4",
  userplus: "M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21a7 7 0 0 1 14 0M19 8v6M16 11h6",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  arrow: "M5 12h14M13 6l6 6-6 6",
} as const;
type IconName = keyof typeof PATHS;

/** An icon placed inside an SVG, centred on (x, y). */
function SvgIcon({ name, x, y, size = 22, className }: { name: IconName; x: number; y: number; size?: number; className?: string }) {
  return (
    <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A dot that runs along `path` once per `period` seconds, starting `start`
 * seconds into the cycle and taking `len` seconds. Hidden outside its run,
 * so tokens hand over from one edge to the next.
 */
function Token({ path, start, len, period, hollow, r = 5 }: { path: string; start: number; len: number; period: number; hollow?: boolean; r?: number }) {
  const f = len / period;
  return (
    <circle
      r={r}
      opacity={0}
      className={hollow ? "fill-paper stroke-accent" : "fill-accent"}
      strokeWidth={hollow ? 2 : 0}
    >
      <animateMotion dur={`${period}s`} begin={`${start}s`} repeatCount="indefinite" path={path} keyPoints="0;1;1" keyTimes={`0;${f};1`} calcMode="linear" />
      <animate attributeName="opacity" dur={`${period}s`} begin={`${start}s`} repeatCount="indefinite" values="1;0" keyTimes={`0;${f}`} calcMode="discrete" />
    </circle>
  );
}

const Legend = () => (
  <div className="flex gap-5 text-[13px] text-text-secondary">
    <span className="flex items-center gap-2"><span className="size-3.5 rounded-full bg-accent" /> Live</span>
    <span className="flex items-center gap-2"><span className="size-3.5 rounded-full border border-dashed border-muted" /> Planned</span>
  </div>
);

/* ─── A · Flow map ──────────────────────────────────────────────────────── */

/*
  The owner's slide, made to move: one trunk that splits three ways at the
  seal, with votes flowing along every arrow in order and each stop pulsing
  as a vote arrives. Wide by nature, so phones pan it sideways inside its own
  box rather than shrinking the labels to nothing.
*/

type MapNode = { id: string; c: number; r: number; title: string; sub: string; icon: IconName; live: boolean; at: number };

const MAP_NODES: MapNode[] = [
  { id: "ask", c: 0, r: 1, title: "Pick or write", sub: "An ask, measurable", icon: "ask", live: true, at: 0 },
  { id: "vote", c: 1, r: 1, title: "Cast 3 votes", sub: "3 a year, locked", icon: "ballot", live: true, at: 1 },
  { id: "seal", c: 2, r: 1, title: "Sealed", sub: "Public ledger", icon: "lock", live: true, at: 2 },
  { id: "ballot", c: 3, r: 0, title: "Ballot ID", sub: "Yearly receipt", icon: "ticket", live: true, at: 3 },
  { id: "verify", c: 4, r: 0, title: "Verify page", sub: "Check it’s intact", icon: "shield", live: true, at: 4 },
  { id: "totals", c: 3, r: 1, title: "Public totals", sub: "Ranks priorities", icon: "bars", live: true, at: 3 },
  { id: "sent", c: 4, r: 1, title: "Sent to officials", sub: `Once it hits ${DELIVERY_THRESHOLD_LABEL}`, icon: "send", live: false, at: 4 },
  { id: "respond", c: 5, r: 1, title: "They respond", sub: "Endorse, decline", icon: "building", live: false, at: 5 },
  { id: "check", c: 6, r: 1, title: "Delivery check", sub: "Vs official data", icon: "inspect", live: false, at: 6 },
  { id: "tally", c: 7, r: 1, title: "Public tally", sub: "Promised vs done", icon: "scales", live: false, at: 7 },
  { id: "share", c: 3, r: 2, title: "Share card", sub: "For social media", icon: "phone", live: true, at: 3 },
  { id: "network", c: 4, r: 2, title: "Your network", sub: "Person to person", icon: "chat", live: true, at: 4 },
  { id: "new", c: 5, r: 2, title: "New voters", sub: "The loop restarts", icon: "userplus", live: true, at: 5 },
];

const MAP_EDGES: [string, string, string?][] = [
  ["ask", "vote"],
  ["vote", "seal"],
  ["seal", "ballot"],
  ["seal", "totals"],
  ["seal", "share"],
  ["ballot", "verify"],
  ["totals", "sent", `${DELIVERY_THRESHOLD_LABEL} votes`],
  ["sent", "respond"],
  ["respond", "check"],
  ["check", "tally"],
  ["share", "network"],
  ["network", "new"],
];

const MX = 96, MY = 92, COL = 132, ROW = 140, NR = 27, PERIOD = 9;
const mp = (c: number, r: number) => [MX + c * COL, MY + r * ROW] as const;
const line = (pts: (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

export function FlowMap() {
  const byId = Object.fromEntries(MAP_NODES.map((n) => [n.id, n]));
  const tracks = [
    { r: 0, label: "Your receipt" },
    { r: 1, label: "The pressure" },
    { r: 2, label: "The spread" },
  ];
  // The loop: from new voters, under everything, back round to the start.
  const loopPath = line([mp(5, 2), mp(5.5, 2), mp(5.5, 2.68), mp(-0.58, 2.68), mp(-0.58, 1), mp(0, 1)]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
        <svg viewBox="0 0 1100 490" className="w-full min-w-[860px] h-auto" role="img" aria-label="How a vote moves through Citizen Poll">
          {tracks.map((t) => (
            <text key={t.r} x={MX + 3 * COL - NR} y={MY + t.r * ROW - NR - 14} className="fill-text-muted text-[11px] font-semibold tracking-[0.18em] uppercase">
              {t.label}
            </text>
          ))}

          {/* Loop back to the start */}
          <path d={loopPath} fill="none" className="stroke-muted" strokeWidth={1.5} strokeDasharray="2 5" />

          {MAP_EDGES.map(([a, b, label]) => {
            const A = byId[a], B = byId[b];
            const live = A.live && B.live;
            const pts =
              A.r === B.r ? [mp(A.c, A.r), mp(B.c, B.r)] : [mp(A.c, A.r), mp(A.c + 0.5, A.r), mp(A.c + 0.5, B.r), mp(B.c, B.r)];
            const [x1, y1] = mp(A.c, A.r);
            return (
              <g key={a + b}>
                <path d={line(pts)} fill="none" className={live ? "stroke-accent" : "stroke-muted"} strokeWidth={live ? 2 : 1.5} strokeDasharray={live ? undefined : "6 6"} />
                {label && (
                  <text x={x1 + COL / 2} y={y1 - 9} textAnchor="middle" className="fill-text-secondary text-[11px] font-semibold">
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          <g className="motion-reduce:hidden">
            {MAP_EDGES.map(([a, b]) => {
              const A = byId[a], B = byId[b];
              const pts =
                A.r === B.r ? [mp(A.c, A.r), mp(B.c, B.r)] : [mp(A.c, A.r), mp(A.c + 0.5, A.r), mp(A.c + 0.5, B.r), mp(B.c, B.r)];
              return <Token key={a + b} path={line(pts)} start={A.at} len={1} period={PERIOD} hollow={!(A.live && B.live)} />;
            })}
            <Token path={loopPath} start={6} len={PERIOD - 6} period={PERIOD} r={4} />
          </g>

          {MAP_NODES.map((n) => {
            const [x, y] = mp(n.c, n.r);
            return (
              <g key={n.id}>
                {/* Pulse as a vote arrives */}
                <circle cx={x} cy={y} r={NR} fill="none" className="stroke-accent motion-reduce:hidden" strokeWidth={2} opacity={0}>
                  <animate attributeName="r" values={`${NR};${NR + 13};${NR + 13}`} keyTimes="0;0.09;1" dur={`${PERIOD}s`} begin={`${n.at}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0;0" keyTimes="0;0.09;1" dur={`${PERIOD}s`} begin={`${n.at}s`} repeatCount="indefinite" />
                </circle>
                <circle
                  cx={x}
                  cy={y}
                  r={NR}
                  className={n.live ? "fill-accent" : "fill-paper stroke-muted"}
                  strokeWidth={n.live ? 0 : 1.5}
                  strokeDasharray={n.live ? undefined : "4 4"}
                />
                <SvgIcon name={n.icon} x={x} y={y} className={n.live ? "text-paper" : "text-accent"} />
                <text x={x} y={y + NR + 20} textAnchor="middle" className="fill-text text-[14px] font-semibold">
                  {n.title}
                </text>
                <text x={x} y={y + NR + 37} textAnchor="middle" className="fill-text-muted text-[12px]">
                  {n.sub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="sm:hidden text-[12px] text-text-muted">Swipe the diagram to follow it →</p>
    </div>
  );
}

/* ─── B · Loop wheel ────────────────────────────────────────────────────── */

/*
  The same steps as a circle, because it is one: new voters bring the next
  round of votes. A vote travels the ring and the step it reaches is
  explained beside it. Compact, and it fits a phone without panning. Tap a
  stop to jump; it pauses while a pointer is over it. Once someone taps a
  stop or Back / Next, it stops for good: they are reading at their own pace.
*/

const WHEEL: { title: string; word: string; body: string; icon: IconName; live: boolean; art: React.ReactNode }[] = [
  { title: "Pick or write an ask", word: "Ask", body: "Back an ask that's here, or write one. Vague wishes don't count: it needs a number, a date and a name.", icon: "ask", live: true, art: <ArtAsk /> },
  { title: "Cast 3 votes", word: "Vote", body: "Three a year. You can't back everything, so what you back counts.", icon: "ballot", live: true, art: <ArtVotes /> },
  { title: "Sealed, with a Ballot ID", word: "Seal", body: "Your votes are sealed into a public ledger. Your Ballot ID is the receipt: check it any time.", icon: "ticket", live: true, art: <ArtBallotId /> },
  { title: "Public totals", word: "Rank", body: "Live counts rank what people want most.", icon: "bars", live: true, art: <ArtTotals /> },
  { title: `Sent at ${DELIVERY_THRESHOLD_LABEL} votes`, word: "Send", body: `Once an ask crosses ${DELIVERY_THRESHOLD_LABEL} votes, it goes to the officials it names, local first.`, icon: "send", live: false, art: <ArtSent /> },
  { title: "They respond", word: "Answer", body: "Endorse, decline or stay silent. Every answer is shown on the ask.", icon: "building", live: false, art: <ArtRespond /> },
  { title: "Delivery check", word: "Check", body: "On the deadline, the target is checked against official data. Yes or no.", icon: "inspect", live: false, art: <ArtCheck /> },
  { title: "Public tally", word: "Tally", body: "Delivered, missed, still running: one public record for the next election.", icon: "scales", live: false, art: <ArtTally /> },
  { title: "Share, bring others", word: "Share", body: `Share your three. New voters push asks towards ${DELIVERY_THRESHOLD_LABEL}, and the loop goes round again.`, icon: "userplus", live: true, art: <ArtShare /> },
];

const WC = 200, WR = 150;
/** Time on each stop while it plays by itself: long enough to read the sentence. */
const WHEEL_MS = 5500;
const wheelAt = (i: number) => {
  const a = ((-90 + (i * 360) / WHEEL.length) * Math.PI) / 180;
  return [WC + WR * Math.cos(a), WC + WR * Math.sin(a)] as const;
};

export function LoopWheel() {
  // Counts up forever so the token always moves clockwise, even when wrapping.
  const [turn, setTurn] = useState(0);
  const [held, setHeld] = useState(false);
  const [manual, setManual] = useState(false);
  // Waits until it's on screen, so people arrive at step 1, not mid-loop.
  const [seen, setSeen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const n = WHEEL.length;
  const active = ((turn % n) + n) % n;
  const step = WHEEL[active];

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.4 });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (held || manual || !seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => setTurn((t) => t + 1), WHEEL_MS);
    return () => clearTimeout(id);
  }, [turn, held, manual, seen]);

  const jump = (i: number) => {
    setManual(true);
    setTurn((t) => t + ((i - (t % n) + n) % n));
  };
  const step_ = (d: number) => {
    setManual(true);
    setTurn((t) => t + d);
  };

  const arrow = (d: number) => (
    <button
      type="button"
      onClick={() => step_(d)}
      aria-label={d < 0 ? "Previous step" : "Next step"}
      className="shrink-0 size-10 grid place-items-center rounded-sm border border-border bg-card text-text-secondary hover:text-text hover:border-accent/50 transition-colors"
    >
      <HIcon name="arrow" className={cn("size-4", d < 0 && "rotate-180")} />
    </button>
  );

  return (
    <div
      ref={boxRef}
      className="grid md:grid-cols-[auto_minmax(0,1fr)] gap-4 md:gap-12 lg:gap-20 items-center"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
    >
      <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-4">
        <span className="md:hidden contents">{arrow(-1)}</span>
        <svg viewBox="0 0 400 400" className="w-full max-w-[240px] max-[359px]:max-w-[200px] sm:max-w-[300px] md:max-w-[380px] lg:max-w-[460px] h-auto min-w-0 md:w-[380px] lg:w-[460px]" role="img" aria-label="The Citizen Poll loop">
          {WHEEL.map((s, i) => {
            const [x1, y1] = wheelAt(i);
            const [x2, y2] = wheelAt(i + 1);
            const live = s.live && WHEEL[(i + 1) % n].live;
            const loop = i === n - 1;
            return (
              <path
                key={i}
                d={`M${x1} ${y1} A${WR} ${WR} 0 0 1 ${x2} ${y2}`}
                fill="none"
                className={live && !loop ? "stroke-accent" : "stroke-muted"}
                strokeWidth={live && !loop ? 2.5 : 2}
                strokeDasharray={loop ? "2 6" : live ? undefined : "7 7"}
              />
            );
          })}

          {/* Your vote, riding the ring */}
          <g
            className="transition-transform duration-1000 ease-in-out motion-reduce:transition-none"
            style={{ transform: `rotate(${(turn * 360) / n}deg)`, transformOrigin: `${WC}px ${WC}px` }}
          >
            <circle cx={WC} cy={WC - WR} r={38} className="fill-none stroke-accent/30" strokeWidth={7} />
          </g>

          {WHEEL.map((s, i) => {
            const [x, y] = wheelAt(i);
            const on = i === active;
            return (
              <g key={s.title} onClick={() => jump(i)} className="cursor-pointer">
                {/* Bigger invisible target: the stops are small on a phone. */}
                <circle cx={x} cy={y} r={40} fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={28}
                  className={cn(
                    "transition-colors duration-300",
                    s.live ? (on ? "fill-accent" : "fill-accent/75") : on ? "fill-card stroke-accent" : "fill-paper stroke-muted",
                  )}
                  strokeWidth={s.live ? 0 : on ? 2.5 : 2}
                  strokeDasharray={s.live ? undefined : "5 5"}
                />
                <SvgIcon name={s.icon} x={x} y={y} size={26} className={s.live ? "text-paper" : "text-accent"} />
              </g>
            );
          })}

          <text x={WC} y={WC - 30} textAnchor="middle" className="fill-text-muted text-[22px] font-semibold tracking-[0.14em] uppercase">
            {active + 1} of {n}
          </text>
          {/* key: remounts so the word fades in fresh on each step. */}
          <text
            key={active}
            x={WC}
            y={WC + 34}
            textAnchor="middle"
            className="fill-headline font-display text-[64px] font-black animate-[wheel-word_400ms_ease-out] motion-reduce:animate-none"
          >
            {step.word}
          </text>
        </svg>
        <span className="md:hidden contents">{arrow(1)}</span>
      </div>

      <div className="flex flex-col gap-2 sm:gap-3 min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-sans tracking-normal font-semibold text-[19px] sm:text-[22px] lg:text-[28px] leading-snug text-text">{step.title}</h3>
          {!step.live && (
            <span className="text-[11px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm border border-dashed border-muted text-text-muted">
              Planned
            </span>
          )}
        </div>
        <p role="status" className="text-[14px] sm:text-[15px] lg:text-[17px] text-text-secondary leading-relaxed max-w-lg min-h-[3em]">
          {step.body}
        </p>
        {/* Fixed height so the page doesn't jump between steps. */}
        <div className="min-h-[8.25rem] mt-1" aria-hidden>
          <Replay key={active}>{step.art}</Replay>
        </div>
        <div className="hidden md:flex items-center gap-2 mt-2">
          {arrow(-1)}
          {arrow(1)}
        </div>
      </div>
    </div>
  );
}

/* Step illustrations: small, made-up examples that play when their step
   comes up. Each sits in <Replay>, which remounts per step, so they replay. */

/** Switches its children's group on a frame after mounting, so CSS
 *  transitions keyed off data-on run from their start state. */
function Replay({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(f);
  }, []);
  return (
    <div data-on={on} className="group">
      {children}
    </div>
  );
}

const ART = "rounded-card border border-border bg-card p-3.5 lg:p-4 text-[13px] lg:text-[14px] w-full max-w-md lg:max-w-lg";
const RISE =
  "transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none opacity-0 translate-y-1.5 group-data-[on=true]:opacity-100 group-data-[on=true]:translate-y-0";
const GROW_X =
  "origin-left scale-x-0 transition-transform duration-700 ease-out motion-reduce:transition-none group-data-[on=true]:scale-x-100";
const after = (n: number) => ({ transitionDelay: `${n * 140}ms` });
const TAG = "text-[10px] uppercase tracking-[0.14em] text-text-muted";

function HIcon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArtAsk() {
  return (
    <div className={cn(ART, "flex flex-col gap-1.5")}>
      <span className="flex items-center gap-2 min-w-0">
        <span className="relative text-text-muted shrink-0">
          Fix the roads
          {/* The wish is struck through as the ask replaces it. */}
          <span className={cn("absolute left-0 right-0 top-1/2 h-px bg-text-muted", GROW_X)} style={after(1)} />
        </span>
        <HIcon name="arrow" className={cn(RISE, "size-3.5 text-accent shrink-0")} />
        <span className={cn(RISE, TAG)} style={after(3)}>becomes an ask</span>
      </span>
      <p className={cn(RISE, "font-semibold text-[15px] leading-snug text-text")} style={after(4)}>
        Fix reported potholes within 30 days
      </p>
      <span className={cn(RISE, "flex flex-wrap items-center gap-1.5")} style={after(6)}>
        <span className="px-2 py-0.5 rounded-sm border border-border bg-paper text-text-secondary">No deadline</span>
        <HIcon name="arrow" className="size-3.5 text-accent" />
        <span className="px-2 py-0.5 rounded-sm border border-accent/40 bg-accent/10 text-text font-semibold">30 days</span>
      </span>
      <span className={cn(RISE, "flex flex-wrap gap-x-4 gap-y-1 text-text-secondary")} style={after(8)}>
        <span className="flex items-center gap-1.5">
          <HIcon name="calendar" className="size-3.5 text-accent" /> By Jun 2027
        </span>
        <span className="flex items-center gap-1.5">
          <HIcon name="building" className="size-3.5 text-accent" /> City municipal body
        </span>
      </span>
    </div>
  );
}

function ArtVotes() {
  return (
    <div className={cn(ART, "flex items-center gap-3")}>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="relative size-8 rounded-sm border border-border bg-paper overflow-hidden">
            <span
              className="absolute inset-0 bg-accent origin-bottom scale-y-0 transition-transform duration-300 ease-out motion-reduce:transition-none group-data-[on=true]:scale-y-100"
              style={{ transitionDelay: `${150 + i * 300}ms` }}
            />
          </span>
        ))}
      </div>
      <div className="flex flex-col">
        <span className={cn(RISE, "text-text font-semibold")} style={after(7)}>3 of 3 cast</span>
        <span className={cn(RISE, "text-text-muted")} style={after(8)}>Locked until next year</span>
      </div>
    </div>
  );
}

function ArtBallotId() {
  return (
    <div className={cn(ART, "flex flex-col gap-2")}>
      <span className={TAG}>Your Ballot ID · example</span>
      <span className="flex items-center gap-2">
        <HIcon name="lock" className="size-4 text-accent shrink-0" />
        {/* Types out: max-width steps open one character at a time. */}
        <span className="font-mono text-[15px] text-text overflow-hidden whitespace-nowrap max-w-0 group-data-[on=true]:max-w-[19ch] transition-[max-width] duration-[1100ms] ease-[steps(19)] motion-reduce:transition-none">
          CP26-7KQ4M-R2XWD-H8
        </span>
      </span>
      <span className={cn(RISE, "flex items-center gap-1.5 text-support-fg")} style={after(9)}>
        <HIcon name="shield" className="size-4" /> Checked on the verify page: intact
      </span>
    </div>
  );
}

function ArtTotals() {
  const rows = [
    ["Fix potholes", 142],
    ["Double city buses", 76],
    ["Publish police data", 31],
  ] as const;
  return (
    <ol className={cn(ART, "flex flex-col gap-2")}>
      {rows.map(([label, v], i) => (
        <li key={label} className="flex flex-col gap-1">
          <span className="flex justify-between gap-3">
            <span className="text-text-secondary">{i + 1}. {label}</span>
            <span className="text-text tabular-nums">{v}</span>
          </span>
          <span className="h-1.5 rounded-sm bg-paper overflow-hidden">
            <span className={cn("block h-full bg-accent", GROW_X)} style={{ width: `${(v / 142) * 100}%`, ...after(i + 1) }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function ArtSent() {
  return (
    <div className={cn(ART, "flex flex-col gap-2")}>
      <span className="flex justify-between gap-3">
        <span className="text-text-secondary">Fix potholes</span>
        <span className="text-text tabular-nums font-semibold">
          {DELIVERY_THRESHOLD.toLocaleString("en-IN")} / {DELIVERY_THRESHOLD.toLocaleString("en-IN")}
        </span>
      </span>
      <span className="h-1.5 rounded-sm bg-paper overflow-hidden">
        <span className={cn("block h-full w-full bg-accent", GROW_X)} />
      </span>
      {["City commissioner", "State urban development minister"].map((o, i) => (
        <span key={o} className={cn(RISE, "flex items-center gap-2 text-text")} style={after(5 + i)}>
          <HIcon name="send" className="size-3.5 text-accent shrink-0" /> {o}
        </span>
      ))}
    </div>
  );
}

function ArtRespond() {
  const rows = [
    ["Endorsed", "Commits to the target and date", "bg-support-bg text-support-fg"],
    ["Declined", "Says no, with a reason", "bg-against-bg text-against-fg"],
    ["Silent", "No answer, and that's shown too", "bg-noresponse-bg text-noresponse-fg"],
  ];
  return (
    <ul className={cn(ART, "flex flex-col gap-1.5")}>
      {rows.map(([label, note, tone], i) => (
        <li key={label} className={cn(RISE, "flex items-center gap-3")} style={after(i * 2)}>
          <span className={cn("text-xs px-2 py-0.5 rounded-sm w-20 shrink-0 text-center", tone)}>{label}</span>
          <span className="text-text-secondary min-w-0">{note}</span>
        </li>
      ))}
    </ul>
  );
}

function ArtCheck() {
  return (
    <div className={cn(ART, "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 items-center")}>
      <span className={cn(RISE, "text-text-muted")}>Promised</span>
      <span className={cn(RISE, "text-text")}>Repaired within 30 days</span>
      <span className={cn(RISE, "text-text-muted")} style={after(2)}>Official data</span>
      <span className={cn(RISE, "text-text-secondary")} style={after(2)}>Average repair: 41 days</span>
      <span className={cn(RISE, "text-text-muted")} style={after(5)}>Result</span>
      <span className={cn(RISE)} style={after(5)}>
        <span className="text-xs px-2 py-0.5 rounded-sm bg-against-bg text-against-fg">Missed</span>
      </span>
    </div>
  );
}

function ArtTally() {
  const parts = [
    ["Delivered", 34, "bg-support"],
    ["Missed", 22, "bg-against"],
    ["Still running", 44, "bg-noresponse"],
  ] as const;
  return (
    <div className={cn(ART, "flex flex-col gap-2")}>
      <span className={TAG}>Illustration</span>
      <div className="flex h-3 rounded-sm overflow-hidden bg-paper">
        {parts.map(([label, pct, bar], i) => (
          <span key={label} className={cn("h-full", bar, GROW_X)} style={{ width: `${pct}%`, transitionDelay: `${i * 400}ms` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {parts.map(([label, pct, bar], i) => (
          <span key={label} className={cn(RISE, "flex items-center gap-1.5 text-text-secondary")} style={after(i * 3 + 1)}>
            <span className={cn("size-2 rounded-full", bar)} /> {pct} {label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function ArtShare() {
  return (
    <div className={cn(ART, "flex items-center gap-3")}>
      <div className="flex -space-x-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="size-8 rounded-full border-2 border-card bg-accent/15 text-accent grid place-items-center transition-[opacity,scale] duration-300 motion-reduce:transition-none opacity-0 scale-50 group-data-[on=true]:opacity-100 group-data-[on=true]:scale-100"
            style={{ transitionDelay: `${i * 160}ms` }}
          >
            <HIcon name="userplus" className="size-4" />
          </span>
        ))}
      </div>
      <span className={cn(RISE, "text-text-secondary")} style={after(6)}>
        5 friends vote · the loop starts again ↺
      </span>
    </div>
  );
}

/* ─── C · Vote stream ───────────────────────────────────────────────────── */

/*
  Literally "what happens to my vote": dots leave voters, pour into asks, and
  the one that crosses the threshold line (1 lakh) flows on to the officials it names, their
  answers, the deadline check and the tally. Runs top to bottom, so the same
  drawing works on a phone and a desktop. Numbers are made up and say so.
*/

const SW = 320;
// Three asks as buckets that fill with votes; the threshold line runs across them.
const BUCKETS = [
  { x: 60, lines: ["Pothole fix", "in 30 days"], votes: 142_000 },
  { x: 160, lines: ["Double the", "bus fleet"], votes: 76_000 },
  { x: 260, lines: ["Publish police", "complaint data"], votes: 31_000 },
];
const B_TOP = 120, B_BOT = 250, B_W = 52, MAX = 150_000;
const level = (v: number) => B_BOT - ((B_BOT - B_TOP) * Math.min(v, MAX)) / MAX;
const VOTERS = [24, 58, 92, 126, 160, 194, 228, 262, 296];
// Which ask each voter's dot pours into: most go to the leader.
const POURS = [0, 0, 1, 0, 2, 0, 1, 0, 1];
const OFFICES = [
  { x: 56, label: "City", sub: "commissioner" },
  { x: 160, label: "Utility", sub: "head" },
  { x: 264, label: "State", sub: "minister" },
];
const ANSWERS = [
  { label: "Endorsed", cls: "fill-support-bg", text: "fill-support-fg" },
  { label: "Declined", cls: "fill-against-bg", text: "fill-against-fg" },
  { label: "Silent", cls: "fill-noresponse-bg", text: "fill-noresponse-fg" },
];
const SP = 8; // seconds per cycle

export function VoteStream() {
  const lead = BUCKETS[0];
  const OFF_Y = 372, ANS_Y = 450, CHK_Y = 526, OUT_Y = 600, TAL_Y = 668;

  const pour = (vx: number, k: number) => {
    const bx = BUCKETS[POURS[k]].x;
    return `M${vx} 50 C${vx} 88 ${bx} 78 ${bx} ${B_TOP - 2}`;
  };
  const toOffice = (ox: number) => `M${lead.x} 310 C${lead.x} 340 ${ox} 326 ${ox} ${OFF_Y - 18}`;
  const toAnswer = (ox: number) => `M${ox} ${OFF_Y + 18} L${ox} ${ANS_Y - 13}`;
  const toCheck = (ox: number) => `M${ox} ${ANS_Y + 13} C${ox} ${CHK_Y - 30} ${SW / 2} ${CHK_Y - 40} ${SW / 2} ${CHK_Y - 17}`;
  const toOutcome = (ox: number) => `M${SW / 2} ${CHK_Y + 17} C${SW / 2} ${OUT_Y - 30} ${ox} ${OUT_Y - 40} ${ox} ${OUT_Y - 13}`;
  const DASH = "5 5";
  const threshold = level(DELIVERY_THRESHOLD);

  return (
    <svg viewBox={`0 0 ${SW} 712`} className="w-full max-w-[440px] h-auto mx-auto" role="img" aria-label="Votes flowing from voters into asks, then to officials, a deadline check and a public tally">
      <text x={SW / 2} y={14} textAnchor="middle" className="fill-text-muted text-[10px] font-semibold tracking-[0.16em] uppercase">
        Everyone casting their three
      </text>
      {VOTERS.map((x) => (
        <SvgIcon key={x} name="userplus" x={x} y={34} size={20} className="text-accent" />
      ))}
      {VOTERS.map((x, k) => (
        <path key={x} d={pour(x, k)} fill="none" className="stroke-accent/25" strokeWidth={1.25} />
      ))}

      {BUCKETS.map((b, i) => {
        const sent = b.votes >= DELIVERY_THRESHOLD;
        return (
          <g key={b.x}>
            <rect x={b.x - B_W / 2} y={B_TOP} width={B_W} height={B_BOT - B_TOP} rx={3} className="fill-card stroke-border" />
            <rect x={b.x - B_W / 2} y={level(b.votes)} width={B_W} height={B_BOT - level(b.votes)} rx={3} className="fill-accent" />
            <text x={b.x} y={B_BOT - 8} textAnchor="middle" className="fill-paper text-[12px] font-semibold tabular-nums">
              {shortVotes(b.votes)}
            </text>
            {b.lines.map((l, j) => (
              <text key={l} x={b.x} y={268 + j * 14} textAnchor="middle" className="fill-text text-[11px] font-semibold">{l}</text>
            ))}
            <text x={b.x} y={300} textAnchor="middle" className={cn("text-[11px]", sent ? "fill-accent font-semibold" : "fill-text-muted")}>
              {sent ? "Sent ↓" : `${shortVotes(DELIVERY_THRESHOLD - b.votes)} to go`}
            </text>
            <title>{`Ask ${i + 1}: ${b.votes.toLocaleString("en-IN")} votes`}</title>
          </g>
        );
      })}
      <line x1={16} x2={SW - 16} y1={threshold} y2={threshold} className="stroke-text" strokeWidth={1.25} strokeDasharray="3 3" />
      <text x={SW - 16} y={threshold - 5} textAnchor="end" className="fill-text text-[10px] font-semibold">{DELIVERY_THRESHOLD_LABEL} votes</text>

      {/* Planned from here down: dashed */}
      {OFFICES.map((o) => (
        <g key={o.label}>
          <path d={toOffice(o.x)} fill="none" className="stroke-muted" strokeWidth={1.25} strokeDasharray={DASH} />
          <path d={toAnswer(o.x)} fill="none" className="stroke-muted" strokeWidth={1.25} strokeDasharray={DASH} />
          <path d={toCheck(o.x)} fill="none" className="stroke-muted" strokeWidth={1.25} strokeDasharray={DASH} />
        </g>
      ))}
      {[96, 224].map((x) => (
        <path key={x} d={toOutcome(x)} fill="none" className="stroke-muted" strokeWidth={1.25} strokeDasharray={DASH} />
      ))}

      {OFFICES.map((o) => (
        <g key={o.label}>
          <rect x={o.x - 44} y={OFF_Y - 18} width={88} height={36} rx={6} className="fill-paper stroke-muted" strokeDasharray="4 4" />
          <text x={o.x} y={OFF_Y - 3} textAnchor="middle" className="fill-text text-[11px] font-semibold">{o.label}</text>
          <text x={o.x} y={OFF_Y + 11} textAnchor="middle" className="fill-text-muted text-[10px]">{o.sub}</text>
        </g>
      ))}

      {ANSWERS.map((a, i) => (
        <g key={a.label}>
          <rect x={OFFICES[i].x - 36} y={ANS_Y - 13} width={72} height={26} rx={3} className={a.cls} />
          <text x={OFFICES[i].x} y={ANS_Y + 4} textAnchor="middle" className={cn(a.text, "text-[11px]")}>{a.label}</text>
        </g>
      ))}

      <rect x={SW / 2 - 92} y={CHK_Y - 17} width={184} height={34} rx={6} className="fill-paper stroke-muted" strokeDasharray="4 4" />
      <SvgIcon name="inspect" x={SW / 2 - 72} y={CHK_Y} size={16} className="text-accent" />
      <text x={SW / 2 + 8} y={CHK_Y + 4} textAnchor="middle" className="fill-text text-[11px] font-semibold">Deadline vs official data</text>

      {[
        { x: 96, label: "Delivered", cls: "fill-support-bg", text: "fill-support-fg" },
        { x: 224, label: "Missed", cls: "fill-against-bg", text: "fill-against-fg" },
      ].map((o) => (
        <g key={o.label}>
          <rect x={o.x - 40} y={OUT_Y - 13} width={80} height={26} rx={3} className={o.cls} />
          <text x={o.x} y={OUT_Y + 4} textAnchor="middle" className={cn(o.text, "text-[11px] font-semibold")}>{o.label}</text>
        </g>
      ))}
      <path d={`M96 ${OUT_Y + 13} L96 ${TAL_Y - 22} M224 ${OUT_Y + 13} L224 ${TAL_Y - 22}`} className="stroke-muted" strokeWidth={1.25} strokeDasharray={DASH} />

      <text x={SW / 2} y={TAL_Y - 8} textAnchor="middle" className="fill-text-muted text-[10px] font-semibold tracking-[0.16em] uppercase">
        Public tally · illustration
      </text>
      <rect x={16} y={TAL_Y} width={288 * 0.34} height={10} className="fill-support" />
      <rect x={16 + 288 * 0.34} y={TAL_Y} width={288 * 0.22} height={10} className="fill-against" />
      <rect x={16 + 288 * 0.56} y={TAL_Y} width={288 * 0.44} height={10} className="fill-noresponse" />
      <text x={16} y={TAL_Y + 26} className="fill-text-secondary text-[10px]">34 delivered · 22 missed · 44 still running</text>

      {/* Moving votes */}
      <g className="motion-reduce:hidden">
        {VOTERS.map((x, k) => (
          <Token key={x} path={pour(x, k)} start={(k % 4) * 0.35} len={1.2} period={SP / 2} r={3.5} />
        ))}
        {OFFICES.map((o, i) => (
          <g key={o.label}>
            <Token path={toOffice(o.x)} start={2} len={1.2} period={SP} hollow r={4} />
            <Token path={toAnswer(o.x)} start={3.2} len={0.8} period={SP} hollow r={4} />
            <Token path={toCheck(o.x)} start={4 + i * 0.1} len={1} period={SP} hollow r={4} />
          </g>
        ))}
        <Token path={toOutcome(96)} start={5.2} len={1} period={SP} hollow r={4} />
        <Token path={toOutcome(224)} start={5.2} len={1} period={SP} hollow r={4} />
      </g>
    </svg>
  );
}

export { Legend as FlowLegend };
