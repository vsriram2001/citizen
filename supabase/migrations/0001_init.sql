-- Civic accountability platform — initial schema
-- Matches civic-platform-spec-v2.md

create extension if not exists vector;
create extension if not exists pgcrypto;

create table sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  state text,
  age_bracket text,
  gender text,
  education text,
  occupation text
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  ask_text text not null,
  current_value text,
  target_value text,
  timeframe text,
  target_body text,
  mechanism text,
  embedding vector(1536),
  verification_status text not null default 'unverified',
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  vote_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index submissions_embedding_idx
  on submissions using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index submissions_vote_count_idx
  on submissions (vote_count desc);

create table votes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  session_token uuid not null references sessions (id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  unique (session_token, submission_id)
);

create index votes_session_token_idx on votes (session_token);
create index votes_ip_hash_created_at_idx on votes (ip_hash, created_at);

create table party_responses (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  party_name text not null,
  status text not null
    check (status in ('support', 'against', 'no_response', 'defected')),
  source_url text,
  captured_at timestamptz not null default now()
);

create index party_responses_submission_id_idx on party_responses (submission_id);

-- Keep submissions.vote_count in sync with the append-only votes log
create or replace function increment_submission_vote_count()
returns trigger as $$
begin
  update submissions
  set vote_count = vote_count + 1
  where id = new.submission_id;
  return new;
end;
$$ language plpgsql;

create trigger votes_after_insert
  after insert on votes
  for each row
  execute function increment_submission_vote_count();

alter table sessions enable row level security;
alter table submissions enable row level security;
alter table votes enable row level security;
alter table party_responses enable row level security;

-- Public can read approved submissions and party responses; writes go through
-- server-side routes using the service role key, which bypasses RLS.
create policy "approved submissions are publicly readable"
  on submissions for select
  using (moderation_status = 'approved');

create policy "party responses are publicly readable"
  on party_responses for select
  using (true);
