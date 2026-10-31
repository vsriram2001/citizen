/*
  Google sign-in switch. Off unless NEXT_PUBLIC_GOOGLE_AUTH_ENABLED is exactly
  "true", so a missing env var can't bring the login prompt back by accident.
  NEXT_PUBLIC_ means it's baked in at build time: changing it needs a redeploy
  (or a dev server restart), not just a new env value.

  Off: nobody signs in; each browser is an anonymous voter, identified by a
  cookie (see lib/voter.ts). On: everything works as a Google-account vote again.
*/
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
