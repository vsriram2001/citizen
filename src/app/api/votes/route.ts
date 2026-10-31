import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VOTE_BUDGET } from "@/lib/vote-session";
import { OUT_OF_VOTES, VOTE_LOCKED, ensureVoterSession, getVoterId, votesUsed } from "@/lib/voter";

const SIGN_IN_REQUIRED = { error: "Sign in with Google to vote" };

// The signed-in person's votes — lets any device rebuild "what have I
// voted for" instead of trusting one browser's localStorage.
export async function GET() {
  // create: the page calls this on load, so an anonymous voter has their cookie
  // before their first vote. Minted on the POST instead, two quick taps on
  // different asks each got a new id, and one vote was silently lost.
  const voterId = await getVoterId({ create: true });
  if (!voterId) return NextResponse.json({ votes: [] });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("votes")
    .select("id, submission_id, submitted_at")
    .eq("session_token", voterId);

  return NextResponse.json({
    votes: (data ?? []).map((v) => ({
      voteId: v.id,
      submissionId: v.submission_id,
      submitted: v.submitted_at != null,
    })),
  });
}

// Casts a vote for the signed-in person. Who they are comes from the auth
// cookie, never the request body, so a client can't vote as someone else or
// mint a fresh identity. The 3-vote budget (per person, rolling 365 days)
// is enforced here; the client check is only for instant feedback.
export async function POST(req: Request) {
  const { submissionId } = await req.json().catch(() => ({}));

  if (typeof submissionId !== "string") {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 });
  }

  const voterId = await getVoterId({ create: true });
  if (!voterId) return NextResponse.json(SIGN_IN_REQUIRED, { status: 401 });

  const supabase = createAdminClient();

  // Voting twice for the same ask is a no-op, not an error — the same vote
  // can legitimately be replayed (e.g. resuming a tap after the Google
  // redirect), and it must not cost a second vote.
  // These three don't depend on each other, so they run side by side
  // (each is a ~250ms round trip; in sequence they made the tap feel stuck).
  const [, { data: existing }, used] = await Promise.all([
    ensureVoterSession(supabase, voterId),
    supabase
      .from("votes")
      .select("id")
      .eq("session_token", voterId)
      .eq("submission_id", submissionId)
      .maybeSingle(),
    votesUsed(supabase, voterId),
  ]);
  if (existing) return NextResponse.json({ voteId: existing.id });

  if (used >= VOTE_BUDGET) {
    return NextResponse.json({ error: OUT_OF_VOTES }, { status: 403 });
  }

  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .insert({
      submission_id: submissionId,
      session_token: voterId,
      ip_hash: `session-${voterId}`,
    })
    .select("id")
    .single();

  if (voteError?.message?.includes("vote_cap_reached")) {
    // The database's own cap (migration 202610241500) caught a race the count above missed.
    return NextResponse.json({ error: OUT_OF_VOTES }, { status: 403 });
  }
  if (voteError || !vote) {
    console.error("vote insert failed:", voteError?.message);
    return NextResponse.json({ error: "Could not cast vote" }, { status: 500 });
  }

  return NextResponse.json({ voteId: vote.id });
}

// Retracts one of the signed-in person's own votes. If the submission's
// vote_count hits 0 as a result (checked via the decrement trigger having
// already run), the submission is deleted entirely — a 0-vote ask has no
// support and shouldn't linger.
export async function DELETE(req: Request) {
  const { voteId, submissionId } = await req.json().catch(() => ({}));

  if (typeof voteId !== "string" || typeof submissionId !== "string") {
    return NextResponse.json({ error: "voteId and submissionId required" }, { status: 400 });
  }

  const voterId = await getVoterId();
  if (!voterId) return NextResponse.json(SIGN_IN_REQUIRED, { status: 401 });

  const supabase = createAdminClient();

  // Scoped to the caller's own votes — knowing a vote id isn't enough to remove it.
  // A submitted vote is final — no retracting, no replacing — so the delete
  // only matches unsubmitted rows; that saves a separate lookup first.
  const { data: removed, error: deleteError } = await supabase
    .from("votes")
    .delete()
    .eq("id", voteId)
    .eq("session_token", voterId)
    .is("submitted_at", null)
    .select("id");
  if (deleteError) {
    console.error("vote delete failed:", deleteError.message);
    return NextResponse.json({ error: "Could not remove vote" }, { status: 500 });
  }
  if (!removed || removed.length === 0) {
    // Nothing deleted: either it's submitted (locked) or not theirs / gone.
    const { data: mine } = await supabase
      .from("votes")
      .select("submitted_at")
      .eq("id", voteId)
      .eq("session_token", voterId)
      .maybeSingle();
    if (mine?.submitted_at) {
      return NextResponse.json({ error: VOTE_LOCKED }, { status: 403 });
    }
    return NextResponse.json({ error: "Vote not found" }, { status: 404 });
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select("vote_count")
    .eq("id", submissionId)
    .maybeSingle();

  let deleted = false;
  if (submission && submission.vote_count <= 0) {
    const { error: deleteSubmissionError } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submissionId);
    if (deleteSubmissionError) {
      console.error("submission delete failed:", deleteSubmissionError.message);
    } else {
      deleted = true;
    }
  }

  return NextResponse.json({ deleted });
}

// "Finish & share": locks every vote the signed-in person has cast so far.
// Unused votes stay spendable later; only the ones already cast are final.
export async function PUT() {
  const voterId = await getVoterId();
  if (!voterId) return NextResponse.json(SIGN_IN_REQUIRED, { status: 401 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("votes")
    .update({ submitted_at: new Date().toISOString() })
    .eq("session_token", voterId)
    .is("submitted_at", null);
  if (error) {
    console.error("vote submit failed:", error.message);
    return NextResponse.json({ error: "Could not submit votes" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
