"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetActions } from "@/components/ui/Sheet";

/**
 * Shown when a signed-out person tries to vote or add an ask. Says why
 * (one vote per person) and what we do with it (nothing but dedupe), since
 * a political-preference action behind a Google login needs that stated.
 */
export function SignInModal({
  onSignIn,
  onClose,
  title = "Sign in to cast your vote",
  body = "Everyone gets 3 votes a year, and signing in with Google is how we keep it to one person, one set of votes. Your votes stay private — only the totals are public.",
  dismissLabel = "Not now",
}: {
  onSignIn: () => Promise<void>;
  onClose: () => void;
  title?: string;
  body?: string;
  dismissLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Back from Google via the back button: the browser may restore this page
  // exactly as it was left, still saying "Opening Google…". Make it tappable.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setBusy(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function go() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await onSignIn();
      // Success means the browser is on its way to Google, which can take a
      // couple of seconds on a phone. Stay in "Opening Google…" until the page
      // goes — resetting here made the first tap look like it did nothing.
    } catch {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <Sheet
      title={title}
      description={
        <>
          {body}
          {failed && (
            <p className="mt-2 text-xs text-against-fg">
              Couldn&rsquo;t reach Google just now. Check your connection and try again.
            </p>
          )}
        </>
      }
      onClose={onClose}
      footer={
        <SheetActions>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {dismissLabel}
          </Button>
          <Button variant="primary" size="sm" onClick={go} disabled={busy} aria-busy={busy}>
            {busy && <Spinner />}
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>
        </SheetActions>
      }
    />
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 animate-spin" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
