import { NextResponse } from "next/server";
import { ensureBrief, getStoredBrief, loadAsk } from "@/lib/brief";

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
