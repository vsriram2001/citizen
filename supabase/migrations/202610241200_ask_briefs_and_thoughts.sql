-- Ask info section: an AI-drafted brief per ask (overview, plea, reasoning,
-- downsides) plus citizens' "add your thoughts" submissions. Thoughts are
-- never shown directly — a nightly job (api/cron/digest-thoughts) reviews
-- the pending ones and folds in only what improves the brief.

create table if not exists ask_briefs (
  submission_id uuid primary key references submissions (id) on delete cascade,
  overview text not null,
  plea text not null,
  reasoning jsonb not null default '[]'::jsonb,
  downsides jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ask_thoughts (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  session_token uuid references sessions (id) on delete set null,
  body text not null check (char_length(body) between 20 and 1000),
  ip_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'incorporated', 'rejected')),
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists ask_thoughts_pending_idx
  on ask_thoughts (submission_id) where status = 'pending';
create index if not exists ask_thoughts_ip_created_idx
  on ask_thoughts (ip_hash, created_at);

alter table ask_briefs enable row level security;
alter table ask_thoughts enable row level security;

-- Briefs are public reads (only for approved asks). Thoughts have no public
-- policy at all: written and read only by server routes with the service role.
drop policy if exists "briefs of approved submissions are publicly readable" on ask_briefs;
create policy "briefs of approved submissions are publicly readable"
  on ask_briefs for select
  using (exists (
    select 1 from submissions s
    where s.id = ask_briefs.submission_id and s.moderation_status = 'approved'
  ));
