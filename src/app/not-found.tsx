import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { buttonClass } from "@/components/ui/Button";

// Any unknown URL, and share links to asks that don't exist (or were removed
// when their last vote was retracted). Keep the header so there's a way on.
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-md px-5 sm:px-6 py-16 sm:py-24 flex flex-col items-center text-center gap-4">
        <span className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
          Page not found
        </span>
        <h1 className="text-[32px] leading-[1.08]">Nothing here</h1>
        <p className="text-[15px] text-text-secondary leading-relaxed">
          The link may be mistyped, or the ask it pointed to has been removed.
        </p>
        <Link href="/search" className={buttonClass({ className: "mt-2" })}>
          Browse asks
        </Link>
      </main>
    </div>
  );
}
