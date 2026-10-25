import { cn } from "@/lib/cn";

const FIELD = cn(
  "w-full bg-card text-text placeholder:text-text-muted",
  "border border-border rounded-sm px-3 py-2.5 sm:py-2 text-sm",
  "transition-colors duration-150",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "disabled:opacity-50 disabled:cursor-not-allowed",
);

/**
 * Wraps a field with its label and optional hint.
 *
 * `optional` renders a visible marker so a skippable field never has to be
 * inferred from the absence of a required marker. Pass `true` for the plain
 * "optional" label, or a string (e.g. "optional but recommended") when a
 * field is skippable but still worth nudging toward.
 *
 * `size="lg"`/`"md-lg"` set the label in the display face (Playfair
 * Display) — `lg` at full headline size, `md-lg` a step down, for fields
 * that should read as considered but sit in a denser form rather than a
 * hero section. Everything else keeps the compact sans default.
 */
export function Field({
  label,
  hint,
  optional,
  htmlFor,
  size = "md",
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean | string;
  htmlFor?: string;
  size?: "md" | "md-lg" | "lg";
  children: React.ReactNode;
}) {
  const isDisplay = size === "lg" || size === "md-lg";
  return (
    <div className={cn("flex flex-col", isDisplay ? "gap-2" : "gap-1.5")}>
      <label
        htmlFor={htmlFor}
        className={cn(
          "flex items-baseline gap-2",
          size === "lg" &&
            "font-display text-[22px] font-black text-headline tracking-[-0.02em]",
          size === "md-lg" &&
            "font-display text-[19px] font-black text-headline tracking-[-0.015em]",
          size === "md" && "text-[13px] font-medium text-text",
        )}
      >
        {label}
        {optional && (
          <span
            className={cn(
              "font-sans font-normal text-text-muted",
              isDisplay ? "text-[13px]" : "text-xs",
            )}
          >
            {optional === true ? "optional" : optional}
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(FIELD, "resize-y min-h-20", className)} {...props} />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        FIELD,
        "cursor-pointer appearance-none bg-no-repeat",
        // Custom chevron replaces the browser's native one, which renders
        // inconsistently across platforms and made this look like a
        // different, thinner component next to Input/SearchableSelect.
        "bg-[right_0.6rem_center] bg-[length:16px] pr-9",
        "[background-image:url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%235a5a54%22%20stroke-width%3D%221.6%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]",
        className,
      )}
      {...props}
    />
  );
}
