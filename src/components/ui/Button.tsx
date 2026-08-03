import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-paper border border-accent hover:bg-ink hover:border-ink",
  secondary:
    "bg-card text-text border border-border hover:border-muted hover:bg-paper",
  ghost:
    "bg-transparent text-text-secondary border border-transparent hover:text-text hover:bg-border/40",
};

const SIZES: Record<Size, string> = {
  sm: "text-[13px] px-3 py-1.5",
  md: "text-[13px] px-4 py-[7px]",
  lg: "text-[15px] px-6 py-2.5",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm font-medium",
        "transition-colors duration-150 cursor-pointer",
        // Visible focus ring — this is a civic tool, keyboard use is not an edge case.
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:opacity-45 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
