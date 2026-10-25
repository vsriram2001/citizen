# Vote budget (3 votes a year)

## Goal
One person gets 3 votes a year, sees how many they've used, and finishes with a ballot
moment that leads to sharing.

## Decisions
- **Identity = Google sign-in**, used only to dedupe. Browsing is open; the prompt appears
  on the first Vote (or Add ask) tap and the tap is finished after the redirect.
- **Votes count live.** Each tap is a real vote (trigger-maintained `vote_count`); there is
  no draft ballot.
- **Cap:** 3 per person, rolling 365 days — checked in `api/votes`, backed by the
  `202610241500_vote_cap_trigger.sql` trigger (race-proof once applied).
- **Journey:** vote → `VoteTray` (sticky, after the first vote) → `ReviewVotesModal`
  (numbered, each removable) → "Finish & share" → `BallotAnimation` → `/share/votes`.
  Finishing with fewer than 3 is allowed.
- Legacy session votes stay as dummy data.

## Open
- ~~Edit window~~ resolved: Finish & share submits and locks votes (`votes.submitted_at`, migration `202610251000_*`, needs applying). At 3/3 a Vote tap opens `ReplaceVoteModal`; locked votes cannot be replaced.
- Onboarding gate before the first vote; Turnstile; non-Google sign-in. See
  [tech-debt](../tech-debt.md).

## Constraints
- Don't change card layout (`components/ask/*`) beyond wiring.

## Done when
Tray and review are on `/search` and `/design`, the finish flow reaches `/share/votes`,
`npm run check` passes. (All shipped except the migration, which needs applying.)
