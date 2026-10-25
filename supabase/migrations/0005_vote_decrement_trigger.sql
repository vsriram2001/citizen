-- Symmetric counterpart to increment_submission_vote_count (0001_init.sql)
-- — un-voting needs vote_count to actually go back down, not just insert.
create or replace function decrement_submission_vote_count()
returns trigger as $$
begin
  update submissions
  set vote_count = greatest(vote_count - 1, 0)
  where id = old.submission_id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists votes_after_delete on votes;

create trigger votes_after_delete
  after delete on votes
  for each row
  execute function decrement_submission_vote_count();
