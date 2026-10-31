"use client";

import { useAuth } from "@/components/auth/useAuth";
import { GOOGLE_AUTH_ENABLED } from "@/lib/auth-flag";

/** Header control: only appears once signed in, since sign-in itself happens on the first vote. */
export function AccountButton() {
  const { userId, signOut } = useAuth();
  if (!GOOGLE_AUTH_ENABLED || !userId) return null;
  return (
    <button
      type="button"
      onClick={signOut}
      className="text-[13px] text-text-secondary hover:text-text transition-colors underline decoration-transparent hover:decoration-current underline-offset-4 cursor-pointer"
    >
      Sign out
    </button>
  );
}
