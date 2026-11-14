"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * The polling-booth moment after the last ballot drops: a hand rises, a
 * marker draws the voter's ink line from the nail across its base onto the
 * skin, and the camera pushes in while the hand dissolves until only the
 * fingertip is left, and that fingertip is the logo.
 *
 * Nothing morphs. Scaled so its arch matches the drawn finger (K), the logo's
 * nail lands within ~2px of the drawn nail and its line weights match the
 * drawing's, so the marker draws the logo's own capsule and the reveal is a
 * zoom, not a transformation.
 *
 * Art: public/ink-hand.png is the hand as a line layer with the index finger
 * cut out above the knuckles (the finger is vector here, traced on the
 * drawing's pixels); public/ink-marker.png is the marker. Sources and the
 * standalone sandbox this was tuned in: docs/assets/ink-*-source.png,
 * docs/ink-mark-preview.html.
 *
 * Why JS and not CSS: path geometry and a moving mask edge animate here, and
 * CSS can't do either in every browser. A frame is plain number interpolation.
 */

export const INK_MARK_ART = ["/ink-hand.png", "/ink-marker.png"];
export const INK_MARK_DURATION = 3.3; // seconds, first frame to settled logo
/** When the logo has landed, for anything that should follow it (a title). */
export const INK_MARK_FORMED_AT = 2.6;

// ─── The logo, placed on the drawn finger ──────────────────────────────────
// Logo coordinates (nav/Logo.tsx) → the hand drawing's pixels. The arch's
// centreline half-width (103.25) becomes the finger's (41).
const K = 41 / 103.25;
const LX = (x: number) => 616 + (x - 171.75) * K;
const LY = (y: number) => 190 + (y - 51) * K;
const map = (pts: number[]) => pts.map((v, i) => (i % 2 ? LY(v) : LX(v)));
const CUT_Y = LY(336); // the logo's open bottom

// Each shape: [mx, my, then 6 numbers per cubic]; drawn and logo versions
// line up point for point. They differ by a pixel or two, which is the point.
const OUTLINE_DRAWN = [
  574.4, CUT_Y,
  574.6, 282.4, 574.8, 261.8, 575, 241.2,
  575, 215, 593, 190, 616, 190,
  639, 190, 657, 215, 657, 241.2,
  657.2, 261.8, 657.4, 282.4, 657.6, CUT_Y,
];
const OUTLINE_LOGO = map([
  68.5, 336,
  68.5, 284, 68.5, 232, 68.5, 180,
  68.5, 116, 114, 51, 171.75, 51,
  229.5, 51, 275, 116, 275, 180,
  275, 232, 275, 284, 275, 336,
]);
const NAIL_DRAWN = [
  600, 196,
  593, 203, 591, 209, 591, 216,
  591, 227, 591, 238, 591, 249,
  591, 260, 602, 269, 615.5, 269,
  629, 269, 640, 260, 640, 249,
  640, 238, 640, 227, 640, 216,
  640, 209, 638, 203, 631, 196,
];
const NAIL_LOGO = map([
  132, 66,
  112, 88, 105.5, 104, 105.5, 124,
  105.5, 150, 105.5, 176, 105.5, 202,
  105.5, 233, 135.2, 257, 171.75, 257,
  208.3, 257, 238, 233, 238, 202,
  238, 176, 238, 150, 238, 124,
  238, 104, 231.5, 88, 211.5, 66,
]);
// The ink is the logo's capsule from the first touch.
const INK = map([171.75, 202.5, 171.75, 278.75]);
const INK_TOP: [number, number] = [INK[0], INK[1]];
const INK_BOT: [number, number] = [INK[2], INK[3]];
const INK_W = 35 * K;
const W = { outline: [10, 28 * K], nail: [7, 17.5 * K] };
// The finger below the logo's bottom edge, which goes with the hand.
const LEG_L = `M574.4 ${CUT_Y}C573 376 571 449 569.5 522`;
const LEG_R = `M657.6 ${CUT_Y}C659.6 376 661.6 449 663.5 522`;

const MARKER_TIP = [285, 1003]; // nib tip in its own image
const MARKER_SCALE = 0.42;

// ─── Easing ────────────────────────────────────────────────────────────────
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const outCubic = (p: number) => 1 - (1 - p) ** 3;
const outExpo = (p: number) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
const inCubic = (p: number) => p ** 3;
const inOutCubic = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const inOutQuint = (p: number) => (p < 0.5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2);
const inOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
const bump = (p: number) => Math.sin(Math.PI * p); // 0 → 1 → 0
// A damped spring from 0 to 1, for a settle that feels physical.
const spring = (p: number) => (p <= 0 ? 0 : 1 - Math.exp(-7 * p) * Math.cos(11 * p));
const mix = (a: number[], b: number[], p: number) => a.map((v, i) => lerp(v, b[i], p));
function toD(a: number[]) {
  const r = (v: number) => Math.round(v * 100) / 100;
  let d = `M${r(a[0])} ${r(a[1])}`;
  for (let i = 2; i < a.length; i += 6) {
    d += `C${r(a[i])} ${r(a[i + 1])} ${r(a[i + 2])} ${r(a[i + 3])} ${r(a[i + 4])} ${r(a[i + 5])}`;
  }
  return d;
}
function quad(a: number[], c: number[], b: number[], p: number): [number, number] {
  return [
    (1 - p) ** 2 * a[0] + 2 * (1 - p) * p * c[0] + p * p * b[0],
    (1 - p) ** 2 * a[1] + 2 * (1 - p) * p * c[1] + p * p * b[1],
  ];
}

// ─── Timeline ──────────────────────────────────────────────────────────────
// 0.00–0.70 hand rises            0.10–1.05 camera drifts to the finger
// 0.45–0.92 marker arcs in        0.92–1.00 hovers, touches down
// 1.00–1.38 ink drawn             1.38–1.68 marker flicks away
// 1.45–1.90 a proud little tilt   1.80–2.60 hand dissolves upward to the logo
// 1.95–2.80 camera pushes in      2.40–2.85 a sheen runs down the wet ink
// 2.70–3.30 settle
const VIEW_W = 1182;
const VIEW_H = 1331;
const CAM = [
  { x: 591, y: 690, s: 1 }, // the whole hand
  { x: 616, y: 330, s: 2.6 }, // the finger, close enough to watch the ink go on
  { x: 616, y: LY(186), s: 4.6 }, // the logo
];

type Attrs = Record<string, string | number>;
type Frame = Record<
  "camera" | "body" | "wipeGrad" | "outline" | "nail" | "ink" | "sheen" | "marker",
  Attrs
>;

function frameAt(t: number): Frame {
  // Camera; scale eased in log space so a big push feels even.
  const c1 = inOutSine(span(t, 0.1, 1.05));
  const c2 = inOutQuint(span(t, 1.95, 2.8));
  const ls = (a: number, b: number, p: number) => Math.exp(lerp(Math.log(a), Math.log(b), p));
  const cx = lerp(lerp(CAM[0].x, CAM[1].x, c1), CAM[2].x, c2);
  const cy = lerp(lerp(CAM[0].y, CAM[1].y, c1), CAM[2].y, c2);
  let s = ls(ls(CAM[0].s, CAM[1].s, c1), CAM[2].s, c2);
  const st = span(t, 2.7, 3.3);
  s *= 1 + 0.045 * (spring(st) - st ** 0.5) * (1 - st);

  // Hand rises; dips as the marker presses; tilts proudly once inked.
  const rise = outExpo(span(t, 0, 0.7));
  const press = 2.2 * bump(span(t, 0.96, 1.12)) + 1 * bump(span(t, 1.36, 1.5));
  const tilt = -1.3 * bump(span(t, 1.45, 1.9));

  // The hand fades out from below. Until the push, the edge sits at the
  // bottom of the frame and only softens the wrist; then it climbs from just
  // under what the camera shows to the logo's open bottom, so the finger
  // thins away instead of looking cut.
  const wipe = span(t, 1.8, 2.6);
  const edge = wipe > 0 ? lerp(706, CUT_Y, inOutSine(wipe)) : VIEW_H;
  const feather = wipe > 0 ? 120 : 260;

  const m = inOutCubic(span(t, 2.0, 2.6)); // drawn finger → exact logo
  const draw = inOutSine(span(t, 1.0, 1.38));
  const front = lerp(INK_TOP[1], INK_BOT[1], draw);
  const sheenP = span(t, 2.4, 2.85);
  const sheenY = lerp(INK_TOP[1] - 40, INK_BOT[1] + 30, inOutSine(sheenP));

  // Marker: arcs in from the top right, hovers, presses, draws, flicks off.
  let tip: [number, number];
  let rot: number;
  let mo: number;
  const hover = [INK_TOP[0] + 4, INK_TOP[1] - 16];
  if (t < 0.92) {
    const p = outCubic(span(t, 0.45, 0.92));
    tip = quad([1060, -180], [980, 260], hover, p);
    rot = lerp(14, 2, p);
    mo = span(t, 0.45, 0.6);
  } else if (t < 1.0) {
    const p = inOutSine(span(t, 0.92, 1.0));
    tip = [lerp(hover[0], INK_TOP[0], p), lerp(hover[1], INK_TOP[1], p)];
    rot = lerp(2, 0, p);
    mo = 1;
  } else if (t < 1.38) {
    tip = [INK_TOP[0], front + press];
    rot = lerp(0, -4, draw);
    mo = 1;
  } else {
    const p = span(t, 1.38, 1.68);
    tip = quad(INK_BOT, [700, 250], [1080, -160], inCubic(p) * 0.85 + p * 0.15);
    rot = lerp(-4, 16, outCubic(p));
    mo = 1 - span(t, 1.55, 1.68);
  }

  return {
    camera: {
      transform: `translate(${VIEW_W / 2} ${VIEW_H / 2}) scale(${s.toFixed(4)}) translate(${-cx.toFixed(2)} ${-cy.toFixed(2)})`,
    },
    body: {
      transform: `translate(0 ${(lerp(110, 0, rise) + press).toFixed(2)}) rotate(${tilt.toFixed(3)} 616 1250)`,
      opacity: span(t, 0, 0.35),
    },
    wipeGrad: { y1: (edge - feather).toFixed(2), y2: edge.toFixed(2) },
    outline: { d: toD(mix(OUTLINE_DRAWN, OUTLINE_LOGO, m)), "stroke-width": lerp(W.outline[0], W.outline[1], m) },
    nail: { d: toD(mix(NAIL_DRAWN, NAIL_LOGO, m)), "stroke-width": lerp(W.nail[0], W.nail[1], m) },
    ink: { d: `M${INK_TOP[0]} ${INK_TOP[1]}L${INK_TOP[0]} ${front}`, opacity: draw > 0 ? 1 : 0 },
    sheen: {
      y: sheenY.toFixed(2),
      opacity: sheenP > 0 && sheenP < 1 ? 0.55 * bump(sheenP) : 0,
      transform: `rotate(-24 ${INK_TOP[0]} ${sheenY.toFixed(2)})`,
    },
    marker: {
      transform: `translate(${tip[0].toFixed(2)} ${tip[1].toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${MARKER_SCALE}) translate(${-MARKER_TIP[0]} ${-MARKER_TIP[1]})`,
      opacity: mo,
    },
  };
}

// ─── Component ─────────────────────────────────────────────────────────────

export function InkMark({
  delay = 0,
  freezeAt,
  onDone,
  className,
}: {
  /** Seconds to wait before the hand appears. */
  delay?: number;
  /** Show one frame and don't play (reduced motion; the /design scrubber). */
  freezeAt?: number;
  onDone?: () => void;
  className?: string;
}) {
  // Two of these can be on a page (the /design scrubber and the overlay), so
  // the mask and clip ids are per instance; colons aren't safe in url(#…).
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const camera = useRef<SVGGElement>(null);
  const body = useRef<SVGGElement>(null);
  const wipeGrad = useRef<SVGLinearGradientElement>(null);
  const outline = useRef<SVGPathElement>(null);
  const nail = useRef<SVGPathElement>(null);
  const ink = useRef<SVGPathElement>(null);
  const sheen = useRef<SVGRectElement>(null);
  const marker = useRef<SVGGElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const els: Record<keyof Frame, SVGElement | null> = {
      camera: camera.current,
      body: body.current,
      wipeGrad: wipeGrad.current,
      outline: outline.current,
      nail: nail.current,
      ink: ink.current,
      sheen: sheen.current,
      marker: marker.current,
    };
    const apply = (f: Frame) => {
      for (const key in f) {
        const el = els[key as keyof Frame];
        const attrs = f[key as keyof Frame];
        if (el) for (const k in attrs) el.setAttribute(k, String(attrs[k]));
      }
    };
    if (freezeAt !== undefined) {
      apply(frameAt(freezeAt));
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(frameAt(INK_MARK_DURATION));
      onDoneRef.current?.();
      return;
    }
    apply(frameAt(0));
    const start = performance.now() + delay * 1000;
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      apply(frameAt(t));
      if (t < INK_MARK_DURATION) raf = requestAnimationFrame(tick);
      else onDoneRef.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [delay, freezeAt]);

  // First paint matches the first frame, before the effect takes over.
  const f0 = frameAt(freezeAt ?? 0);
  const capsule = {
    x: INK_TOP[0] - INK_W / 2,
    y: INK_TOP[1] - INK_W / 2,
    width: INK_W,
    height: INK_BOT[1] - INK_TOP[1] + INK_W,
    rx: INK_W / 2,
  };

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      fill="none"
      aria-hidden="true"
      className={cn("block w-full h-full", className)}
    >
      <defs>
        <clipPath id={`${id}-capsule`}>
          <rect {...capsule} />
        </clipPath>
        <linearGradient
          ref={wipeGrad}
          id={`${id}-wipe-grad`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="0"
          y1={f0.wipeGrad.y1}
          y2={f0.wipeGrad.y2}
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}-wipe`} maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="3200" height="3400">
          <rect x="-1000" y="-1000" width="3200" height="3400" fill={`url(#${id}-wipe-grad)`} />
        </mask>
      </defs>

      <g ref={camera} transform={String(f0.camera.transform)}>
        <g ref={body} transform={String(f0.body.transform)} opacity={f0.body.opacity}>
          {/* Everything that isn't the logo: dissolves as the camera pushes in. */}
          <g mask={`url(#${id}-wipe)`} className="stroke-headline">
            <image href="/ink-hand.png" width={VIEW_W} height={VIEW_H} />
            <path d="M595 394Q616 384 638 395" strokeWidth={7} strokeLinecap="round" />
            <path d={LEG_L} strokeWidth={10} strokeLinecap="round" />
            <path d={LEG_R} strokeWidth={10} strokeLinecap="round" />
          </g>
          {/* The fingertip, which is the logo. */}
          <path
            ref={outline}
            d={String(f0.outline.d)}
            strokeWidth={f0.outline["stroke-width"]}
            className="stroke-headline"
          />
          <path
            ref={nail}
            d={String(f0.nail.d)}
            strokeWidth={f0.nail["stroke-width"]}
            className="stroke-headline"
          />
          <path
            ref={ink}
            d={String(f0.ink.d)}
            opacity={f0.ink.opacity}
            strokeWidth={INK_W}
            strokeLinecap="round"
            className="stroke-brand"
          />
          {/* Fresh ink catching the light as the logo lands. */}
          <rect
            ref={sheen}
            x={INK_TOP[0] - INK_W}
            y={f0.sheen.y}
            width={INK_W * 2}
            height={9}
            opacity={f0.sheen.opacity}
            transform={String(f0.sheen.transform)}
            clipPath={`url(#${id}-capsule)`}
            className="fill-card"
          />
        </g>
        <g ref={marker} transform={String(f0.marker.transform)} opacity={f0.marker.opacity}>
          <image href="/ink-marker.png" width={1254} height={1254} />
        </g>
      </g>
    </svg>
  );
}
