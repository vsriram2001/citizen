/*
  Line drawings for the home hero's ask card.

  One small drawing per example ask, in the same grey hand-inked line as the
  ballot illustrations (round caps, one stroke weight). WishToAsk draws the
  current one beside the "Answerable to" line.

  Each drawing sits in a 96×72 box with its ground at y≈62, so they can be
  placed side by side on one ground line.
*/

type Drawing = { paths: string[]; circles?: [number, number, number][] };

export const ASK_DRAWINGS: Record<string, Drawing> = {
  // School, for "Cap annual private school fee hikes"
  "fee-cap": {
    paths: [
      "M14 31 L48 13 L82 31",
      "M20 30 V62 H76 V30",
      "M42 62 V47 H54 V62",
      "M27 37 h9 v8 h-9 z",
      "M60 37 h9 v8 h-9 z",
      "M48 13 V3 h11 l-3 4 l3 4 h-11",
      "M6 62 H90",
    ],
    circles: [[48, 25, 3]],
  },
  // A road from the side: a pothole dipped into it and a cone beside it, for "Repair potholes within 30 days"
  "pothole-sla": {
    paths: [
      "M4 52 H28 q4 0 6 5 q6 6 12 0 q2 -5 6 -5 H92",
      "M4 62 H92",
      "M66 52 L72 32 L78 52",
      "M68.5 44 h7",
    ],
  },
  // A lake with a tree and reeds, for "Stop untreated sewage entering lakes"
  "lake-sewage": {
    paths: [
      "M24 56 q6 -8 30 -7 q30 1 34 6 q2 6 -32 7 q-34 1 -32 -6",
      "M44 56 q4 -3 8 0 q4 3 8 0",
      "M14 62 v-16",
      "M80 49 v-9",
      "M84 49 v-6",
      "M6 62 H92",
    ],
    circles: [[14, 38, 8]],
  },
  // A hospital with a cross sign, for "Raise public health spending"
  "health-spend": {
    paths: [
      "M18 62 V22 H78 V62",
      "M14 22 H82",
      "M39 4 h18 v14 h-18 z",
      "M48 7 v8",
      "M44 11 h8",
      "M42 62 V49 h12 v13",
      "M26 29 h8 v8 h-8 z",
      "M62 29 h8 v8 h-8 z",
      "M26 44 h8 v8 h-8 z",
      "M62 44 h8 v8 h-8 z",
      "M6 62 H90",
    ],
  },
};

/** One ask's drawing. `drawn` false hides the strokes so they can draw in. */
export function AskDrawing({
  id,
  drawn = true,
  className,
}: {
  id: string;
  drawn?: boolean;
  className?: string;
}) {
  const d = ASK_DRAWINGS[id];
  if (!d) return null;
  // pathLength=1 lets one dash value draw any stroke in, whatever its length.
  const stroke = {
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: drawn ? 0 : 1,
    className: "transition-[stroke-dashoffset] duration-[1400ms] ease-out motion-reduce:transition-none",
  };
  return (
    <svg
      viewBox="0 0 96 72"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {d.paths.map((p) => (
        <path key={p} d={p} {...stroke} />
      ))}
      {d.circles?.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} {...stroke} />
      ))}
    </svg>
  );
}
