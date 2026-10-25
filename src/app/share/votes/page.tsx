import { SiteHeader } from "@/components/nav/SiteHeader";
import { VotesShareClient } from "@/components/share/VotesShareClient";
import { getApprovedSubmissions } from "@/lib/submissions";

/**
 * "My votes" share surface. The vote record itself is tracked client-side
 * (see lib/vote-session.ts — no session/auth cookies exist yet to back a
 * real query), so this page fetches every approved ask server-side and the
 * client half filters down to whichever ids localStorage says this browser
 * voted on.
 */
export default async function ShareVotes() {
  const asks = await getApprovedSubmissions();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-lg px-4 sm:px-6 py-6 sm:py-14 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <VotesShareClient asks={asks} />
      </main>
    </div>
  );
}
