import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/llm";

interface FeasibilityCheck {
  feasible: boolean;
  reason: string | null;
}

const SYSTEM_PROMPT = `You judge whether a policy ask's deadline is realistic for an Indian government body to actually achieve, given the gap between its current and target state.

Consider: how large the current->target gap is, how much lead time government processes (budget cycles, legislation, rollout) typically need, and whether the timeframe given is plausible or performative.

Be reasonable, not pedantic — don't flag every ambitious-but-plausible deadline. Only flag deadlines that are genuinely implausible (e.g. eliminating a tax within weeks, building national infrastructure in months, a multi-year policy reversal by next month).

Output ONLY {"feasible": true} or {"feasible": false, "reason": "<one short sentence explaining why, and what a more realistic timeframe might look like>"}. No prose outside the JSON.`;

export async function POST(req: Request) {
  const { askText, currentValue, targetValue, timeframe } = await req.json();

  if (typeof askText !== "string" || typeof timeframe !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const result = await chatJSON<FeasibilityCheck>({
      system: SYSTEM_PROMPT,
      user: `Ask: "${askText}"\nCurrent: "${currentValue ?? "unspecified"}"\nTarget: "${targetValue ?? "unspecified"}"\nDeadline: "${timeframe}"\n\nToday's date: ${new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("feasibility route failed:", err);
    // Fail open — a broken check shouldn't block submission entirely.
    return NextResponse.json({ feasible: true, reason: null });
  }
}
