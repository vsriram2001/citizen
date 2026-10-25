alter table responsible_people
  add column if not exists organization text,
  add column if not exists twitter_handle text;
