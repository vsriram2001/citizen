# Citizen Poll

Civic accountability platform. Citizens submit **specific, measurable policy asks**
(current value → target value, deadline, accountable body), spend a **scarce budget of
3 votes a year**, and see **who is responsible** for each ask. Full product spec:
[docs/spec.md](docs/spec.md).

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase (Postgres)
· TrueFoundry LLM gateway · Tavily web search · Cloudflare Turnstile.

## Commands

```bash
npm run dev            # http://localhost:3000  (PORT=3001 npm run dev for a 2nd checkout)
npm run check          # lint + typecheck — must pass before you call a task done
npm run build          # production build
npx tsx scripts/seed-submissions.ts   # writes to the SHARED Supabase DB — ask first
```

`/search` falls back to **demo mode** (seed asks from `lib/mock/asks.ts`, votes in memory
only) whenever Supabase returns nothing, so the UI is usable without a database.

## Layout

```
src/
  app/                     routes only — pages are thin, logic lives below
    page.tsx               home
    onboarding/            age / state / optional fields (gates first vote)
    search/                search + vote screen (server half; client in components/search)
    share/                 share pages + OG images
    design/                living design-system page — add new components here
    api/                   suggest · resolve · feasibility · submissions · votes
  components/
    ui/                    generic primitives only: Button Card Input Badge Sheet ConfirmModal SearchableSelect
    ask/                   AskCard, AskList, InfoPopover (responsible people), TagsPopover
    search/                SearchClient (composition only), SearchFilters
    submit/                AddAskPanel (tiers 2–3), useSuggestions, ReviewSubmissionModal
    auth/                  useAuth, SignInModal, AccountButton (Google sign-in = one person, one set of votes)
    vote/                  useVotes, VoteTray, ReviewVotesModal, VoteMeter, BallotAnimation, Turnstile
    map/                   StateBreakdown (state-wise vote panel)
    share/                 ShareCard, ShareButton, VotesShareClient
    onboarding/            LocationField
    home/                  HeroImage
    mobile/                ViewportVars (keyboard / visible-viewport CSS vars), useIsTouch, revealOnFocus
  lib/
    types.ts               shared domain types (Ask, ResponsiblePerson, …) — import types from here
    match.ts               search matching (pure functions)
    resolve-ask.ts         who-is-responsible logic + shared LLM prompt rules
    llm.ts · web-search.ts server-only clients (never import into client components)
    submissions.ts         Supabase reads for asks
    vote-session.ts        local vote record (localStorage) + VOTE_BUDGET
    mock/asks.ts · mock/states.ts   seed / demo data
    supabase/              client · server · admin (service role, server-only)
supabase/migrations/       SQL migrations (see rules below)
scripts/                   seed scripts, new-worktree.sh
docs/                      spec, design palette, source assets (docs/archive is local-only)
```

## Feature areas — scope one chat to one row

Per-feature briefs (decisions so far, open questions, definition of done) are in
[docs/features/](docs/features/README.md). Start a feature chat with
"Read docs/features/<file>.md and start."

| Feature | Owns | Avoid touching |
|---|---|---|
| Search matching | `lib/match.ts` | the list/card UI |
| Filters & sort | `components/search/SearchFilters.tsx` (+ sort input to `lib/match.ts` via a new option) | matching internals |
| Ask card & list | `components/ask/*` | data in `lib/mock` |
| Voting / vote budget | `components/vote/*`, `lib/vote-session.ts`, `api/votes` | card layout |
| Suggest / add ask | `components/submit/*`, `api/suggest`, `api/resolve`, `api/feasibility`, `api/submissions`, `lib/resolve-ask.ts` | search list |
| State map | `components/map/*`, `lib/mock/states.ts` | search list |
| Onboarding | `app/onboarding`, `components/onboarding/*`, `lib/location.ts`, `lib/occupations.ts` | — |
| Share | `app/share`, `components/share/*` | — |
| Seed data / accuracy | `lib/mock/asks.ts` | UI |

