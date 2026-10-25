// Shared "Mon YYYY" deadline format used across the platform — chosen so
// every ask's timeframe is an absolute, sortable, unambiguous date rather
// than a relative phrase ("within 2 years") that goes stale the moment it's
// written and means something different depending on when it's read.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const TIMEFRAME_PATTERN = /^([A-Za-z]{3}) (\d{4})$/;

export function isValidTimeframe(value: string): boolean {
  const match = value.trim().match(TIMEFRAME_PATTERN);
  if (!match) return false;
  const [, mon, year] = match;
  return (
    MONTHS.includes(mon as (typeof MONTHS)[number]) &&
    Number(year) >= new Date().getFullYear()
  );
}

/** Best-effort coercion for LLM output that almost fits (e.g. wrong case,
 *  full month name) — falls back to Dec of next year if truly unparseable,
 *  so a malformed deadline never silently reaches the UI as a raw string. */
export function normalizeTimeframe(value: string): string {
  const trimmed = value.trim();
  if (isValidTimeframe(trimmed)) {
    const [, mon, year] = trimmed.match(TIMEFRAME_PATTERN)!;
    return `${mon[0].toUpperCase()}${mon.slice(1, 3).toLowerCase()} ${year}`;
  }

  const fullMonthMatch = trimmed.match(/^([A-Za-z]+)\.?\s+(\d{4})$/);
  if (fullMonthMatch) {
    const [, monthWord, year] = fullMonthMatch;
    const idx = MONTHS.findIndex(
      (m) => monthWord.toLowerCase().startsWith(m.toLowerCase()),
    );
    if (idx >= 0) return `${MONTHS[idx]} ${year}`;
  }

  const yearOnlyMatch = trimmed.match(/^(\d{4})$/);
  if (yearOnlyMatch) return `Dec ${yearOnlyMatch[1]}`;

  const fallbackYear = new Date().getFullYear() + 1;
  return `Dec ${fallbackYear}`;
}

export function monthOptions(): { value: string; label: string }[] {
  return MONTHS.map((m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m }));
}

export function toTimeframe(month: string, year: string): string {
  const idx = Number(month) - 1;
  return `${MONTHS[idx] ?? "Dec"} ${year}`;
}

export function fromTimeframe(timeframe: string): { month: string; year: string } {
  const match = timeframe.trim().match(TIMEFRAME_PATTERN);
  if (!match) {
    const fallbackYear = String(new Date().getFullYear() + 1);
    return { month: "12", year: fallbackYear };
  }
  const [, mon, year] = match;
  const idx = MONTHS.findIndex((m) => m.toLowerCase() === mon.toLowerCase());
  return { month: String((idx >= 0 ? idx : 11) + 1).padStart(2, "0"), year };
}
