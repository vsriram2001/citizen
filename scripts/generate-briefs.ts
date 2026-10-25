/*
  Pre-generates the Info brief for every seed ask (lib/mock/asks.ts) into
  lib/mock/briefs.json, so demo mode serves a fixed brief instead of drafting
  one per load. Existing entries are kept unless --force is passed.

  --db  also copies those briefs into the shared Supabase DB for any seeded
        submission (matched by ask text) that has none. WRITES TO THE SHARED
        DATABASE and needs migration 202610241200 applied — ask first.

  Usage: npx tsx --env-file=.env.local scripts/generate-briefs.ts [--force] [--db]
*/
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateBrief, getStoredBrief, saveBrief } from "../src/lib/brief";
import { SEED_ASKS } from "../src/lib/mock/asks";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { AskBrief } from "../src/lib/types";

const FILE = resolve(__dirname, "../src/lib/mock/briefs.json");
const CONCURRENCY = 3;

async function main() {
  const force = process.argv.includes("--force");
  const toDb = process.argv.includes("--db");
  const briefs: Record<string, AskBrief> = JSON.parse(readFileSync(FILE, "utf8"));

  const todo = SEED_ASKS.filter((a) => force || !briefs[a.id]);
  console.log(`${todo.length} to generate, ${SEED_ASKS.length - todo.length} already stored`);

  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < todo.length) {
        const ask = todo[next++];
        try {
          briefs[ask.id] = await generateBrief(ask);
          // Written after every ask so a crash loses at most the in-flight ones.
          writeFileSync(FILE, JSON.stringify(briefs, null, 2) + "\n");
          console.log(`ok: ${ask.id}`);
        } catch (err) {
          console.error(`FAILED: ${ask.id}`, err);
        }
      }
    }),
  );

  if (toDb) {
    const supabase = createAdminClient();
    for (const ask of SEED_ASKS) {
      const { data: row } = await supabase
        .from("submissions")
        .select("id")
        .eq("ask_text", ask.askText)
        .maybeSingle();
      if (!row || !briefs[ask.id] || (await getStoredBrief(row.id))) continue;
      await saveBrief(row.id, briefs[ask.id]);
      console.log(`db: ${ask.id} -> ${row.id}`);
    }
  }

  const missing = SEED_ASKS.filter((a) => !briefs[a.id]).map((a) => a.id);
  if (missing.length) {
    console.error(`missing briefs: ${missing.join(", ")}`);
    process.exit(1);
  }
}

main();
