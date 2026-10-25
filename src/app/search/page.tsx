import { SiteHeader } from "@/components/nav/SiteHeader";
import { SearchClient } from "@/components/search/SearchClient";
import { getSearchableAsks } from "@/lib/submissions";

export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // ?q= prefills the search — e.g. "Vote for this ask" on a shared ask page.
  const { q } = await searchParams;
  // Nothing from Supabase (empty table or unreachable) → preview with the
  // seed asks. Demo votes stay in memory only; nothing is written anywhere.
  const { asks, demo } = await getSearchableAsks();
  // Real vote total from Postgres, not the mock/asks constant — sum of
  // vote_count across every approved submission.
  const totalVotesCast = asks.reduce((sum, ask) => sum + ask.voteCount, 0);

  return (
    <div className="min-h-screen flex flex-col lg:h-dvh lg:overflow-hidden">
      <SiteHeader sticky>
        {/* Desktop only: on a phone the bar is for the menu. */}
        <span className="hidden sm:inline text-sm text-text-secondary tabular-nums">
          {totalVotesCast.toLocaleString("en-IN")} votes cast
        </span>
      </SiteHeader>

      <main className="flex-1 lg:min-h-0 lg:overflow-hidden mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 sm:py-4">
        <SearchClient initialAsks={asks} demo={demo} initialQuery={q?.slice(0, 200)} />
      </main>
    </div>
  );
}
