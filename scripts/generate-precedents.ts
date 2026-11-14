/*
  Looks up a "Done before" precedent for every approved ask that has none and
  saves it to submissions.precedent. New asks get theirs as they're added
  (api/submissions); this is for the ones that came before, or that nothing
  was found for at the time.

  WRITES TO THE SHARED (production) DATABASE — ask the owner first. It only
  fills an empty precedent, never replaces one. Asks with none are looked up
  again on every run (~3 Tavily searches each), since a later search may find
  what an earlier one didn't; pass --dry-run to print without saving.

    npx tsx --env-file=.env.local scripts/generate-precedents.ts [--dry-run]
*/
import { createAdminClient } from "@/lib/supabase/admin";
import { findPrecedent } from "@/lib/precedent";

const CONCURRENCY = 4;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = createAdminClient();

  const { data, error } = await db
    .from("submissions")
    .select("id, ask_text, current_value, target_value")
    .eq("moderation_status", "approved")
    .is("precedent", null);
  if (error) throw error;

  const todo = data ?? [];
  console.log(`${todo.length} asks with no precedent to look up${dryRun ? " (dry run)" : ""}`);

  let next = 0;
  let done = 0;
  let found = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < todo.length) {
        const row = todo[next++];
        try {
          const precedent = await findPrecedent({
            askText: row.ask_text,
            currentValue: row.current_value ?? undefined,
            targetValue: row.target_value ?? undefined,
          });
          if (precedent) {
            found++;
            if (!dryRun) {
              // `is null` again: an ask added meanwhile with its own keeps it.
              const { error: saveError } = await db
                .from("submissions")
                .update({ precedent })
                .eq("id", row.id)
                .is("precedent", null);
              if (saveError) throw saveError;
            }
          }
          done++;
          console.log(
            `[${done}/${todo.length}] ${precedent ? "✓" : "—"} ${row.ask_text}${precedent ? `\n      ${precedent.place}: ${precedent.summary}` : ""}`,
          );
        } catch (err) {
          console.error(`failed: ${row.ask_text}:`, err);
        }
      }
    }),
  );
  console.log(`\nDone. Found ${found} new precedent(s)${dryRun ? " (not saved)" : ""}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
