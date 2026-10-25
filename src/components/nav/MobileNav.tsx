"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/useAuth";
import { cn } from "@/lib/cn";

/**
 * Phone navigation (below sm). Three links and a sign-out don't fit beside
 * the wordmark at 375px — they wrapped to two lines each — so they fold
 * into one Menu button that opens a full-width panel under the header,
 * with rows tall enough for a thumb. Closes on navigation, outside tap and
 * Escape.
 */
export function MobileNav({ items }: { items: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { userId, signOut } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);

  // Close when the route changes (adjusting state during render rather than
  // in an effect, per React's guidance).
  const [shownFor, setShownFor] = useState(pathname);
  if (pathname !== shownFor) {
    setShownFor(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="-mr-2 flex h-10 items-center gap-2 px-2 text-[13px] text-text-secondary active:text-text cursor-pointer"
      >
        Menu
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          ) : (
            <path d="M3.5 7h13M3.5 13h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="menu-panel absolute inset-x-0 top-full z-50 border-b border-border bg-paper shadow-lg"
        >
          <ul className="flex flex-col px-4 py-2">
            {items.map((item) => {
              const current = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    // Same-page tap: the route doesn't change, so close here.
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center justify-between py-3.5 text-[16px] border-b border-border/70",
                      current ? "font-semibold text-text" : "text-text-secondary active:text-text",
                    )}
                  >
                    {item.label}
                    <span aria-hidden className="text-text-muted">›</span>
                  </Link>
                </li>
              );
            })}
            {userId && (
              <li>
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full py-3.5 text-left text-[16px] text-text-secondary active:text-text cursor-pointer"
                >
                  Sign out
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
}
