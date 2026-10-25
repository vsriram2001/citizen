-- A vote is "submitted" once the person finishes their ballot ("Finish & share").
-- Until then they can swap it for another ask; after, it is locked for good.
-- Null = still changeable. api/votes refuses to retract a submitted vote.

alter table votes add column if not exists submitted_at timestamptz;
