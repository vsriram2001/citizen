# Accountability (responsible people)

## Goal
Every ask names the 1–3 people who actually hold the lever, and the names are correct
and checkable — never decoration.

## Current state
- Selection rules for new asks: `RESPONSIBLE_PEOPLE_RULES` and `identifyJurisdiction` in
  `src/lib/resolve-ask.ts` (local first; PM only on Union-level asks; max 3).
- The 19 seed asks in `src/lib/mock/asks.ts` have hand-picked people, re-checked on
  2026-10-24 from news sources (not official notices). The file header lists the
  least-certain names.
- Shown in `src/components/ask/InfoPopover.tsx` (person icon on each card).

## Open questions for the user
1. Teacher-vacancy ask: states hire teachers, so naming only the Union Education Minister
   is weak. Reframe it as a Karnataka ask (like the fee-cap ask)?
2. Show a "verified on <date>" and a source link per person on the card? The DB already
   has `responsible_people.source_url` and `verified_at`.
3. Bengaluru-heavy seed set: keep, or rebalance towards all-India / other states?

## Constraints
- Never add a name from memory — verify with a current source and record where it came from.
- No real party names without a source.

## Done when
User's answers applied, every person has a source (if they want it shown),
`npm run check` passes.
