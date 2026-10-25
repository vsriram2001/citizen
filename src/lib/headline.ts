/*
  Keeping an ask's headline true to its figures. The headline states the
  size of the change ("Fix every reported pothole within 72 hours"), so when
  a person edits the figures on the review screen the headline has to follow,
  or the share card says something the ask no longer does.

  Pure and client-safe. This is the instant path: it only handles the plain
  case of the headline repeating a number from the target. Anything subtler
  (the headline states a difference, or the current value changed too) goes
  to /api/headline.
*/

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

const plain = (n: string) => n.replace(/,/g, "");

/**
 * The headline with each number that came from `oldTarget` swapped for the
 * matching number in `newTarget` ("within 72 hours" → "within 104 hours"),
 * or null if it can't be done safely: the target has no numbers, the number
 * of figures changed, or the headline doesn't contain every old figure.
 */
export function retitleByFigures(
  askText: string,
  oldTarget: string,
  newTarget: string,
): string | null {
  const before = oldTarget.match(NUMBER) ?? [];
  const after = newTarget.match(NUMBER) ?? [];
  if (before.length === 0 || before.length !== after.length) return null;

  const used = new Set<number>();
  let replaced = 0;
  const result = askText.replace(NUMBER, (token) => {
    const k = before.findIndex((n, i) => !used.has(i) && plain(n) === plain(token));
    if (k < 0) return token;
    used.add(k);
    replaced++;
    return after[k];
  });
  return replaced === before.length ? result : null;
}
