# Filters and sort

## Goal
Let people narrow and order the Popular list on `/search`.

## Current state
`src/components/search/SearchFilters.tsx`: a "Filters" toggle that shows tag chips.
No sort. Active tags are passed to `filterAsks` in `src/lib/match.ts`.

## Ideas on the table (not decided — discuss with the user one by one)
- Filters: state / city (Bengaluru vs all-India), timeframe (deadline year), target body
  level (Union / State / City), tags.
- Sort: top (votes), new, closing soon (deadline), trending.
  - "New" needs a `createdAt` on `Ask` — add it as an **optional** field in `lib/types.ts`.
  - "Trending" needs vote timestamps — probably out of scope for now.

## Constraints
- If search-matching is in progress in another chat, don't rewrite `lib/match.ts`;
  add a separate `sortAsks()` and new optional filter fields.
- Ask the user before changing the visual style of the filter bar.

## Done when
Agreed filters and sorts work in demo mode on `/search`, and `npm run check` passes.
