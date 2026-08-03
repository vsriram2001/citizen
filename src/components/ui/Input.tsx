import { cn } from "@/lib/cn";

const FIELD = cn(
  "w-full bg-card text-text placeholder:text-text-muted",
  "border border-border rounded-sm px-3 py-2 text-sm",
  "transition-colors duration-150",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "disabled:opacity-50 disabled:cursor-not-allowed",
);

/**
 * Wraps a field with its label and optional hint.
 *
 * `optional` renders a visible "optional" marker. Onboarding has genuinely
 * skippable fields and the spec is emphatic about that — a field the user may
 * skip should say so, rather than making them guess from the absence of a
 * required marker.
 */
export function Field({
  label,
  hint,
  optional,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-medium text-text flex items-baseline gap-2"
      >
        {label}
        {optional && (
          <span className="text-xs font-normal text-text-muted">optional</span>
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
  return <select className={cn(FIELD, "cursor-pointer", className)} {...props} />;
}
