# Feature briefs

One file per feature, written so a fresh chat can start from it. Start a chat with:

> Read docs/features/<file>.md and start.

Each chat should run in its own worktree (see "Working in parallel" in /CLAUDE.md).

| Brief | Status | Main files |
|---|---|---|
| [search-matching.md](search-matching.md) | ready to build | `src/lib/match.ts` |
| [filters-and-sort.md](filters-and-sort.md) | needs discussion first | `src/components/search/SearchFilters.tsx` |
| [state-map.md](state-map.md) | needs discussion first | `src/components/map/StateBreakdown.tsx` |
| [vote-budget.md](vote-budget.md) | needs a redesign | `src/components/vote/*` |
| [ask-info.md](ask-info.md) | MVP built; nightly digest deferred | `src/components/ask/AskInfoButton.tsx`, `src/lib/brief.ts` |
| [accountability.md](accountability.md) | open questions | `src/lib/mock/asks.ts`, `src/components/ask/InfoPopover.tsx` |
| [mobile.md](mobile.md) | built; real-device polish next | `src/components/ui/Sheet.tsx`, `src/components/mobile/*` |

These three are safe to run at the same time: search-matching, state-map and
vote-budget. filters-and-sort also touches `lib/match.ts`, so start it after
search-matching is merged or keep its changes to a new option.
