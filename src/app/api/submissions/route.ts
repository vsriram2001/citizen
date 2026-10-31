import { after } from "next/server";
import { NextResponse } from "next/server";
import { ensureBrief, loadAsk } from "@/lib/brief";
import { findDuplicate } from "@/lib/semantic-match";
import { getSearchableAsks } from "@/lib/submissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTimeframe } from "@/lib/timeframe";
import { VOTE_BUDGET } from "@/lib/vote-session";
import { OUT_OF_VOTES, ensureVoterSession, getVoterId, votesUsed } from "@/lib/voter";

interface SubmitBody {
  askText: string;
  currentValue?: string | null;
  targetValue?: string | null;
  timeframe?: string | null;
  targetBody?: string | null;
  tags?: string[];
  responsiblePeople?:
    | {
        name: string;
        designation: string;
        organization?: string;
        twitterHandle?: string;
      }[]
    | null;
}

// The person must be signed in with Google (see lib/voter.ts): adding an ask
// carries their founding vote, and votes are one-per-person.
//
// No moderation queue yet either — new asks go live immediately
// (moderation_status: 'approved') rather than sitting 'pending' with no
// way to actually approve them. Revisit once a moderation UI exists;
// until then this is a deliberate loop we're skipping, not an oversight.
export async function POST(req: Request) {
  const body: SubmitBody = await req.json();

  const voterId = await getVoterId({ create: true });
  if (!voterId) {
    return NextResponse.json({ error: "Sign in with Google to add an ask" }, { status: 401 });
  }

  if (!body.askText || body.askText.trim().length < 5) {
    return NextResponse.json({ error: "askText required" }, { status: 400 });
  }

  // Server-side enforcement of the platform's guardrails — the review
  // screen already enforces these client-side, but a client check is only
  // a UX nicety, not a guarantee; every ask that reaches the database must
  // have a real deadline and at least one accountable person regardless of
  // what called this route.
  if (!body.timeframe || !isValidTimeframe(body.timeframe)) {
    return NextResponse.json(
      { error: "A valid Mon YYYY deadline is required" },
      { status: 400 },
    );
  }
  if (!body.responsiblePeople || body.responsiblePeople.length === 0) {
    return NextResponse.json(
      { error: "At least one responsible person is required" },
      { status: 400 },
    );
  }

  // One ask per goal: a repeat would split votes that belong together. The
  // add-ask panel already checks before the review screen; this is the
  // guarantee. The client shows the existing ask so the person can vote on
  // it instead.
  const { asks } = await getSearchableAsks();
  const duplicate = await findDuplicate(body.askText, asks);
  if (duplicate) {
    return NextResponse.json(
      {
        error: "This ask is already on the platform",
        duplicateOf: { id: duplicate.id, askText: duplicate.askText },
      },
      { status: 409 },
    );
  }

  const supabase = createAdminClient();

  await ensureVoterSession(supabase, voterId);

  // Checked before the ask is created so a person out of votes doesn't
  // leave behind an ask with no founding vote.
  if ((await votesUsed(supabase, voterId)) >= VOTE_BUDGET) {
    return NextResponse.json({ error: OUT_OF_VOTES }, { status: 403 });
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .insert({
      ask_text: body.askText.trim(),
      current_value: body.currentValue ?? null,
      target_value: body.targetValue ?? null,
      timeframe: body.timeframe ?? null,
      target_body: body.targetBody ?? null,
      tags: body.tags ?? [],
      moderation_status: "approved",
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    console.error("submission insert failed:", submissionError?.message);
    return NextResponse.json(
      { error: "Could not save submission" },
      { status: 500 },
    );
  }

  const { error: peopleError } = await supabase
    .from("responsible_people")
    .insert(
      body.responsiblePeople.map((p) => ({
        submission_id: submission.id,
        name: p.name,
        designation: p.designation,
        organization: p.organization ?? null,
        twitter_handle: p.twitterHandle ?? null,
      })),
    );
  if (peopleError) {
    console.error("responsible_people insert failed:", peopleError.message);
  }

  // Draft the Info brief now, once, so opening it later is a plain read. Runs
  // after the response so the person isn't kept waiting on the LLM; if it
  // fails, /api/brief drafts it on first open instead.
  const newId = submission.id as string;
  after(async () => {
    try {
      const ask = await loadAsk(newId);
      if (ask) await ensureBrief(ask);
    } catch (err) {
      console.error("post-create brief failed:", err);
    }
  });

  const { data: vote, error: voteError } = await supabase
    .from("votes")
    .insert({
      submission_id: submission.id,
      session_token: voterId,
      ip_hash: `session-${voterId}`,
    })
    .select("id")
    .single();

  if (voteError) {
    console.error("vote insert failed:", voteError.message);
  }

  return NextResponse.json({
    id: submission.id,
    voted: !voteError,
    voteId: vote?.id ?? null,
  });
}
