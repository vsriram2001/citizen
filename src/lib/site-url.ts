/**
 * Absolute origin for building shareable links and OG metadata. Prefers an
 * explicit SITE_URL (set this in prod), falls back to Vercel's
 * auto-populated VERCEL_URL on preview/prod deploys, then localhost for dev.
 * In the browser the page's own origin wins: VERCEL_URL isn't visible there
 * (so this would be localhost on a live phone), and fetching the share card
 * from anywhere else, even www vs bare domain, is blocked as cross-origin.
 */
export function getSiteUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
