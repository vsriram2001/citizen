import { NextResponse } from "next/server";
import { LEDGER_PAGE_SIZE, toLedgerBlock } from "@/lib/ledger-read";
import { createAdminClient } from "@/lib/supabase/admin";

// The whole chain, public and paged, so anyone can check or mirror it. Blocks
// hold hashes only, so this exposes no voter and no choice.
export async function GET(req: Request) {
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0);
  if (!Number.isSafeInteger(after) || after < 0) {
    return NextResponse.json({ error: "after must be a block height" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("vote_ledger")
    .select("*")
    .gt("height", after)
    .order("height")
    .limit(LEDGER_PAGE_SIZE);
  if (error) {
    console.error("ledger read failed:", error.message);
    return NextResponse.json({ error: "Could not read the ledger" }, { status: 500 });
  }
  return NextResponse.json({ blocks: data.map(toLedgerBlock) });
}
