-- Adds tags and named accountable officeholders to submissions — both now
-- rendered on the search/vote screen (AskCard's tag pills and the person-
-- icon popover), neither of which existed in the original schema.
--
-- Written idempotently (if not exists throughout) since an earlier partial
-- run already created some of these objects before failing partway —
-- safe to re-run from whatever state the database is actually in.

alter table submissions
  add column if not exists tags text[] not null default '{}';

create index if not exists submissions_tags_idx
  on submissions using gin (tags);

-- Separate table, not a JSON blob on submissions, for the same reason
-- party_responses is separate: a submission can name zero, one, or several
-- accountable people (e.g. Union + State ministers on a concurrent-list
-- ask), and each needs to be independently attributable and sourced.
create table if not exists responsible_people (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  name text not null,
  designation text not null,
  -- Officeholders change with reshuffles/elections; this is a checkable
  -- fact, not an opinion, so it should carry a source and a "last verified"
  -- date rather than being trusted indefinitely once entered.
  source_url text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists responsible_people_submission_id_idx
  on responsible_people (submission_id);

alter table responsible_people enable row level security;

drop policy if exists "responsible people are publicly readable" on responsible_people;

create policy "responsible people are publicly readable"
  on responsible_people for select
  using (true);
