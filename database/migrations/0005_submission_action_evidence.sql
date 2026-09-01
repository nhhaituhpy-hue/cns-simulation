alter table public.vor_submissions
  add column if not exists action_history jsonb not null default '[]'::jsonb,
  add column if not exists resolution jsonb;

alter table public.dme_submissions
  add column if not exists action_history jsonb not null default '[]'::jsonb,
  add column if not exists resolution jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vor_submissions_action_history_array'
      and conrelid = 'public.vor_submissions'::regclass
  ) then
    alter table public.vor_submissions
      add constraint vor_submissions_action_history_array
      check (jsonb_typeof(action_history) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'vor_submissions_resolution_object'
      and conrelid = 'public.vor_submissions'::regclass
  ) then
    alter table public.vor_submissions
      add constraint vor_submissions_resolution_object
      check (resolution is null or jsonb_typeof(resolution) = 'object');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'dme_submissions_action_history_array'
      and conrelid = 'public.dme_submissions'::regclass
  ) then
    alter table public.dme_submissions
      add constraint dme_submissions_action_history_array
      check (jsonb_typeof(action_history) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'dme_submissions_resolution_object'
      and conrelid = 'public.dme_submissions'::regclass
  ) then
    alter table public.dme_submissions
      add constraint dme_submissions_resolution_object
      check (resolution is null or jsonb_typeof(resolution) = 'object');
  end if;
end
$$;

comment on column public.vor_submissions.action_history is
  'Append-only technical PMDT actions recorded during the student session.';
comment on column public.vor_submissions.resolution is
  'Technical scenario resolution checks captured at submission time.';
comment on column public.dme_submissions.action_history is
  'Append-only technical PMDT actions recorded during the student session.';
comment on column public.dme_submissions.resolution is
  'Technical scenario resolution checks captured at submission time.';
