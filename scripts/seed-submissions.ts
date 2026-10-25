/*
  One-off seed: inserts SEED_ASKS (lib/mock/asks.ts) as real, approved rows in
  Supabase. Run once against a fresh database; safe to re-run since it
  upserts on askText rather than blindly inserting duplicates.

  vote_count is deliberately NOT seeded from the mock voteCount numbers —
  those aren't backed by real votes rows, so seeding them would make the
  counter dishonest from row one. Every submission starts at 0 and only
  grows from real inserts into `votes`, via the existing trigger.

  Usage: npx tsx scripts/seed-submissions.ts
*/
import { createAdminClient } from "../src/lib/supabase/admin";
import { SEED_ASKS } from "../src/lib/mock/asks";

async function main() {
  const supabase = createAdminClient();

  for (const ask of SEED_ASKS) {
    const { data: existing } = await supabase
      .from("submissions")
      .select("id")
      .eq("ask_text", ask.askText)
      .maybeSingle();

    let submissionId = existing?.id as string | undefined;

    if (submissionId) {
      console.log(`skip (exists): ${ask.askText}`);
    } else {
      const { data: inserted, error } = await supabase
        .from("submissions")
        .insert({
          ask_text: ask.askText,
          current_value: ask.currentValue,
          target_value: ask.targetValue,
          timeframe: ask.timeframe,
          target_body: ask.targetBody,
          mechanism: ask.mechanism ?? null,
          tags: ask.tags ?? [],
          verification_status: ask.verificationStatus,
          moderation_status: "approved",
          vote_count: 0,
        })
        .select("id")
        .single();

      if (error || !inserted) {
        console.error(`FAILED to insert: ${ask.askText}`, error);
        continue;
      }
      submissionId = inserted.id;
      console.log(`inserted: ${ask.askText} -> ${submissionId}`);
    }

    if (!submissionId) continue;

    for (const pr of ask.partyResponses) {
      const { error } = await supabase.from("party_responses").insert({
        submission_id: submissionId,
        party_name: pr.party,
        status: pr.status,
        source_url: pr.sourceUrl ?? null,
      });
      if (error) console.error(`  party_response failed:`, error.message);
    }

    for (const person of ask.responsiblePeople ?? []) {
      const { error } = await supabase.from("responsible_people").insert({
        submission_id: submissionId,
        name: person.name,
        designation: person.designation,
      });
      if (error) console.error(`  responsible_person failed:`, error.message);
    }
  }

  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
