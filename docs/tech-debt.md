# Tech debt and known gaps

One place to list everything we have knowingly left for later. Add an item when you
defer something; tick it off (or delete it) when it ships. Keep entries short and say
what picking it up involves.

Feature-level open questions live in the briefs under [features/](features/README.md);
this file is the cross-cutting list.

## Before launch
- [ ] **Verify responsible people.** Officeholders in `lib/mock/asks.ts` come from news
      reports, not official notices (least certain are listed in the file header). Also build a
      way to update them without a code deploy.
- [ ] **Apply pending migrations** to the shared DB — ask first. Includes
      `202610241200_ask_briefs_and_thoughts.sql` and `202610241500_vote_cap_trigger.sql`
      (run in the Supabase SQL editor; there is no DB connection string in the project).
- [ ] **Google OAuth to production.** Publish the Google consent screen (Testing → Production),
      add the production origin to the Google client, and set the Supabase Site URL and
      Redirect URLs to the production domain.
- [ ] **Wire Turnstile** (`components/vote/Turnstile.tsx` exists) into voting and the
      add-your-thoughts form.

## Ask info (deferred from MVP)
- [ ] **Nightly thought digest** — `api/cron/digest-thoughts`, the `vercel.json` cron and
      `CRON_SECRET` exist but are untested and not enabled. Until then thoughts queue in
      `ask_thoughts` and briefs stay as first drafted. To pick up: apply the migration, set
      `CRON_SECRET`, test the digest end to end. `vercel.json` assumes Vercel; swap if hosting differs.
      The schedule was removed from `vercel.json` before the first deploy so it can't run untested;
      to enable: `{"crons": [{"path": "/api/cron/digest-thoughts", "schedule": "30 21 * * *"}]}`.
- [ ] **Copy seed briefs into the DB** — `npx tsx --env-file=.env.local scripts/generate-briefs.ts --db`
      (writes to the shared DB — ask first).
- [ ] **Human approval before a brief changes**, instead of the digest updating it automatically?
- [ ] **Brief refresh cadence** — briefs go stale as figures change.
- [ ] **Thoughts on demo-mode asks** are accepted but not stored (seed asks have no DB row).

## Search and data
- [ ] **Meaning-based matching** (`lib/semantic-match.ts`) is an LLM call per query (cached);
      move to pgvector embeddings once asks outgrow ~120 per prompt.
- [ ] **Filters are tags only** — no sort, no state or timeframe filters.
- [ ] **`StateBreakdown` shows mock data** (`lib/mock/states.ts`).

## Voting
- [x] ~~Vote budget bar / ballot trigger~~ — replaced by `VoteTray` + `ReviewVotesModal`
      (sticky tray after the first vote → review → ballot animation → `/share/votes`).
- [x] ~~One person, one set of votes~~ — Google sign-in; cap is per Google account, rolling
      365 days, in `api/votes` (+ DB trigger once the migration above is applied).
- [ ] **Votes keyed on `session_token`.** Each Google user gets a `sessions` row whose id is
      their auth user id (`lib/voter.ts`). Add a real `votes.user_id` (+ profile row for
      onboarding fields) and drop the shim when convenient.
- [ ] **Legacy session votes** are kept as dummy data, tied to no one and not retractable.
      Decide later whether to purge them.
- [ ] **Multiple Google accounts per person** still get multiple sets of votes. Backstop:
      Turnstile on the vote action and a per-IP daily limit (`ip_hash` is a placeholder today).
- [ ] **Voting without a Google account** — phone OTP or email magic link fit the same model.
- [ ] **Adding an ask while signed out** redirects to Google and restores the typed idea, but
      the person redoes the review step.
- [x] ~~Edit window after finishing~~ — submitted votes are locked (needs migration `202610251000_votes_submitted_at.sql` applied).
- [ ] **Onboarding answers aren't attached to the voter.** The first vote now detours through
      `/onboarding` once (flag in localStorage, `lib/onboarding.ts`), but age/state stay in the browser —
      persist them with the voter row.
- [ ] **`/share/votes` reads real votes only**, so demo-mode votes don't appear there.
- [x] ~~Ballot animation rebuild~~ — three aligned cut-out layers (`public/ballot-box.png`,
      `ballot-card.png`, `ballot-hand.png`; ChatGPT scans in `docs/assets/*-v2-source.png`): hand
      pinches a tilted card, pushes it halfway in, lets go, card slips in behind the slot line.
      Sized in `cqw`, one timing clock, Continue button. Not yet checked on a real phone.
- [ ] **Ballot hand's arm is short** — its two arm strokes end in open air, so the code fades the
      far end (`.ballot-hand-fade`). Cleaner: regenerate the hand with the forearm running to the
      canvas edge, re-run the cut-out, and drop the fade.

## Share
- [ ] **Share / Copy card on a real phone is untested.** `/share/votes` has "Copy card" (image + invite
      text + link on the clipboard) and a phone-only "Share" (native share sheet, image + text).
      Both need HTTPS, so they can't be tried over `http://<lan-ip>:3000`; use a tunnel
      (`cloudflared tunnel --url http://localhost:3000`, may need `allowedDevOrigins`) or a deploy.
      Check: does WhatsApp on iOS send the caption as a separate message? Is `pointer-coarse`
      right for hiding Share on desktop (touch laptops show it)? Waiting on the app being usable on mobile.
- [ ] **Desktop paste drops the text.** WhatsApp Web / Gmail take only the image from a clipboard that
      holds image + text, so on a MacBook the invite text and link can't arrive with the card.
      Option: add a "Cast your own votes at citizenpoll.in" line inside the card image (`share/votes/image/route.tsx`).
