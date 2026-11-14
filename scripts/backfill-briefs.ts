/*
  Drafts and stores the Info brief for every approved ask in the database
  that has none, so ⓘ opens instantly instead of the first reader waiting
  while it's written. Never overwrites a stored brief.

  WRITES TO THE SHARED (production) DATABASE — ask the owner first.

    npx tsx --env-file=.env.local scripts/backfill-briefs.ts
*/
import { generateBrief, saveBrief } from "@/lib/brief";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Ask } from "@/lib/types";

const CONCURRENCY = 3;

async function main() {
  const db = createAdminClient();
  const [{ data: rows, error }, { data: stored, error: storedError }] = await Promise.all([
    db
      .from("submissions")
      .select(
        "id, ask_text, current_value, target_value, timeframe, target_body, tags, vote_count, responsible_people ( name, designation, organization )",
      )
      .eq("moderation_status", "approved"),
    db.from("ask_briefs").select("submission_id"),
  ]);
  if (error) throw error;
  if (storedError) throw storedError;

  const have = new Set((stored ?? []).map((b) => b.submission_id));
  const todo = (rows ?? []).filter((r) => !have.has(r.id));
  console.log(`${rows?.length ?? 0} asks, ${have.size} briefs stored, ${todo.length} to draft`);

  let next = 0;
  let ok = 0;
  const failed: string[] = [];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < todo.length) {
        const r = todo[next++];
        const ask: Ask = {
          id: r.id,
          askText: r.ask_text,
          currentValue: r.current_value ?? "",
          targetValue: r.target_value ?? "",
          timeframe: r.timeframe ?? "",
          targetBody: r.target_body ?? "",
          tags: r.tags ?? [],
          responsiblePeople: (r.responsible_people ?? []).map((p) => ({
            name: p.name,
            designation: p.designation,
            organization: p.organization ?? undefined,
          })),
          verificationStatus: "unverified",
          voteCount: r.vote_count ?? 0,
          partyResponses: [],
        };
        try {
          await saveBrief(ask.id, await generateBrief(ask));
          ok++;
          console.log(`[${ok}/${todo.length}] ok: ${ask.askText}`);
        } catch (err) {
          failed.push(ask.askText);
          console.error(`FAILED: ${ask.askText}`, err);
        }
      }
    }),
  );
  console.log(`\nDrafted ${ok} of ${todo.length}.`);
  if (failed.length) {
    console.error(`Failed (run again to retry): ${failed.join(" | ")}`);
    process.exit(1);
  }
}

main();
