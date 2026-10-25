import { SiteHeader } from "@/components/nav/SiteHeader";

// Instant feedback while a share page loads its asks from Supabase.
export default function ShareLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-lg px-6 py-14 flex flex-col items-center gap-4">
        <div className="h-8 w-3/4 animate-pulse rounded-sm bg-border/60" />
        <div className="h-4 w-1/2 animate-pulse rounded-sm bg-border/40" />
        <div className="mt-4 h-48 w-full animate-pulse rounded-card border border-border bg-card" />
      </main>
    </div>
  );
}
