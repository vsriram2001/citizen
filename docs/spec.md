# Civic accountability platform — build spec (v2, weekend build)

## One-liner
Citizens submit specific, quantifiable policy asks (not vague wishes), vote with a scarce yearly budget of 3 votes, and track whether named parties publicly support, oppose, ignore, or later reverse position on each one.

## Core mechanism
1. **Forced specificity** — every ask has a current value, target value, timeframe, target body, and mechanism.
2. **Scarce votes** — 3 votes per person per year. Forces prioritization over costless clicking.
3. **Party-response tracking** — support / against / no response / defected, each with a source link. "No response" is its own state, never silently defaulted.
4. **Verification honesty** — every submission is labeled `unverified` by default, visibly, until independently checked.

---

## Tech stack
- **Frontend/backend:** Next.js (App Router), TypeScript throughout
- **Database:** Supabase (Postgres) + `pgvector` extension for semantic search
- **Bot/abuse protection:** Cloudflare Turnstile on the vote action; domain proxied through Cloudflare (orange-cloud DNS) in front of Vercel for free edge-level rate limiting and DDoS protection — this doesn't replace Vercel hosting, it sits in front of it
- **Embeddings (semantic search):** OpenAI `text-embedding-3-small` (cheap, fast) — or your Azure OpenAI/TrueFoundry endpoint if you'd rather reuse what you already have set up at work
- **Deployment:** Vercel
- **Styling:** Tailwind CSS with the custom design tokens below (not default Tailwind theme)

---

## Screens

### 1. Onboarding
Collected once per session, stored against the anonymous session token — **not required to browse or search**, only gates before first vote:
- Age bracket (e.g. 18–24, 25–34...) 
- Location — state-level only, approximate
- Gender — optional, skippable
- Education — optional, skippable
- "More" expandable section: Occupation — optional, skippable
- **Religion: removed entirely.** Not collected under any field. (Rationale: cross-referencing political stance with religion creates a dataset with real communal-targeting risk if ever breached or subpoenaed — not worth it for what it buys the product.)

### 2. Home screen
- Headline prompt ("What do you want changed?" — placeholder copy, swap in your own line)
- Primary CTA: **Cast your vote** → into search/vote flow
- Total votes collected counter — simple social proof, cheap to build

### 3. Search screen
- Search bar + filters
- Popular items list (top existing asks) with a quick "add one" affordance
- **Three-tier match flow** on search:
  1. Semantic match — existing submissions whose embeddings are closest to the query (pgvector cosine similarity), shown first if above a similarity threshold
  2. AI-suggested phrasing — if no strong match, one quick LLM call proposes 1–2 structured rephrasings of what the user typed; these still go to the moderation queue like any submission, they don't skip review
  3. Add as typed — always available as a fallback, so the flow never dead-ends
- Vote progress bar showing 3 available votes, filling as used
- India map (state breakdown of votes) as a side panel — depends on the state field from onboarding

### 4. Final/summary screen
- Summary of the 3 votes cast
- Edit button (change votes before the year's cap locks, per whatever edit window you want)
- Share button for the person's 3 votes specifically
- Share button for the platform link generally — this is your strongest organic growth lever, worth polishing

---

## Backend schema

```
sessions
  id (session_token, pk)
  created_at
  state              -- approx location, used for map
  age_bracket         -- nullable
  gender              -- nullable
  education           -- nullable
  occupation          -- nullable

submissions
  id (pk)
  ask_text
  current_value
  target_value
  timeframe
  target_body
  mechanism
  embedding            -- vector, pgvector
  verification_status  -- default 'unverified'
  moderation_status     -- pending / approved / rejected
  vote_count            -- denormalized int, see counting logic below
  created_at

votes
  id (pk)
  submission_id (fk)
  session_token (fk)
  ip_hash              -- hashed, never store raw IP
  created_at
  UNIQUE (session_token, submission_id)   -- prevents double-voting the same ask

party_responses
  id (pk)
  submission_id (fk)
  party_name
  status               -- support / against / no_response / defected
  source_url
  captured_at
```

### Counting logic
`votes` is the source-of-truth append-only log. `submissions.vote_count` is a denormalized counter updated transactionally (Postgres trigger or RPC) on every insert into `votes` — so the Top-10 ranking query is a plain `ORDER BY vote_count DESC LIMIT 10`, not a live `COUNT()` over the whole table. Keeps ranking fast even as votes grow, while `votes` stays available for any later abuse audit.

### Vote cap enforcement
App-level check before insert: count rows in `votes` for this `session_token` within the last 365 days; reject if already at 3. Combine with the IP-hash rate limit (10–15/day) as a backstop against cookie-clearing.

### Anti-abuse stack (in order of what stops what)
- **Cloudflare proxy on the domain** — edge-level bot mitigation, free, catches the crudest traffic before it hits your app at all
- **Turnstile widget on the vote button specifically** — not on browsing/search, so it never adds friction to discovery
- **Session token cap** (3/year) — primary defense against a single person voting repeatedly
- **IP-hash rate limit** (10–15 votes/day per IP) — backstop against clearing cookies; generous enough for shared NAT/offices
- **Manual anomaly review** — no ML needed yet; a simple SQL query grouping votes by hour/IP is enough to eyeball if something spikes unnaturally

---

## Design system
- Typography: Source Serif 4 (headlines), Public Sans (body/UI)
- Corner radius: 2–6px everywhere — squared, not rounded
- Palette: ink/paper grayscale base + muted slate accent (avoiding pure blue/red/yellow — those read as BSP/Communist/TDP in Indian political context)
- Status badges: brick red / forest green / mustard amber / warm gray — functional status tones, not party-bright

---

## Weekend build plan

**Day 1**
- Supabase project + schema + pgvector enabled
- Cloudflare Turnstile keys + domain proxy setup
- Vercel project + env vars
- Onboarding flow (skippable fields, no religion)
- Home screen
- Submission form + moderation queue (basic admin view)
- Vote flow: cookie/session token + IP hash + Turnstile + 3/year cap
- Design system applied (fonts, palette, radius)

**Day 2**
- Search screen: plain text search first, then layer in semantic match (pgvector) + AI-suggested phrasing if time allows
- India map side panel
- Final/summary screen: edit + share-my-votes + share-platform-link
- Party-response manual tagging admin view
- QA pass + deploy

**Risk flag, said plainly:** semantic search is the single highest-risk item for hitting Sunday. If it's not stable by Saturday night, ship with plain text search for launch (the "add as typed" fallback means the product never breaks either way) and swap in the semantic layer early next week once you're not racing a deadline.

---

## Explicitly out of scope for this build
- Full account/login system
- Automated distribution to MPs/journalists
- ML-based fraud scoring
- Monetization

## Open decisions still yours to make
- Distribution/output plan — who this is actually meant to reach once ranked
- Whether you attach your name publicly to a platform tracking party positions during a live protest movement
- Launch seeding — 5–10 asks you write yourself so it's not empty on day one
