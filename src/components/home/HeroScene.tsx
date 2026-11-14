/*
  Home hero background: an Indian city skyline in fine lines.

  Drawn by hand, not generated: an apartment block with a rooftop water tank,
  a clock tower, a domed civic building with a colonnade, glass towers with
  setbacks, a telecom mast, a metro viaduct with a train, coconut palms, and a
  cable-stayed bridge over water. The street is alive: trees sway, a flock
  crosses the sky, buses run (one stops for the people waiting at a stop),
  and people walk the pavement. A metro train runs the viaduct every so
  often, pulls in under a platform canopy at the end of the line, and fades. Earlier takes (random boxes, window grids,
  the ask drawings lined up on a street, lines drawing themselves in) read as
  busy or crude; the ask drawings now live only inside the ballot card.

  Three depths, lighter the further back, each shape filled with the paper
  colour so nearer things hide what's behind them. Hairline strokes at any
  size, in muted grey, never a party colour. Static apart from a slow fade in.

  Phones show a window on the left-middle of the same drawing (the dome, the
  towers and the train), fitted to the width, with a row of slim towers of
  their own behind it that rises up behind the card and the headline.
*/

type Shape = { d: string; fill?: boolean };

const G = 590; // ground

/* Far: tall towers, faintest. */
const FAR: Shape[] = [
  { d: `M80 ${G}V300H130V${G}`, fill: true },
  { d: `M500 ${G}V140H570V${G}`, fill: true },
  { d: "M512 140V118H558V140", fill: true },
  { d: "M535 118V80" },
  { d: `M523 160V${G}M547 160V${G}` },
  { d: `M590 ${G}V230L650 205V${G}`, fill: true },
  { d: `M872 ${G}V170H932V${G}`, fill: true },
  { d: "M882 170V150H922V170", fill: true },
  { d: "M892 150V132H912V150", fill: true },
  { d: `M902 190V${G}` },
  { d: `M1090 ${G}V250H1150V${G}`, fill: true },
  { d: `M1540 ${G}V260H1590V${G}`, fill: true },
  { d: "M1565 260V226" },
];

/* Middle: the landmarks. */
const MID: Shape[] = [
  // apartment block, floors, rooftop water tank
  { d: `M10 ${G}V420H150V${G}`, fill: true },
  { d: "M10 450H150M10 480H150M10 510H150M10 540H150M10 570H150" },
  { d: "M100 420V406H118V420", fill: true },
  // clock tower
  { d: `M190 ${G}V290H226V${G}`, fill: true },
  { d: "M186 290L208 256L230 290Z", fill: true },
  { d: "M208 256V240" },
  { d: "M208 304a9 9 0 1 0 0.01 0M208 307V313H213" },
  // domed civic building: steps, colonnade, drum, dome, lantern
  { d: "M360 390a40 40 0 0 1 40 40H320a40 40 0 0 1 40 -40Z", fill: true },
  { d: "M354 390V376H366V390", fill: true },
  { d: "M360 376V360" },
  { d: "M320 470V430H400V470", fill: true },
  { d: "M330 440V466M345 440V466M360 440V466M375 440V466M390 440V466" },
  { d: `M250 ${G}V470H470V${G}`, fill: true },
  { d: "M250 482H470" },
  { d: `M272 490V${G - 8}M294 490V${G - 8}M316 490V${G - 8}M338 490V${G - 8}M382 490V${G - 8}M404 490V${G - 8}M426 490V${G - 8}M448 490V${G - 8}` },
  { d: `M346 ${G}V530H374V${G}`, fill: true },
  { d: `M238 ${G}H482` },
  // glass towers with bands
  { d: `M680 ${G}V300H740V${G}`, fill: true },
  { d: "M680 340H740M680 380H740M680 420H740" },
  { d: "M710 300V278" },
  { d: `M760 ${G}V340H820V${G}`, fill: true },
  { d: `M790 360V${G}` },
  // telecom mast
  { d: `M1006 ${G}L1030 200L1054 ${G}` },
  { d: "M1011.5 500L1044.8 440M1048.5 500L1015.2 440M1018.9 380L1037.4 320M1041.1 380L1022.6 320" },
  { d: "M1030 200V170M1022 250h16M1024 280h12" },
  // right-hand blocks
  { d: `M1160 ${G}V400H1260V${G}`, fill: true },
  { d: "M1160 430H1260M1160 460H1260M1160 490H1260" },
  { d: "M1230 400V388H1246V400", fill: true },
  { d: `M1280 ${G}V360H1330V${G}`, fill: true },
];

