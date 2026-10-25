-- Enforce the 3-votes-per-person-per-year cap inside the database.
--
-- api/votes already counts a person's votes before inserting, but a check
-- followed by an insert is not atomic: two taps in the same instant both
-- see "2 used" and both succeed. This trigger closes that gap. It takes a
-- per-person advisory lock so concurrent inserts for the same person queue
-- up, then counts the rolling 365 days and rejects the 4th vote.
--
-- Only applies to new inserts — existing votes (including the legacy
-- session-based ones kept as dummy data) are untouched. Note a bulk seed
-- script that puts more than 3 votes on one session will now fail.

create or replace function enforce_vote_cap()
returns trigger as $$
declare
  used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.session_token::text, 0));

  select count(*) into used
  from votes
  where session_token = new.session_token
    and created_at > now() - interval '365 days';

  if used >= 3 then
    raise exception 'vote_cap_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists votes_before_insert_cap on votes;

create trigger votes_before_insert_cap
  before insert on votes
  for each row
  execute function enforce_vote_cap();
