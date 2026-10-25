"use client";

import { useAuth } from "@/components/auth/useAuth";

/** Header control: only appears once signed in, since sign-in itself happens on the first vote. */
export function AccountButton() {
  const { userId, signOut } = useAuth();
  if (!userId) return null;
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
