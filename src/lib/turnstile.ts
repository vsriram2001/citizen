const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Confirms a Turnstile token with Cloudflare server-side. The widget token
// from the client is not trustworthy on its own — it must be checked here
// before the vote (or any gated action) is accepted.
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  if (!token) return false;

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return false;
  const data: { success: boolean } = await res.json();
  return data.success;
}
