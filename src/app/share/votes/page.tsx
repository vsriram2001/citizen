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
    // Exactly one visible screen: card and buttons fit together, nothing below
    // the fold. dvh, not vh, so a phone's browser bars can't hide the buttons.
    <div className="h-dvh flex flex-col">
      <SiteHeader />

      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col mx-auto w-full max-w-lg px-4 sm:px-6 pt-4 sm:pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <VotesShareClient asks={asks} />
      </main>
    </div>
  );
}
