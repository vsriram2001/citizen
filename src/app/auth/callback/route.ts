import { NextResponse } from "next/server";
import { GOOGLE_AUTH_ENABLED } from "@/lib/auth-flag";
import { createClient } from "@/lib/supabase/server";

// Where Google sends the person back (via Supabase). Swaps the one-time code
// for a session cookie, then returns them to the page they started from.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  if (!GOOGLE_AUTH_ENABLED) return NextResponse.redirect(`${origin}/search`);

  const code = searchParams.get("code");
  // Only same-site paths — never bounce a signed-in person to an arbitrary URL.
  const rawNext = searchParams.get("next") ?? "/search";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/search";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("auth code exchange failed:", error.message);
  }

  return NextResponse.redirect(`${origin}/search?auth=failed`);
}
