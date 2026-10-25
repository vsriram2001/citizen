import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/llm";

const SYSTEM_PROMPT = `A citizen edited the figures of a policy ask on a civic accountability platform, and its headline must be updated to stay true to them.

You get the original headline, the original "now → target" figures, and the edited ones. Rewrite the headline so it matches the EDITED figures, changing as little as possible: keep the wording, order and style, and update only what depended on the old figures (an amount, a size of change, a time limit). Do not add the deadline date — it is shown separately.

Headline style: imperative, 8-14 words, states how much it changes as the size of the change when the ask is numeric (e.g. "Expand India's forest cover by 1 percentage point of land area"), and stands on its own when shared without the card around it. If the edited figures need no change to the headline, return it unchanged.

Output ONLY {"askText": "..."} — no prose, no markdown fence.`;

export async function POST(req: Request) {
  const { askText, from, to } = await req.json();

  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (
    text(askText).length < 5 ||
    text(askText).length > 400 ||
    !text(to?.targetValue) ||
    !text(to?.currentValue)
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const result = await chatJSON<{ askText?: string }>({
      system: SYSTEM_PROMPT,
      user: `Original headline: "${text(askText)}"\nOriginal figures: now "${text(from?.currentValue)}" → target "${text(from?.targetValue)}"\nEdited figures: now "${text(to.currentValue)}" → target "${text(to.targetValue)}"`,
      maxTokens: 1500,
    });
    const updated = text(result.askText);
    if (updated.length < 5 || updated.length > 400) throw new Error("bad headline");
    return NextResponse.json({ askText: updated });
  } catch (err) {
    console.error("headline route failed:", err);
    return NextResponse.json({ error: "Could not update the headline" }, { status: 502 });
  }
}
