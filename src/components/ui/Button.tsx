import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg" | "xl" | "vote";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-paper border border-accent hover:bg-ink hover:border-ink",
  secondary:
    "bg-card text-text border border-border hover:border-muted hover:bg-paper",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:text-text hover:bg-border/40",
};

const SIZES: Record<Size, string> = {
  sm: "text-[13px] px-3 py-1.5 rounded-sm",
  md: "text-[13px] px-4 py-[7px] rounded-sm",
  lg: "text-[15px] px-6 py-2.5 rounded-sm",
  // Primary hero CTA — navy, near-square corners, Playfair Display,
  // uppercase and tracked. Deliberately its own size rather than folded
  // into `lg`, since this treatment is specific to the one big ask on the
  // homepage, not a general large-button style.
  xl: cn(
    "text-[15px] px-14 py-4 rounded-[2px]",
    "font-display font-black uppercase tracking-[0.09em]",
    "bg-navy text-paper border border-navy hover:bg-ink hover:border-ink",
    "btn-shimmer",
  ),
  // Same identity as the homepage hero CTA (navy, near-square corners,
  // Playfair Display, shimmer) scaled down to sit in a card row — the vote
  // action reads as deliberate and official rather than generic UI chrome.
  vote: cn(
    "text-[12px] px-4 py-2 rounded-[2px]",
    "font-display font-black uppercase tracking-[0.07em]",
    "bg-navy text-paper border border-navy hover:bg-ink hover:border-ink",
    "btn-shimmer",
  ),
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const BASE = cn(
  "inline-flex items-center justify-center gap-2 font-medium",
  "transition-colors duration-150 cursor-pointer",
  // Pressed state: hover styles only apply to real pointers (Tailwind 4
  // gates hover: on @media (hover: hover)), so touch needs its own.
  "active:translate-y-px",
  // Visible focus ring — this is a civic tool, keyboard use is not an edge case.
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  "disabled:opacity-45 disabled:pointer-events-none",
);

/**
 * Button styling for things that aren't <button>s — a Next <Link> that should
 * look like one. Wrapping a <Button> in a <Link> nests two interactive
 * elements (invalid HTML, two tab stops for one action).
 */
export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  // xl / vote carry their own colours, so they skip the variant.
  const custom = size === "xl" || size === "vote";
  return cn(BASE, custom ? SIZES[size] : [VARIANTS[variant], SIZES[size]], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}
