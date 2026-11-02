-- The public vote ledger behind Ballot IDs: an append-only hash chain of
-- finished ballots. Hash rules live in src/lib/ledger.ts.
--
-- A block holds no voter id and no ask id, only hashes that need the Ballot ID
-- to open. The link from a ballot to its votes is votes.block_height, which
-- stays private like the rest of the votes table.

create table if not exists vote_ledger (
  height bigint primary key check (height >= 1),
  prev_hash text not null,
  hash text not null unique,
  ballot_key text not null,
  leaves text[] not null,
  sealed_at timestamptz not null
);

create index if not exists vote_ledger_ballot_key_idx on vote_ledger (ballot_key);

-- RLS on with no policies: reads go through /api/ledger, writes through the
-- function below with the service role.
alter table vote_ledger enable row level security;

alter table votes
  add column if not exists block_height bigint references vote_ledger (height);

create index if not exists votes_block_height_idx on votes (block_height);

-- Append-only, enforced by the database rather than by politeness. This stops
-- mistakes and a compromised app key; someone with database owner rights could
-- still drop the trigger, which is what the chain's hashes are there to expose.
create or replace function reject_ledger_change()
returns trigger as $$
begin
  raise exception 'vote_ledger_is_append_only' using errcode = 'P0001';
end;
$$ language plpgsql;

drop trigger if exists vote_ledger_no_change on vote_ledger;
create trigger vote_ledger_no_change
  before update or delete on vote_ledger
  for each row
  execute function reject_ledger_change();

drop trigger if exists vote_ledger_no_truncate on vote_ledger;
create trigger vote_ledger_no_truncate
  before truncate on vote_ledger
  for each statement
  execute function reject_ledger_change();

-- Adds a block and marks its votes sealed in one transaction, so a crash can't
-- leave votes sealed twice. The primary key rejects a stale height (the caller
-- retries); votes_already_sealed means a second tab got there first, and rolls
-- the block back.
create or replace function append_ballot_block(
  p_height bigint,
  p_prev_hash text,
  p_hash text,
  p_ballot_key text,
  p_leaves text[],
  p_sealed_at timestamptz,
  p_vote_ids uuid[]
)
returns void as $$
declare
  sealed integer;
begin
  insert into vote_ledger (height, prev_hash, hash, ballot_key, leaves, sealed_at)
  values (p_height, p_prev_hash, p_hash, p_ballot_key, p_leaves, p_sealed_at);

  update votes
  set block_height = p_height
  where id = any (p_vote_ids)
    and block_height is null;

  get diagnostics sealed = row_count;
  if sealed <> coalesce(array_length(p_vote_ids, 1), 0) then
    raise exception 'votes_already_sealed' using errcode = 'P0001';
  end if;
end;
$$ language plpgsql;

-- Supabase exposes functions over its public API by default.
revoke all on function append_ballot_block(bigint, text, text, text, text[], timestamptz, uuid[])
  from public, anon, authenticated;