/* Near: metro, bridge, trees. */
function metro(): Shape[] {
  let pillars = "";
  for (let x = 60; x < 1340; x += 160) pillars += `M${x - 7} 512h14M${x} 512V${G}`;
  return [
    { d: pillars },
    { d: "M0 500H1340V512H0Z", fill: true },
  ];
}

/* The train, drawn from x=0 so it can be slid along the viaduct. */
const TRAIN_WINDOWS = Array.from({ length: 11 }, (_, i) => `M${16 + i * 26} 478h14v9h-14z`).join("");
const TRAIN: Shape[] = [
  { d: "M0 498V474q0 -6 8 -6H290q12 0 16 12l3 18Z", fill: true },
  { d: TRAIN_WINDOWS },
  { d: "M2 498H309" },
];

/* A platform canopy at the end of the line, long enough to hold the whole
   train: it pulls in under the roof, waits, and fades, rather than running
   off the end of the viaduct into mid-air. */
const STATION: Shape[] = [
  { d: "M1030 458V500M1180 458V500M1330 458V500" },
  { d: "M1006 458L1024 446H1336L1354 458Z", fill: true },
];

/* A train runs the line every so often: in from the left edge, easing into
   the station, then a pause before the next. Still under reduced motion. */
function Metro() {
  return (
    <g strokeOpacity={0.5}>
      {STATION.map((s, i) => (
        <path key={i} d={s.d} className={s.fill ? "fill-paper" : undefined} vectorEffect="non-scaling-stroke" />
      ))}
      <g className="hero-train">
        {TRAIN.map((s, i) => (
          <path key={i} d={s.d} className={s.fill ? "fill-paper" : undefined} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </g>
  );
}

function bridge(): Shape[] {
  const cables = [1360, 1390, 1420, 1450, 1510, 1540, 1570, 1600].map((x) => `M1480 340L${x} 540`).join("");
  return [
    { d: cables },
    { d: `M1462 ${G}L1480 330L1498 ${G}` },
    { d: "M1468 548H1492" },
    { d: "M1340 540H1600V548H1340Z", fill: true },
    { d: "M1360 570q10 -4 20 0t20 0M1430 578q10 -4 20 0t20 0M1520 570q10 -4 20 0t20 0" },
  ];
}

function tree(x: number, r: number): Shape[] {
  return [
    { d: `M${x} ${G}V${G - r - 10}` },
    { d: `M${x} ${G - r * 2 - 10}a${r} ${r} 0 1 0 0.01 0Z`, fill: true },
  ];
}

function palm(x: number, h: number): Shape[] {
  const tx = x + 4;
  const ty = G - h;
  return [
    { d: `M${x} ${G}q-4 ${-h / 2} 4 ${-h}` },
    {
      d:
        `M${tx} ${ty}q-18 -6 -28 6M${tx} ${ty}q-14 -14 -26 -10M${tx} ${ty}q2 -18 14 -22` +
        `M${tx} ${ty}q18 -6 28 6M${tx} ${ty}q16 -14 28 -6`,
    },
  ];
}

const NEAR: Shape[] = [...metro(), ...bridge(), { d: `M0 ${G}H1340` }];

const SKY: Shape[] = [{ d: "M1220 110a60 60 0 1 0 0.01 0Z" }];

/* ─── The living street ──────────────────────────────────────────────────
   Everything below moves a little: trees in the wind, a flock crossing the
   sky, buses (one stops for the people waiting, who board), and people
   walking. All of it is still under reduced motion. */

function Paths({ shapes }: { shapes: Shape[] }) {
  return shapes.map((s, i) => (
    <path key={i} d={s.d} className={s.fill ? "fill-paper" : undefined} vectorEffect="non-scaling-stroke" />
  ));
}

/** Trees and palms, each swaying from its base at its own pace. */
const TREES: { shapes: Shape[]; dur: number; delay: number }[] = [
  { shapes: palm(170, 70), dur: 5.2, delay: 0 },
  { shapes: tree(488, 14), dur: 4.4, delay: -1.3 },
  { shapes: tree(620, 12), dur: 4.8, delay: -2.1 },
  { shapes: tree(960, 16), dur: 5, delay: -0.6 },
  { shapes: tree(1110, 13), dur: 4.2, delay: -3 },
  { shapes: palm(1300, 80), dur: 5.6, delay: -1.8 },
  { shapes: palm(1332, 64), dur: 4.9, delay: -2.7 },
];

function Trees() {
  return (
    <g strokeOpacity={0.5}>
      {TREES.map((t, i) => (
        <g
          key={i}
          className="hero-sway"
          style={{ animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s` }}
        >
          <Paths shapes={t.shapes} />
        </g>
      ))}
    </g>
  );
}

/** A flock crossing the sky, every bird flapping slightly out of step. */
const FLOCK: [number, number, number][] = [
  [0, 0, 0],
  [22, -10, -0.15],
  [40, 4, -0.3],
  [62, -6, -0.1],
];

function Flock() {
  return (
    <g strokeOpacity={0.45} className="hero-flock">
      {FLOCK.map(([x, y, delay]) => (
        <path
          key={x}
          d={`M${x - 7} ${150 + y}q4 -4 7 1q3 -5 7 -1`}
          className="hero-flap"
          style={{ animationDelay: `${delay}s` }}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

/* A city bus, drawn from x=0 on the road. */
const BUS: Shape[] = [
  { d: `M0 ${G - 6}V${G - 30}q0 -4 5 -4H66q6 0 8 7l2 21Z`, fill: true },
  { d: Array.from({ length: 5 }, (_, i) => `M${6 + i * 11} ${G - 27}h8v8h-8z`).join("") + `M62 ${G - 27}h8v14h-8z` },
  { d: `M0 ${G - 14}H76` },
  { d: `M16 ${G - 4}a4 4 0 1 0 0.01 0ZM58 ${G - 4}a4 4 0 1 0 0.01 0Z`, fill: true },
];

/* A stop under the metro, between two pillars. */
const STOP_X = 744;
const BUS_STOP: Shape[] = [
  { d: `M${STOP_X + 2} ${G}V${G - 34}M${STOP_X + 70} ${G}V${G - 34}` },
  { d: `M${STOP_X - 6} ${G - 34}H${STOP_X + 78}l-4 -5H${STOP_X - 2}Z`, fill: true },
  { d: `M${STOP_X + 84} ${G}V${G - 40}M${STOP_X + 79} ${G - 46}h10v10h-10z` },
];

/** A standing figure, feet at (x, G). */
function person(x: number): Shape[] {
  return [
    { d: `M${x} ${G - 22}a3 3 0 1 0 0.01 0Z`, fill: true },
    { d: `M${x} ${G - 16}V${G - 8}M${x - 4} ${G - 13}L${x} ${G - 15}L${x + 4} ${G - 13}M${x} ${G - 8}L${x - 2} ${G}M${x} ${G - 8}L${x + 2} ${G}` },
  ];
}

/** A walking figure at the origin, legs swinging from the hip. */
function Walker({ dir, dur, delay }: { dir: 1 | -1; dur: number; delay: number }) {
  return (
    <g
      className={dir === 1 ? "hero-walk-right" : "hero-walk-left"}
      style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}
    >
      <g transform={`translate(0 ${G}) scale(${dir} 1)`}>
        <path d="M0 -22a3 3 0 1 0 0.01 0Z" className="fill-paper" vectorEffect="non-scaling-stroke" />
        <path d="M0 -16V-8M-3 -12L0 -15L3 -11" vectorEffect="non-scaling-stroke" />
        <path d="M0 -8V0" className="hero-leg" vectorEffect="non-scaling-stroke" />
        <path d="M0 -8V0" className="hero-leg hero-leg-b" vectorEffect="non-scaling-stroke" />
      </g>
    </g>
  );
}

function Street() {
  return (
    <g strokeOpacity={0.55}>
      <Paths shapes={BUS_STOP} />
      {/* eastbound: stops for the people waiting, then leaves */}
      <g className="hero-bus-stopping">
        <Paths shapes={BUS} />
      </g>
      {/* westbound: drawn facing left, doesn't stop */}
      <g className="hero-bus-passing">
        <g transform="scale(-1 1)">
          <Paths shapes={BUS} />
        </g>
      </g>
      {/* the people at the stop board the bus, and new ones arrive later */}
      <g className="hero-waiting">
        <Paths shapes={[...person(STOP_X + 16), ...person(STOP_X + 34), ...person(STOP_X + 54)]} />
      </g>
      <Walker dir={1} dur={70} delay={-10} />
      <Walker dir={1} dur={84} delay={-52} />
      <Walker dir={-1} dur={76} delay={-30} />
      <Walker dir={-1} dur={90} delay={-70} />
    </g>
  );
}

function Layer({ shapes, opacity }: { shapes: Shape[]; opacity: number }) {
  return (
    <g strokeOpacity={opacity}>
      {shapes.map((s, i) => (
        <path key={i} d={s.d} className={s.fill ? "fill-paper" : undefined} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

function City({ viewBox, fit, className }: { viewBox: string; fit: "slice" | "meet"; className: string }) {
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio={`xMidYMax ${fit}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`absolute inset-0 size-full text-muted ${className}`}
    >
      <Layer shapes={SKY} opacity={0.3} />
      <Layer shapes={FAR} opacity={0.28} />
      <Layer shapes={MID} opacity={0.42} />
      <Flock />
      <Layer shapes={NEAR} opacity={0.5} />
      <Trees />
      <Metro />
      <Street />
    </svg>
  );
}

/* Phones only: slim towers standing behind the city strip and rising behind
   the card and up into the headline, so the city fills the screen rather than
   just the band above the buttons. Faintest of all, since text sits on them.
   Drawn on a 420×1000 box whose bottom is the hero's bottom. */
function tower(x: number, w: number, top: number, crown: "flat" | "tank" | "setback" | "spire" | "antenna" | "slant"): Shape[] {
  const B = 1000;
  const mid = x + w / 2;
  const body: Shape =
    crown === "slant"
      ? { d: `M${x} ${B}V${top + 18}L${x + w} ${top}V${B}`, fill: true }
      : { d: `M${x} ${B}V${top}H${x + w}V${B}`, fill: true };
  const extra: Shape[] = [];
  if (crown === "tank") extra.push({ d: `M${x + w * 0.5} ${top}V${top - 10}h12V${top}`, fill: true });
  if (crown === "setback") {
    extra.push({ d: `M${x + 5} ${top}V${top - 20}H${x + w - 5}V${top}`, fill: true });
    extra.push({ d: `M${mid} ${top - 20}V${top - 46}` });
  }
  if (crown === "spire") extra.push({ d: `M${x + 4} ${top}L${mid} ${top - 60}L${x + w - 4} ${top}` });
  if (crown === "antenna") extra.push({ d: `M${mid} ${top}V${top - 34}` });
  // one or two quiet vertical lines read as glass, without a window grid
  const lines: Shape = { d: `M${x + w / 3} ${top + 24}V${B}M${x + (2 * w) / 3} ${top + 24}V${B}` };
  return [body, ...extra, lines];
}

const PHONE_TOWERS: Shape[] = [
  ...tower(-6, 42, 640, "tank"),
  ...tower(44, 34, 380, "setback"),
  ...tower(88, 50, 520, "slant"),
  ...tower(146, 30, 360, "spire"),
  ...tower(186, 56, 450, "flat"),
  ...tower(252, 36, 350, "antenna"),
  ...tower(296, 48, 570, "tank"),
  ...tower(352, 40, 390, "setback"),
  ...tower(400, 32, 480, "flat"),
  { d: "M60 330q4 -3 7 2q3 -5 7 -2M84 320q4 -3 7 2q3 -5 7 -2M300 300q4 -3 7 2q3 -5 7 -2" },
];

const FADE_IN = `
  @keyframes hero-scene-in { from { opacity: 0 } to { opacity: 1 } }
  .hero-scene-in { animation: hero-scene-in 1.2s ease-out both; }
  @keyframes hero-train-run {
    0%   { transform: translateX(-340px); opacity: 1; animation-timing-function: cubic-bezier(.25,.1,.3,1); }
    55%  { transform: translateX(1030px); opacity: 1; }
    82%  { transform: translateX(1030px); opacity: 1; }
    90%  { transform: translateX(1030px); opacity: 0; }
    100% { transform: translateX(1030px); opacity: 0; }
  }
  .hero-train { animation: hero-train-run 16s 1s infinite both; }

  /* trees: a slow lean from the base, never more than a couple of degrees */
  @keyframes hero-sway { 0%, 100% { transform: rotate(-1.4deg) } 50% { transform: rotate(1.4deg) } }
  .hero-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: hero-sway 5s ease-in-out infinite; }

  /* birds: the flock drifts across the sky, each bird flapping */
  @keyframes hero-flock { from { transform: translate(-120px, 30px) } 50% { transform: translate(800px, -10px) } to { transform: translate(1720px, 20px) } }
  .hero-flock { animation: hero-flock 46s linear infinite; }
  @keyframes hero-flap { 0%, 100% { transform: scaleY(1) } 50% { transform: scaleY(-0.5) } }
  .hero-flap { transform-box: fill-box; transform-origin: 50% 100%; animation: hero-flap 0.7s ease-in-out infinite; }

  /* buses: one pulls in at the stop, waits, pulls out; one passes the other way */
  @keyframes hero-bus-stopping {
    0%   { transform: translateX(-120px); animation-timing-function: cubic-bezier(.2,.1,.3,1); }
    30%  { transform: translateX(${STOP_X - 4}px); }
    48%  { transform: translateX(${STOP_X - 4}px); animation-timing-function: cubic-bezier(.6,0,.9,.6); }
    85%  { transform: translateX(1720px); }
    100% { transform: translateX(1720px); }
  }
  .hero-bus-stopping { animation: hero-bus-stopping 26s 2s infinite both; }
  @keyframes hero-bus-passing { 0% { transform: translateX(1720px) } 70%, 100% { transform: translateX(-120px) } }
  .hero-bus-passing { animation: hero-bus-passing 24s 11s infinite both; }
  @keyframes hero-waiting {
    0%, 36% { opacity: 1 }
    42%, 88% { opacity: 0 }
    96%, 100% { opacity: 1 }
  }
  .hero-waiting { animation: hero-waiting 26s 2s infinite both; }

  /* people walking the pavement, legs swinging from the hip */
  @keyframes hero-walk-right { from { transform: translateX(-40px) } to { transform: translateX(1640px) } }
  @keyframes hero-walk-left { from { transform: translateX(1640px) } to { transform: translateX(-40px) } }
  .hero-walk-right { animation: hero-walk-right 70s linear infinite; }
  .hero-walk-left { animation: hero-walk-left 70s linear infinite; }
  @keyframes hero-leg { 0%, 100% { transform: rotate(22deg) } 50% { transform: rotate(-22deg) } }
  .hero-leg { transform-box: fill-box; transform-origin: 50% 0%; animation: hero-leg 0.9s ease-in-out infinite; }
  .hero-leg-b { animation-delay: -0.45s; }
  @media (prefers-reduced-motion: reduce) {
    .hero-scene-in { animation: none; }
    .hero-train { animation: none; transform: translateX(1030px); }
    .hero-sway, .hero-flap, .hero-leg, .hero-waiting { animation: none; }
    .hero-flock { animation: none; transform: translate(300px, 0); }
    .hero-bus-stopping { animation: none; transform: translateX(${STOP_X - 4}px); }
    .hero-bus-passing, .hero-walk-right, .hero-walk-left { animation: none; display: none; }
  }
`;

export function HeroScene({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`hero-scene-in ${className ?? ""}`}>
      <style>{FADE_IN}</style>
      {/* Phones: a wider slice fitted to the width and standing on the
          bottom edge, so the dome, the train and the palms read at a
          recognisable size in the band above the buttons. Cropping to the
          full height instead zoomed in until the dome's columns filled it. */}
      <svg
        viewBox="0 0 420 1000"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute inset-0 size-full text-muted sm:hidden"
      >
        <Layer shapes={PHONE_TOWERS} opacity={0.24} />
      </svg>
      <City viewBox="120 0 640 600" fit="meet" className="sm:hidden" />
      <City viewBox="0 0 1600 600" fit="slice" className="max-sm:hidden" />
    </div>
  );
}
