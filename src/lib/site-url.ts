/**
 * Absolute origin for building shareable links and OG metadata. Prefers an
 * explicit SITE_URL (set this in prod), falls back to Vercel's
 * auto-populated VERCEL_URL on preview/prod deploys, then localhost for dev.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
