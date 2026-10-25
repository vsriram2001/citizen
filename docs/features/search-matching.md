# Search matching

**Status: built (2026-10-24).** Keyword layer in `lib/match.ts`, meaning layer in
`lib/semantic-match.ts` (+ `/api/match`), duplicate checks in `/api/suggest`, the add-ask
panel and `/api/submissions`. Meaning layer untested against the real LLM — the gateway
key was returning 401 at build time.

## Goal
Typing in the search box on `/search` should find related asks, not just exact
substrings. Today "air pollution" won't find an ask worded "clean air".

## Current state
`src/lib/match.ts` → `filterAsks(asks, { query, tags })`: lowercase substring match
on `askText` and `targetBody`, AND-ed with active tags. Pure functions, no React.

## Decided
- **Smarter keyword search, not semantic (pgvector) yet.** No new infrastructure.
- Split the query into words, drop stopwords ("the", "of", "for"), match any word.
- Match more fields: `askText`, `targetBody`, `tags`, `responsiblePeople[].name`.
- Rank by relevance: hit in `askText` > `tags` > `targetBody`; full-phrase hit beats
  scattered words; `voteCount` breaks ties.
- Light stemming ("pollution" ~ "polluted").
- Highlight matched words in the card.
- The add-an-ask panel (`components/submit/AddAskPanel.tsx`) currently shows only when
  nothing matches. It should also show when the best match is weak, so a poor hit
  doesn't hide "add your own".

## Answered
1. Synonym list: yes — plus an LLM meaning layer on top, so paraphrases are covered too.
2. Live re-ranking as you type.
3. No duplicates is the top priority: every new ask (AI draft or typed) is checked by
   wording and by meaning before review, and again on the server before it's written.

## Constraints
- Keep `filterAsks` / `collectTags` signatures working (SearchClient calls them); add a
  scored variant if you need one.
- Highlighting touches `components/ask/AskCard.tsx` (shared): add an optional prop only.

## Done when
- "pollution", "bus", "water", "school fees", "metro" each surface the right seed asks.
- `npm run check` passes; you've tried it on `/search` (demo mode works without Supabase).
