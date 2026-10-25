import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isPersistedId, loadAsk } from "@/lib/brief";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_LENGTH = 20;
const MAX_LENGTH = 1000;
/** Per IP, per rolling hour — a thoughtful citizen writes a few, a script
 *  writes hundreds. */
const HOURLY_LIMIT = 5;

// POST /api/thoughts — queues a citizen's thought on an ask. Nothing is
// published here: the nightly digest (api/cron/digest-thoughts) reviews
// pending thoughts and folds in only those that improve the brief.
export async function POST(req: Request) {
  const { submissionId, body, sessionId } = await req.json().catch(() => ({}));

  const text = typeof body === "string" ? body.trim() : "";
  if (typeof submissionId !== "string" || text.length < MIN_LENGTH || text.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `Thoughts must be ${MIN_LENGTH}–${MAX_LENGTH} characters` },
      { status: 400 },
    );
  }

  if (!(await loadAsk(submissionId))) {
    return NextResponse.json({ error: "Ask not found" }, { status: 404 });
  }

  // Demo-mode seed asks have no database row to attach a thought to. The
  // visitor gets the same thank-you; nothing is stored (demo mode is
  // in-memory by design — see CLAUDE.md).
  if (!isPersistedId(submissionId)) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = createHash("sha256")
    .update(forwarded || req.headers.get("user-agent") || "unknown")
    .digest("hex");

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("ask_thoughts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= HOURLY_LIMIT) {
    return NextResponse.json(
      { error: "You've shared a lot of thoughts — please try again later" },
      { status: 429 },
    );
  }

  const { error } = await supabase.from("ask_thoughts").insert({
    submission_id: submissionId,
    // The client-supplied session id may be stale or forged; only keep it
    // if it's a well-formed uuid, and let the FK reject unknown ones.
    session_token: isPersistedId(String(sessionId)) ? sessionId : null,
    body: text,
    ip_hash: ipHash,
  });
  if (error) {
    // An unknown session id trips the FK — retry without it.
    const retry = await supabase.from("ask_thoughts").insert({
      submission_id: submissionId,
      body: text,
      ip_hash: ipHash,
    });
    if (retry.error) {
      console.error("thought insert failed:", retry.error.message);
      return NextResponse.json({ error: "Could not save your thought" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, stored: true });
}
