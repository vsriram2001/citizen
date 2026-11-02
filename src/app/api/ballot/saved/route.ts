import { NextResponse } from "next/server";

// Exists only so Safari and Firefox see a login form submit and navigate, which
// is what makes them offer to save the Ballot ID (components/vote/SaveBallotId).
// Nothing from the form is read beyond where to go back to.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const path = form?.get("from") === "verify" ? "/verify" : "/share/votes";
  return NextResponse.redirect(new URL(path, req.url), 303);
}
