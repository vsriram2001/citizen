# State map (where votes come from)

## Goal
The side panel on `/search` should show real votes by state, per the spec's
"India map (state breakdown of votes)".

## Current state
`src/components/map/StateBreakdown.tsx` renders bars from mock data in
`src/lib/mock/states.ts` (labelled "Illustrative"). Voters' state is collected in
onboarding and stored on `sessions` (see `supabase/migrations/0002_session_location_age.sql`);
votes are in `votes` (`session_token` → sessions).

## To discuss with the user first
- Bars vs an actual India map.
- Whole platform vs per ask (click an ask → its state split).
- Minimum count before showing a state, so tiny numbers can't identify people.

## Constraints
- Shared Supabase DB: read-only queries are fine; no migrations or seeding without asking.
  If an aggregate view / RPC is needed, write a timestamped, idempotent migration and
  ask before applying it.
- Keep demo mode working: fall back to mock states when Supabase returns nothing.

## Done when
The panel shows real counts when data exists, mock data in demo mode, `npm run check` passes.
