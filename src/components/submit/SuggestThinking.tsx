/**
 * Loading state while /api/suggest is in flight. Six blocks of varying
 * size and tone orbit a shared center at different radii and speeds,
 * each counter-rotating on its own axis so it stays upright rather than
 * tumbling — reads as pieces of a document circling into place. Bigger
 * and livelier than a spinner or dot-wave, still flat geometric blocks
 * in the platform's palette (no gradients/glow) so it doesn't clash with
 * the paper-record register elsewhere on the page.
 */
const BLOCKS: {
  size: number;
  radius: number;
  duration: number;
  delay: number;
  color: string;
  rotate: number;
}[] = [
  { size: 22, radius: 46, duration: 3.2, delay: 0, color: "bg-navy", rotate: 0 },
  { size: 14, radius: 46, duration: 3.2, delay: -1.07, color: "bg-accent", rotate: 120 },
  { size: 18, radius: 46, duration: 3.2, delay: -2.13, color: "bg-muted", rotate: 240 },
  { size: 12, radius: 30, duration: 2.4, delay: -0.6, color: "bg-accent", rotate: 60 },
  { size: 16, radius: 30, duration: 2.4, delay: -1.8, color: "bg-navy", rotate: 180 },
  { size: 10, radius: 30, duration: 2.4, delay: -1.2, color: "bg-muted", rotate: 300 },
];

export function SuggestThinking() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-14">
      <div
        className="relative w-[140px] h-[140px]"
        aria-hidden="true"
        style={{ transformStyle: "preserve-3d" }}
      >
        {BLOCKS.map((b, i) => (
          <span
            key={i}
            className="suggest-orbit-block absolute top-1/2 left-1/2"
            style={
              {
                width: b.size,
                height: b.size,
                marginTop: -b.size / 2,
                marginLeft: -b.size / 2,
                "--orbit-radius": `${b.radius}px`,
                "--orbit-duration": `${b.duration}s`,
                "--orbit-delay": `${b.delay}s`,
                transform: `rotate(${b.rotate}deg) translateX(${b.radius}px)`,
              } as React.CSSProperties
            }
          >
            <span className={b.color} />
          </span>
        ))}
      </div>
      <span className="text-sm text-text-secondary">
        Shaping this into an ask…
      </span>
    </div>
  );
}
