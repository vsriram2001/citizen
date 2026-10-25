"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveResume, type Resume } from "@/lib/vote-session";

/**
 * Google sign-in state. Signing in exists only to make votes one-per-person,
 * so nothing here asks for more than "who is this" — browsing never prompts.
 *
 * `prompt(resume)` opens the sign-in modal and remembers what the person was
 * doing; `signInWithGoogle` hands off to Google and comes back to this page.
 */
export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [pending, setPending] = useState<Resume | null>(null);

  useEffect(() => {
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
