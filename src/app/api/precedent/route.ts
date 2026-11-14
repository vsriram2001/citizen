import { NextResponse } from "next/server";
import { findPrecedent } from "@/lib/precedent";

// POST /api/precedent { askText, currentValue?, targetValue? } → { precedent }
// For asks that didn't come from a suggestion card (typed by hand), looked up
// on the review screen. { precedent: null } when none is found or the lookup
// fails — the screen then simply shows nothing.
export async function POST(req: Request) {
  const { askText, currentValue, targetValue } = await req.json();
  if (typeof askText !== "string" || askText.trim().length < 5) {
    return NextResponse.json({ error: "askText required" }, { status: 400 });
  }
  try {
    const precedent = await findPrecedent({
      askText: askText.trim(),
      currentValue: typeof currentValue === "string" ? currentValue : undefined,
      targetValue: typeof targetValue === "string" ? targetValue : undefined,
    });
    return NextResponse.json({ precedent });
  } catch (err) {
    console.error("precedent route failed:", err);
    return NextResponse.json({ precedent: null });
  }
}
