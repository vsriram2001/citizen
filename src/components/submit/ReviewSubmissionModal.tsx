"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { retitleByFigures } from "@/lib/headline";
import { monthOptions, toTimeframe, fromTimeframe } from "@/lib/timeframe";
import type { ResponsiblePerson } from "@/lib/types";


export interface ReviewDraft {
  askText: string;
  currentValue: string;
  targetValue: string;
  timeframe: string;
  responsiblePeople: ResponsiblePerson[];
}

/** What comes back from review — askText included, since the headline is
 *  rewritten when the person edits the figures it states. */
export type ReviewResult = ReviewDraft;

/**
 * The screen the first voter on a new ask sees before it goes live. Every
 * ask needs where things stand now and the target (that gap is what makes
 * it measurable), a deadline (Month + Year, never relative) and at least one
 * checked responsible person — this is where the AI's best-guess draft
 * gets a human check before either becomes permanent public record.
 */
export function ReviewSubmissionModal({
  draft,
  onConfirm,
  onCancel,
  submitting,
}: {
  draft: ReviewDraft;
  onConfirm: (final: ReviewResult) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const initial = fromTimeframe(draft.timeframe);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [currentValue, setCurrentValue] = useState(draft.currentValue);
  const [targetValue, setTargetValue] = useState(draft.targetValue);
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(draft.responsiblePeople.map((_, i) => i)),
  );

  const [feasibility, setFeasibility] = useState<{
    checked: boolean;
    feasible: boolean;
    reason: string | null;
  }>({ checked: false, feasible: true, reason: null });
  const [checkingFeasibility, setCheckingFeasibility] = useState(false);

  // The headline states the size of the change, so it follows edits to the
  // figures. A plain number swap is instant; anything subtler asks the
  // server, debounced. Derived rather than stored, so it can't go stale.
  const figuresKey = `${currentValue}\u0000${targetValue}`;
  const figuresEdited =
    currentValue !== draft.currentValue || targetValue !== draft.targetValue;
  const quickHeadline =
    figuresEdited && currentValue === draft.currentValue
      ? retitleByFigures(draft.askText, draft.targetValue, targetValue)
      : null;
  const [rewritten, setRewritten] = useState<{ key: string; text: string | null } | null>(null);
  const needsRewrite =
    figuresEdited && !quickHeadline && currentValue.trim() !== "" && targetValue.trim() !== "";
  const rewrite = rewritten?.key === figuresKey ? rewritten : null;
  const rewriting = needsRewrite && !rewrite;
  const headline = !figuresEdited ? draft.askText : (quickHeadline ?? rewrite?.text ?? draft.askText);

  useEffect(() => {
    if (!needsRewrite) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let text: string | null = null;
      try {
        const res = await fetch("/api/headline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            askText: draft.askText,
            from: { currentValue: draft.currentValue, targetValue: draft.targetValue },
            to: { currentValue, targetValue },
          }),
        });
        if (res.ok) text = (await res.json()).askText ?? null;
      } catch {
        // Falls through to the "couldn't update" note below.
      }
      if (!cancelled) setRewritten({ key: figuresKey, text });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the figures
  }, [figuresKey, needsRewrite]);

  const timeframe = toTimeframe(month, year);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => String(currentYear + i));

  // Re-check feasibility whenever the date changes from what was last
  // checked — debounced so flipping through months doesn't fire a call per click.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mark stale immediately when the date changes
    setFeasibility((prev) => ({ ...prev, checked: false }));
    const timer = setTimeout(async () => {
      setCheckingFeasibility(true);
      try {
        const res = await fetch("/api/feasibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ askText: draft.askText, currentValue, targetValue, timeframe }),
        });
        const data = await res.json();
        if (!cancelled) {
          setFeasibility({
            checked: true,
            feasible: data.feasible !== false,
            reason: data.reason ?? null,
          });
        }
      } catch {
        if (!cancelled) setFeasibility({ checked: true, feasible: true, reason: null });
      } finally {
        if (!cancelled) setCheckingFeasibility(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, currentValue, targetValue]);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const selectedPeople = draft.responsiblePeople.filter((_, i) => checked.has(i));
  const hasValues = currentValue.trim() !== "" && targetValue.trim() !== "";
  const canConfirm = selectedPeople.length > 0 && hasValues && !rewriting && !submitting;

  return (
    // Not dismissible by backdrop, Escape or drag: it holds edits, and only
    // Back should throw them away.
    <Sheet
      title="Review before this goes live"
      dismissible={false}
      onClose={onCancel}
      description={
        <>
          <p>{headline}</p>
          {rewriting && (
            <p className="text-xs text-text-muted mt-1">Updating the headline to match…</p>
          )}
          {rewrite && rewrite.text === null && (
            <p className="text-xs text-against-fg mt-1">
              Couldn&rsquo;t update the headline to match your figures — check it
              still says what you mean.
            </p>
          )}
        </>
      }
      footer={
        <SheetActions>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Back
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                askText: headline,
                currentValue: currentValue.trim(),
                targetValue: targetValue.trim(),
                timeframe,
                responsiblePeople: selectedPeople,
              })
            }
          >
            {submitting ? "Adding…" : "Confirm and cast first vote"}
          </Button>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
            Where it stands now → what you&rsquo;re asking for
          </span>
          {/* Stacked on phones: two half-width fields can't show a figure
              like "2.9% of GDP" without clipping it. */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <Input
              aria-label="Where it stands now"
              enterKeyHint="next"
              placeholder="Now, e.g. 2.9% of GDP"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
            />
            <span className="text-text-muted shrink-0 self-center rotate-90 sm:rotate-0 leading-none" aria-hidden>
              →
            </span>
            <Input
              aria-label="Target"
              enterKeyHint="done"
              placeholder="Target, e.g. 6% of GDP"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>
          {!hasValues && (
            <p className="text-xs text-against-fg">
              Fill in both — the gap between them is what makes an ask measurable.
              Not known? Say so, e.g. &ldquo;Not published&rdquo;.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
            Deadline
          </span>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="flex-1 bg-paper border border-border rounded-sm px-3 py-2.5 sm:py-2 text-sm text-text focus:outline-none focus:border-accent"
            >
              {monthOptions().map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="flex-1 bg-paper border border-border rounded-sm px-3 py-2.5 sm:py-2 text-sm text-text tabular-nums focus:outline-none focus:border-accent"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {checkingFeasibility && (
            <p className="text-xs text-text-muted">Checking if that&rsquo;s realistic…</p>
          )}
          {feasibility.checked && !feasibility.feasible && feasibility.reason && (
            <div className="text-xs text-against-fg bg-against-bg border border-against/20 rounded-sm px-3 py-2 leading-relaxed">
              {feasibility.reason}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">
            Who&rsquo;s responsible — uncheck anyone who doesn&rsquo;t belong
          </span>
          <div className="flex flex-col gap-1.5">
            {draft.responsiblePeople.map((person, i) => (
              <label
                key={i}
                className={cn(
                  "flex items-start gap-2.5 px-3 py-2.5 rounded-sm border cursor-pointer transition-colors",
                  checked.has(i)
                    ? "border-border bg-paper"
                    : "border-border/50 bg-transparent opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked.has(i)}
                  onChange={() => toggle(i)}
                  className="mt-0.5 accent-accent shrink-0"
                />
                <span className="leading-snug">
                  <span className="block text-sm font-semibold text-text">
                    {person.name}
                  </span>
                  <span className="block text-xs text-text-secondary">
                    {person.designation}
                    {person.organization && ` · ${person.organization}`}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {selectedPeople.length === 0 && (
            <p className="text-xs text-against-fg">
              At least one person must stay checked — every ask needs someone accountable.
            </p>
          )}
          <p className="text-xs text-text-muted">
            Don&rsquo;t see the right person? Adding someone yourself is coming soon.
          </p>
        </div>
      </div>
    </Sheet>
  );
}
