import { NextResponse } from "next/server";
import { semanticMatch } from "@/lib/semantic-match";
import { getSearchableAsks } from "@/lib/submissions";

/**
 * Search by meaning: which existing asks are the same as, or related to,
 * what was typed (see lib/semantic-match.ts). The search box calls this on
 * every pause in typing, alongside the instant keyword matching it does
 * itself. Also used as the duplicate pre-check before a new ask is added.
 */
export async function POST(req: Request) {
  const { query } = await req.json();

  if (typeof query !== "string" || query.trim().length < 3 || query.length > 400) {
    return NextResponse.json({ error: "Query must be 3–400 characters" }, { status: 400 });
  }

  const { asks } = await getSearchableAsks();
  try {
    const matches = await semanticMatch(query, asks);
    return NextResponse.json({ matches });
  } catch (err) {
    console.error("match route failed:", err);
    // The keyword results are already on screen; the client carries on
    // with those alone.
    return NextResponse.json({ error: "Could not match by meaning" }, { status: 502 });
  }
}
