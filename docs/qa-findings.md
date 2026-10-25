# QA findings — pre-launch sweep (2026-10-25)

How it was found: `scripts/qa/run.ts` drives the app at phone (390×844) and desktop
(1440×900) sizes, signed out and signed in (throwaway `qa-test@citizenpoll.local` user),
screenshots every screen and vote state, and logs console errors, failed requests,
sideways scroll, small tap targets and axe (WCAG A/AA) violations. Screenshots were then
reviewed by eye. Re-run: `npx tsx scripts/qa/run.ts http://localhost:3000 qa-output`.

Verified after fixes (second sweep): 0 accessibility violations (was 60+), no console errors on any
page, `npm run build` passes.

What works end to end, both sizes: browse → vote → sign-in prompt / onboarding detour →
3 votes → replace card → review → submit → ballot animation → `/share/votes` → locked
search screen. No sideways scroll anywhere, no runtime errors on the happy path.

Status: ✅ fixed · 🟡 needs your decision · ⏳ open

## Blockers (fix before launch)

| # | Finding | Status |
|---|---|---|
| B1 | **Hero photo is a recognisable real actor** (`public/hero.jpg`, source `ryan.png`). Using a celebrity's likeness without a licence is a legal risk, and implies endorsement. Replace with licensed / commissioned / illustrated art. | 🟡 |
| B2 | **Home and `/share` show a fake "500 votes cast"** (`TOTAL_VOTES_CAST` mock constant) while `/search` shows the real total (~195). For an accountability platform a made-up number is the worst kind of bug. | ✅ real total everywhere |
| B3 | **`NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env.local`** — disables HTTPS certificate checks for every server request. Fine as a local workaround for the office proxy, must never be set on the host. | 🟡 don't copy to the host |
| B4 | **Placeholder party labels shown publicly** — the share page card shows "Party A: no response". Real visitors can't read that; it looks like broken data. Hide party responses until they carry real sourced data (product rule: no party positions without `source_url`). | ✅ hidden on share card |
| B5 | **Vote-cap trigger not applied** — verified: 4 direct inserts for one person all succeeded. The API still caps at 3, but two simultaneous taps can slip a 4th through. Run `supabase/migrations/202610241500_vote_cap_trigger.sql` in the SQL editor. (`ask_thoughts` and `votes.submitted_at` are applied.) | 🟡 run the SQL |
| B6 | **Officeholder names** in `lib/mock/asks.ts` must be re-verified before launch (CLAUDE.md rule). | 🟡 |

## Major (confusing or broken for real users)

| # | Finding | Status |
|---|---|---|
| M1 | **Shared ask page has no way to vote for that ask.** Someone opening a shared link sees the card, "Share" and "Back your own ask" — the obvious action is missing. | ✅ "Vote for this ask" opens search filtered to it |
| M2 | **404 page is Next's bare default** — no header, no way back. `/share/<bad id>` also logs a Postgres error on every hit. | ✅ branded 404, quiet bad-id lookups |
| M3 | **`/share/votes` signed out says "No votes yet"** — wrong for someone who voted but isn't signed in on this device. | ✅ says sign in to see them |
| M4 | **Search heading still reads "Popular" while showing results for a typed query.** | ✅ "Results" when a query is typed |
| M5 | **A refused or failed vote does nothing** — no message (seen live: account already at 3/3, button silently ignored). | ✅ short message above the tray; re-syncs votes when the server disagrees |
| M6 | **Low contrast on muted text** (`--color-text-muted` #8a8a82 on paper ≈ 3.3:1; WCAG AA needs 4.5:1). Hits labels, deadlines, "votes", placeholders on every page. | ✅ darkened to #6f6f68 (≈ 4.9:1) |
| M7 | **Buttons nested inside links** (home "Cast your vote", share pages). Invalid HTML: two tab stops for one action, odd screen-reader output. | ✅ links styled as buttons |
| M9 | **`/share/votes` showed this browser's cached votes to a signed-out visitor** — on a shared device, the previous person's ballot. | ✅ signed out sees "Sign in to see your votes" |
| M10 | **Radius rule broken** — votes share card 20px, its buttons pill-shaped, tags popover 8px (rule: 3px / 6px only). | ✅ |
| M8 | **"Official record"** on the votes share card — the asks are unverified and the card is self-generated; "official" overclaims. | 🟡 suggest "My ballot" |

## Minor (polish)

| # | Finding | Status |
|---|---|---|
| m1 | Responsible-people / info icons look 20×20 on phones. | ✅ false alarm — they already have an invisible ~34px tap area |
| m2 | Onboarding "Continue" is disabled with no hint of what's missing. | ⏳ |
| m3 | Signed-out visitors have no "Sign in" in the header — deliberate (sign-in happens on the first vote). | ✅ mitigated — "My votes" now offers sign-in |
| m4 | Desktop vote tray sits across both columns and covers the bottom of the filter panel. | ⏳ |
| m5 | Disabled grey VOTE buttons after all votes are submitted read as "broken"; consider hiding them or a quieter style. | ⏳ |
| m6 | `/design` (internal reference) is publicly reachable. | 🟡 hide in production? |
| m7 | Tap Vote → sent to onboarding → leave without finishing → come back to search later in the tab: a sign-in prompt pops up for the old tap. | ⏳ |

## Your real-phone checklist (things automation can't see)

1. Google sign-in on mobile Safari and Chrome — comes back to the tapped vote?
2. "Share" opens the native share sheet; "Copy card" copies the image (paste into WhatsApp).
3. Search box: keyboard doesn't cover results; iOS doesn't zoom in on focus.
4. Vote tray clears the iPhone home bar; bottom sheets can be swiped / closed.
5. Location button in onboarding asks for permission and fills the city.
6. Rotate to landscape on the search screen — nothing overlaps.
