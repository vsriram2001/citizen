import Link from "next/link";
import { AccountButton } from "@/components/auth/AccountButton";
import { MobileNav } from "@/components/nav/MobileNav";
import { cn } from "@/lib/cn";

/*
  One header for every page, so the screens read as a single product and each
  one links to the others: Browse asks, My votes, Share. Pages add their own
  right-hand extras (e.g. the search screen's vote total) as children.
*/

const LINK =
  "text-[13px] text-text-secondary hover:text-text transition-colors underline decoration-transparent hover:decoration-current underline-offset-4";

const NAV = [
  { href: "/search", label: "Browse asks" },
  { href: "/share/votes", label: "My votes" },
  { href: "/share", label: "Share" },
] as const;

export function SiteHeader({
  sticky = false,
  children,
}: {
  /** Pin to the top while the page scrolls (search screen). */
  sticky?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        // relative: the phone menu panel hangs from the header's bottom edge.
        "relative border-b border-border shrink-0 bg-paper",
        sticky && "sticky top-0 z-40 bg-paper",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="text-[15px] font-semibold tracking-[-0.02em] shrink-0">
          Citizen Poll
        </Link>
        <nav className="hidden sm:flex items-center gap-5">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={LINK}>
              {item.label}
            </Link>
          ))}
          <AccountButton />
          {children}
        </nav>
        {/* Phones: page extras stay in the bar (each page keeps them short
            there), the links fold into the menu. */}
        <div className="sm:hidden flex items-center gap-3 min-w-0">
          {children}
          <MobileNav items={NAV} />
        </div>
      </div>
    </header>
  );
}
