-- Widen session demographics to match the onboarding screen: exact age and
-- city-level location, captured via geolocation, pincode, or city search.
--
-- age_bracket is kept, not dropped — but it's now a generated column
-- derived from age rather than a value the app sets directly. That gives
-- fast, indexable bracket-level aggregation (what every chart/breakdown
-- actually needs) while keeping the exact age for any analysis that needs
-- finer granularity later, without a second source of truth that could
-- drift out of sync — Postgres recomputes it automatically whenever age
-- changes, so the two can never disagree with each other.
--
-- Location stays precise (exact city name) even though the *display* layer
-- will only break out high-volume cities individually and roll everything
-- else up to state — that's a presentation decision made later against
-- real vote volume, not a reason to lose precision at capture time.
--
-- Written idempotently (if not exists / drop if exists) since an earlier
-- partial run of this migration already added the plain columns before
-- failing on the age_bracket rebuild — safe to re-run from a clean state.

alter table sessions
  add column if not exists age smallint
    check (age is null or (age >= 13 and age <= 120)),
  add column if not exists city text,
  add column if not exists pincode text,
  add column if not exists location_source text
    check (location_source is null or location_source in ('geolocation', 'pincode', 'search'));

alter table sessions drop column if exists age_bracket;

alter table sessions add column age_bracket text generated always as (
  case
    when age is null then null
    when age < 18 then 'under_18'
    when age between 18 and 24 then '18_24'
    when age between 25 and 34 then '25_34'
    when age between 35 and 49 then '35_49'
    when age between 50 and 64 then '50_64'
    else '65_plus'
  end
) stored;

create index if not exists sessions_age_bracket_idx on sessions (age_bracket);
