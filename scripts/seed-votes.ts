/*
  Mock voting activity for testing the Supabase pipeline end-to-end — not
  a fake vote_count. Every "vote" here is a real row in `votes`, cast by a
  real (fake) row in `sessions`, so it exercises the same trigger that
  updates submissions.vote_count that a real user's vote will. If this
  script works, the real vote-write path (once built) will too.

  ~100 fake sessions, each casting 1–3 votes across the 5 seeded
  submissions, weighted so asks end up with different, realistic-looking
  totals rather than uniform numbers — useful for testing the Popular
  ranking and the state breakdown, not just "does a number appear."

  Safe to re-run: sessions/votes are freshly generated each run, so
  re-running adds more mock activity rather than erroring on duplicates
  (unlike scripts/seed-submissions.ts, which upserts).

  Usage: npx tsx scripts/seed-votes.ts
*/
import { createAdminClient } from "../src/lib/supabase/admin";

// Paired state + a real city in it, so city and state stay consistent —
// matches the shape LocationField actually produces (city resolved
// together with its state, not picked independently).
const LOCATIONS = [
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "New Delhi", state: "Delhi" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Ahmedabad", state: "Gujarat" },
];

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

function randomAge() {
  return 18 + Math.floor(Math.random() * 50);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashLikeIp(seed: number) {
  // Stand-in for a hashed IP — this is mock data, not a real client IP.
  return `mock-ip-hash-${seed}`;
}

async function main() {
  const supabase = createAdminClient();

  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select("id")
    .eq("moderation_status", "approved");

  if (subError || !submissions || submissions.length === 0) {
    console.error("No approved submissions found — run seed-submissions.ts first.", subError);
    process.exit(1);
  }

  // Weight some asks more than others so counts vary, not uniform —
  // otherwise every ask ends up with nearly the same total and the
  // Popular ranking has nothing real to sort.
  const weights = submissions.map(() => 0.3 + Math.random() * 1.5);

  const SESSION_COUNT = 100;
  let totalVotes = 0;

  for (let i = 0; i < SESSION_COUNT; i++) {
    const location = pick(LOCATIONS);
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        state: location.state,
        city: location.city,
        age: randomAge(),
        gender: pick(GENDERS),
        location_source: "search",
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error(`session ${i} failed:`, sessionError?.message);
      continue;
    }

    // Each session votes on 1–3 distinct submissions, picked without
    // replacement, weighted so higher-weight asks get chosen more often.
    const voteCount = 1 + Math.floor(Math.random() * 3);
    type Weighted = { s: (typeof submissions)[number]; weight: number };
    const pool: Weighted[] = submissions.map((s, idx) => ({ s, weight: weights[idx] }));
    const chosen: Weighted[] = [];

    for (let n = 0; n < Math.min(voteCount, pool.length); n++) {
      const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
      let r = Math.random() * totalWeight;
      let pickedIndex = 0;
      for (let j = 0; j < pool.length; j++) {
        r -= pool[j].weight;
        if (r <= 0) {
          pickedIndex = j;
          break;
        }
      }
      chosen.push(pool[pickedIndex]);
      pool.splice(pickedIndex, 1);
    }

    for (const { s } of chosen) {
      const { error: voteError } = await supabase.from("votes").insert({
        submission_id: s.id,
        session_token: session.id,
        ip_hash: hashLikeIp(i),
      });
      if (voteError) {
        console.error(`  vote failed:`, voteError.message);
      } else {
        totalVotes++;
      }
    }
  }

  console.log(`done — ${SESSION_COUNT} mock sessions, ${totalVotes} mock votes cast`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