**Shared files — change only additively, keep diffs small, mention it in your summary:**
`lib/types.ts`, `components/search/SearchClient.tsx` (wiring only), `components/ui/*`,
`app/globals.css` (design tokens), `app/design/page.tsx`, `package.json`.
If a feature needs a new field on `Ask`, add it as **optional** so other branches keep compiling.

## Working in parallel

- **One chat = one worktree = one branch.** Start a chat with `claude --worktree <feature>`
  (copies `.env.local` via `.worktreeinclude`; then run `npm ci` inside it), or run
  `scripts/new-worktree.sh <feature> <port>` which does all of it. Branch name: `feature/<name>`.
- **Give each worktree its own port**: main checkout 3000, then 3001, 3002, …
- **The Supabase database is shared by every worktree.** Don't run seed scripts, delete rows
  or apply migrations without asking. Prefer demo mode for UI work.
- **Migrations:** never edit an existing file in `supabase/migrations/`. New ones are named
  `YYYYMMDDHHMM_<what>.sql` (timestamp, not the next number) so two branches can't collide.
  Write them idempotently (`if not exists`).
- Keep `main` green: run `npm run check` before finishing; merge one feature at a time and
  rebase the others on top.

## Product rules that must not regress

- Every ask is `verificationStatus: "unverified"` until independently checked, and says so.
- **Party positions:** no real party names without a `source_url`. Seed data currently has none.
- **Responsible people** (`lib/resolve-ask.ts` → `RESPONSIBLE_PEOPLE_RULES`): max 3, most
  directly accountable first, local first (city/state officials for local matters, e.g.
  Bengaluru → GBA Chief Commissioner, BWSSB/BMTC/BMRCL heads, Karnataka ministers). The PM
  only on squarely Union-level asks. An all-India state subject names the Union minister;
  a single state's minister only when the ask names that state. Officeholders reshuffle —
  re-verify names in `lib/mock/asks.ts` (see its header) before launch, never from memory.
- Onboarding never collects religion.
- Design: radius 3px (sm) / 6px (card) only; colours only from tokens in `globals.css`;
  no party-coded bright blue / red / yellow.
- Mobile first-class ([docs/features/mobile.md](docs/features/mobile.md)): every overlay is a
  `components/ui/Sheet`; bottom-pinned bars get `hide-on-keyboard` + safe-area padding; hover
  UI needs a tap path; no sideways scroll at 320px.

## Conventions

- Imports via `@/…`; types from `@/lib/types`.
- Server-only modules (`llm.ts`, `web-search.ts`, `supabase/admin.ts`) never imported by
  `"use client"` files.
- Comments explain *why*, in the existing voice; keep them when moving code.
- New UI component → also show it on `/design`.

## Known gaps (good next tasks)

Full, maintained list: [docs/tech-debt.md](docs/tech-debt.md). Add new deferrals there.

- Meaning-based matching (`lib/semantic-match.ts`) is an LLM call per query (cached); move to
  pgvector embeddings once the ask count outgrows ~120 per prompt.
- Filters are tags only; no sort, no state/timeframe filters.
- `StateBreakdown` shows mock data (`lib/mock/states.ts`).
- Turnstile component exists (`components/vote/Turnstile.tsx`) but isn't wired into voting.
- Votes need a Google sign-in (`components/auth/*`, `lib/voter.ts`, `src/proxy.ts`); the voter's
  id is their Supabase auth user id, stored in `votes.session_token`. See tech-debt for the rest.
- `/share/votes` reads real votes only, so demo-mode votes don't appear there.
- Ask info nightly job deferred past MVP: `api/cron/digest-thoughts` + `vercel.json` cron + `CRON_SECRET`
  exist but are untested and not scheduled/enabled. Until then, thoughts queue in `ask_thoughts` and
  briefs stay as first drafted. To pick up: apply migration `202610241200_*`, set `CRON_SECRET`, run
  `scripts/generate-briefs.ts --db`, test the digest. See [docs/features/ask-info.md](docs/features/ask-info.md).
