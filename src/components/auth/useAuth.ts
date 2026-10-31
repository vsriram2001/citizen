"use client";

import { useCallback, useEffect, useState } from "react";
import { GOOGLE_AUTH_ENABLED } from "@/lib/auth-flag";
import { createClient } from "@/lib/supabase/client";
import { saveResume, type Resume } from "@/lib/vote-session";

// Sign-in off: everyone counts as "known" from the first render, so every
// signed-out branch (prompts, "sign in to see your votes") simply never runs.
// A placeholder, not an id — the real voter is the cookie in lib/voter.ts.
const ANONYMOUS_USER = "anonymous";

/**
 * Google sign-in state. Signing in exists only to make votes one-per-person,
 * so nothing here asks for more than "who is this" — browsing never prompts.
 *
 * `prompt(resume)` opens the sign-in modal and remembers what the person was
 * doing; `signInWithGoogle` hands off to Google and comes back to this page.
 */
export function useAuth() {
  const [userId, setUserId] = useState<string | null>(GOOGLE_AUTH_ENABLED ? null : ANONYMOUS_USER);
  const [ready, setReady] = useState(!GOOGLE_AUTH_ENABLED);
  const [promptOpen, setPromptOpen] = useState(false);
  const [pending, setPending] = useState<Resume | null>(null);

  useEffect(() => {
    if (!GOOGLE_AUTH_ENABLED) return;
    const supabase = createClient();
    // getSession reads the cookie locally — enough to decide what the screen
    // shows. getUser asked the Auth server first (~250ms before the ballot
    // could load). Nothing trusts this id: api/votes verifies the cookie itself.
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const prompt = useCallback((resume: Resume) => {
    if (!GOOGLE_AUTH_ENABLED) return;
    setPending(resume);
    setPromptOpen(true);
  }, []);

  const closePrompt = useCallback(() => setPromptOpen(false), []);

  const signInWithGoogle = useCallback(async (returnTo?: string) => {
    if (pending) saveResume(pending);
    // Defaults to the current page; onboarding sends people on to search instead.
    const next = returnTo ?? window.location.pathname;
    // Resolves as soon as the browser *starts* leaving for Google, not when
    // Google's page appears. Throw on a failed hand-off so callers can tell
    // "still navigating" (keep showing progress) from "didn't work".
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) throw error;
  }, [pending]);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
    setUserId(null);
  }, []);

  return { userId, ready, promptOpen, prompt, closePrompt, signInWithGoogle, signOut };
}

export type Auth = ReturnType<typeof useAuth>;
