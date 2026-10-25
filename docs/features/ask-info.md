# Ask info (the "i" section)

## Goal
One tap on an ask gives anyone the whole picture: overview, a plea written as a letter,
the reasoning, the **downsides**, and a way to add thoughts. Critical, not cheerleading.

## How it works
- `components/ask/AskInfoButton.tsx` — "i" icon next to the responsible-people icon; opens a dialog.
- Briefs are drafted **once**: when an ask is created (`api/submissions`, after the response via `after()`),
  or pre-generated for the 19 seed asks into `lib/mock/briefs.json` (`scripts/generate-briefs.ts`).
  They change only in the nightly digest — never per load or per restart.
- `GET /api/brief?id=` — a plain read of the stored brief; drafts one only as a fallback (3 Tavily searches — the case for, the case against, and what other
  countries did — plus one LLM call) and stores it. `lib/brief.ts`.
- `POST /api/thoughts` — queues a thought (20–1000 chars, 5/hour/IP). Nothing is published.
- `GET /api/cron/digest-thoughts` — nightly (03:00 IST, `vercel.json`), `Authorization: Bearer $CRON_SECRET`.
  The LLM judges each pending thought (incorporate / reject), rewrites the brief only if one
  adds something, and marks thoughts reviewed. Failures leave thoughts pending for the next run.
- Tables: `ask_briefs`, `ask_thoughts` (migration `202610241200_ask_briefs_and_thoughts.sql`).
  Thoughts have no public RLS policy — server routes only.
- Demo mode (seed asks): briefs come from `briefs.json`; thoughts accepted but not stored.
- `npx tsx --env-file=.env.local scripts/generate-briefs.ts --db` copies seed briefs into the shared DB
  for seeded rows (ask first).

## Decisions
- Briefs are labelled AI-drafted and unverified (product rule).
- Thoughts are untrusted input to the LLM (prompt-injection guard in the review prompt);
  unverifiable citizen claims are framed as perspectives, never facts.
- No party names in briefs.
- Downsides are capped at 3, ranked by harm × likelihood × specificity, and weighed against other
  countries' experience (a risk that played out abroad outranks a theoretical one).

## Open questions
1. Human approval before a brief changes (queue of proposed revisions) instead of fully automatic?
2. Wire Turnstile into the thought form (component exists, not yet used anywhere).
3. Brief goes stale as figures change — add a refresh cadence?
4. Hosting: `vercel.json` assumes Vercel Cron; swap if deploying elsewhere.

## Deferred to next iteration (not in MVP)
The nightly digest (cron route, `vercel.json` schedule, `CRON_SECRET`) — untested and not enabled.
For MVP, briefs are drafted once and stay fixed; thoughts just queue.

## Done when
Migration applied (ask first — shared DB), `CRON_SECRET` set, `npm run check` passes.
