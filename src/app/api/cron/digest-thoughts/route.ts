import { NextResponse } from "next/server";
import { ensureBrief, loadAsk, reviewThoughts, saveBrief } from "@/lib/brief";
import { createAdminClient } from "@/lib/supabase/admin";

// Nightly job (see vercel.json): reviews pending citizen thoughts per ask and
// folds in only those that add something. Authenticated with CRON_SECRET —
// Vercel Cron sends it as a Bearer token; any other scheduler can do the same.
//
// Safe to re-run: reviewed thoughts leave the 'pending' state, and a thought
// the model skipped or a failed LLM call simply stays pending for next time.
export const maxDuration = 300;

/** Asks reviewed per run — bounds LLM spend if a backlog builds up. */
const MAX_ASKS_PER_RUN = 25;
/** Thoughts per ask per run; the rest wait for the next night. */
const MAX_THOUGHTS_PER_ASK = 20;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: pending, error } = await supabase
    .from("ask_thoughts")
    .select("id, submission_id, body")
    .eq("status", "pending")
    .order("created_at")
    .limit(500)
    .returns<{ id: string; submission_id: string; body: string }[]>();
  if (error) {
    console.error("digest: could not read pending thoughts:", error.message);
    return NextResponse.json({ error: "Read failed" }, { status: 500 });
  }

  const byAsk = new Map<string, { id: string; body: string }[]>();
  for (const t of pending ?? []) {
    const list = byAsk.get(t.submission_id) ?? [];
    if (list.length < MAX_THOUGHTS_PER_ASK) list.push({ id: t.id, body: t.body });
    byAsk.set(t.submission_id, list);
  }

  const summary = { asks: 0, incorporated: 0, rejected: 0, updatedBriefs: 0, failed: 0 };

  for (const [askId, thoughts] of [...byAsk].slice(0, MAX_ASKS_PER_RUN)) {
    summary.asks++;
    try {
      const ask = await loadAsk(askId);
      if (!ask) continue; // not approved (or gone) — leave pending

      const current = await ensureBrief(ask);
      const { verdicts, brief } = await reviewThoughts(ask, current, thoughts);

      // Save the brief first: if this fails, the thoughts stay pending and
      // are retried, rather than being marked done with nothing added.
      if (brief) {
        await saveBrief(askId, brief);
        summary.updatedBriefs++;
      }

      const now = new Date().toISOString();
      for (const v of verdicts) {
        await supabase
          .from("ask_thoughts")
          .update({
            status: v.verdict === "incorporate" ? "incorporated" : "rejected",
            review_note: v.note,
            reviewed_at: now,
          })
          .eq("id", v.id);
        if (v.verdict === "incorporate") summary.incorporated++;
        else summary.rejected++;
      }
    } catch (err) {
      summary.failed++;
      console.error(`digest: ask ${askId} failed:`, err);
    }
  }

  return NextResponse.json(summary);
}
