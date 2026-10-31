import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_AUTH_ENABLED } from "@/lib/auth-flag";

// Keeps the Supabase auth cookie fresh on every page/API request. Without
// this, access tokens expire quietly and server code (api/votes) would see a
// signed-out person who is actually signed in.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Signed-out visitors have no auth cookie, so there is nothing to refresh —
  // skip Supabase entirely rather than delay every page and prefetch.
  // Same with sign-in switched off: a leftover cookie has nothing to keep fresh.
  if (!GOOGLE_AUTH_ENABLED || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must be called — this is what triggers the token refresh. getClaims
  // verifies the token locally against the project's signing keys (only an
  // expired token costs a round trip), where getUser asked the Auth server
  // on every request — ~250ms added to each page load and API call.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?)$).*)"],
};
