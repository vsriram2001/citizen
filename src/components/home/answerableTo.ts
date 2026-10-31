import type { Ask } from "@/lib/types";

/** Who an ask holds to account, for one line of text: the named people where
 *  we have them (already ordered most accountable first), else the body. */
export function answerableTo(ask: Ask): string {
  const names = ask.responsiblePeople?.map((p) => p.name) ?? [];
  return names.length > 0 ? names.join(", ") : ask.targetBody;
}
