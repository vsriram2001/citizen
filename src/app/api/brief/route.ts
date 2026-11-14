import { NextResponse } from "next/server";
import { draftBrief, ensureBrief, getStoredBrief, loadAsk } from "@/lib/brief";
import type { Ask } from "@/lib/types";

// GET /api/brief?id=<askId> — the ask's stored Info brief. Briefs are drafted
// when an ask is created (api/submissions) or pre-generated for the seed
// asks, and changed only by the nightly digest — so this is a plain read.
// Drafting here is a fallback for older asks that have no brief yet; the
// result is stored, so it happens once. 404 when the ask isn't one we can
// resolve (e.g. a suggestion that hasn't been added yet).
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const stored = await getStoredBrief(id);
  if (stored) return NextResponse.json({ brief: stored });

  const ask = await loadAsk(id);
  if (!ask) return NextResponse.json({ error: "Ask not found" }, { status: 404 });

  try {
    return NextResponse.json({ brief: await ensureBrief(ask) });
  } catch (err) {
    console.error("brief route failed:", err);
    return NextResponse.json({ error: "Could not draft the brief" }, { status: 502 });
  }
}

// POST /api/brief { askText, currentValue, targetValue, timeframe, targetBody, tags }
// The brief for a suggested ask that isn't on the platform yet — drafted
// only when someone opens its ⓘ, never stored (see draftBrief). Fields are
// capped: this spends search and LLM calls on whatever text it's given.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const askText = text(body?.askText, 200);
  if (askText.length < 5) {
    return NextResponse.json({ error: "askText required" }, { status: 400 });
  }
  const ask: Ask = {
    id: "draft",
    askText,
    currentValue: text(body?.currentValue, 120),
    targetValue: text(body?.targetValue, 120),
    timeframe: text(body?.timeframe, 20),
    targetBody: text(body?.targetBody, 120),
    tags: Array.isArray(body?.tags)
      ? body.tags.filter((t: unknown): t is string => typeof t === "string").slice(0, 3)
      : [],
    verificationStatus: "unverified",
    voteCount: 0,
    partyResponses: [],
  };
  try {
    return NextResponse.json({ brief: await draftBrief(ask) });
  } catch (err) {
    console.error("draft brief failed:", err);
    return NextResponse.json({ error: "Could not draft the brief" }, { status: 502 });
  }
}
