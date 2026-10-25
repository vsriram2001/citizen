import { NextResponse } from "next/server";
import { chatJSON } from "@/lib/llm";
import { normalizeTimeframe } from "@/lib/timeframe";
import {
  RESPONSIBLE_PEOPLE_RULES,
  finalizeResponsiblePeople,
  gatherGroundingContext,
} from "@/lib/resolve-ask";
import type { ResponsiblePerson } from "@/lib/types";

interface Resolution {
  currentValue?: string;
  targetValue?: string;
  tags?: string[];
  timeframe: string;
  targetBody: string;
  responsiblePeople: ResponsiblePerson[];
}

const SYSTEM_PROMPT = `A citizen is submitting a policy ask exactly as they typed it — you do not rephrase askText, you only fill in the supporting fields:

- currentValue: where things stand today, ideally a figure, taken from the search results (e.g. "2.9% of GDP"). If the results don't support a confident figure, use a short qualitative phrase (e.g. "Not published") — never invent a number.
- targetValue: the outcome the citizen's own text asks for (e.g. "6% of GDP", "Abolished"). Only what their words state or plainly imply — if they give no target, use "".
- tags: 1-3 short topic tags in Title Case (e.g. ["Education", "Budget"])
- timeframe: an absolute deadline as "Mon YYYY" (e.g. "Mar 2030") — never a relative phrase.
- targetBody: the government body accountable (e.g. "Ministry of Finance")
- ${RESPONSIBLE_PEOPLE_RULES}

Ground targetBody and responsiblePeople in the live web search results given below — do not use your own memory for facts that could be stale.

Output ONLY {"currentValue": "...", "targetValue": "...", "tags": ["..."], "timeframe": "...", "targetBody": "...", "responsiblePeople": [{"name": "...", "designation": "...", "organization": "..."}]}. No prose, no markdown fence.`;

export async function POST(req: Request) {
  const { askText } = await req.json();

  if (typeof askText !== "string" || askText.trim().length < 5) {
    return NextResponse.json({ error: "askText required" }, { status: 400 });
  }

  const trimmed = askText.trim();
  const grounding = await gatherGroundingContext(trimmed);

  try {
    const resolution = await chatJSON<Resolution>({
      system: SYSTEM_PROMPT,
      user: `Citizen's ask, verbatim: "${trimmed}"${grounding.context}`,
    });

    return NextResponse.json({
      currentValue: resolution.currentValue ?? "",
      targetValue: resolution.targetValue ?? "",
      tags: Array.isArray(resolution.tags) ? resolution.tags.slice(0, 3) : [],
      timeframe: normalizeTimeframe(resolution.timeframe),
      targetBody: resolution.targetBody,
      responsiblePeople: finalizeResponsiblePeople(
        resolution.responsiblePeople,
        grounding.jurisdiction.national,
      ),
    });
  } catch (err) {
    console.error("resolve route failed:", err);
    return NextResponse.json({ error: "Could not resolve ask" }, { status: 502 });
  }
}
