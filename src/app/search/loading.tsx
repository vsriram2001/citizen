import { SiteHeader } from "@/components/nav/SiteHeader";

// Shown the instant someone navigates here, while the asks load from
// Supabase — otherwise the click looks like it did nothing for a beat.
export default function SearchLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader sticky />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3">
        <div className="h-7 w-28 animate-pulse rounded-sm bg-border/60" />
        <div className="h-12 w-full animate-pulse rounded-sm bg-border/40" />
        <div className="mt-3 flex flex-col gap-6 lg:max-w-[calc(100%-392px)]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-card border border-border bg-card" />
          ))}
        </div>
      </main>
    </div>
  );
}
