import { cn } from "@/lib/cn";

/**
 * Base surface. 6px radius — the larger of the two steps in the scale,
 * reserved for containers so small elements stay visibly squarer.
 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-card p-5",
        className,
      )}
      {...props}
    />
  );
}
